import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { checkAndAwardBadges } from '../utils/badgeChecker'
import type { BadgeStats } from '../constants/badges'
import { toast } from 'sonner'

export type SessionType = 'foco' | 'pausa curta' | 'pausa longa'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type SessionStatus = 'COMPLETED' | 'MANUAL_STOP'

// Constantes para tipos de sessão (compatibilidade com código existente)
export const SESSION_TYPES = {
  FOCUS: 'foco' as const,
  SHORT_BREAK: 'pausa curta' as const,
  LONG_BREAK: 'pausa longa' as const,
} as const

export interface FocusHistoryEntry {
  id: string
  date: string // ISO string
  durationInMinutes: number
}

const FOCUS_HISTORY_KEY = 'focus-history'

interface PomodoroState {
  sessionType: SessionType
  timeRemaining: number // em segundos
  status: TimerStatus
  completedCycles: number
  startTime?: number // timestamp quando o timer começou
  initialTimeRemaining?: number // tempo inicial quando o timer começou
  endTime?: number // timestamp de término do timer (para precisão ao restaurar)
  currentTask?: string // tarefa atual do Pomodoro
  totalElapsedTime?: number // tempo total acumulado desde o início da sessão (em segundos)
  lastPauseTime?: number // timestamp da última pausa (para calcular tempo acumulado)
  sessionStartedAt?: Date // data/hora quando a sessão foi iniciada (para histórico)
}

// Durações padrão (serão sobrescritas pelas configurações do usuário)
// Mantido para referência futura
const DEFAULT_SESSION_DURATIONS: Record<SessionType, number> = {
  'foco': 25 * 60, // 25 minutos em segundos
  'pausa curta': 5 * 60, // 5 minutos em segundos
  'pausa longa': 15 * 60, // 15 minutos em segundos
}
// Consome a variável para evitar erro de não uso
void DEFAULT_SESSION_DURATIONS

// Função para obter durações baseadas nas configurações
const getSessionDurations = (settings?: { focusMinutes?: number; shortBreakMinutes?: number; longBreakMinutes?: number }): Record<SessionType, number> => {
  return {
    'foco': (settings?.focusMinutes ?? 25) * 60,
    'pausa curta': (settings?.shortBreakMinutes ?? 5) * 60,
    'pausa longa': (settings?.longBreakMinutes ?? 15) * 60,
  }
}

const STORAGE_KEY = 'pomodoro-state'
const CYCLES_STORAGE_KEY = 'pomodoro-cycles'

export const usePomodoroHook = (settings?: { 
  focusMinutes?: number
  shortBreakMinutes?: number
  longBreakMinutes?: number
  autoStartBreaks?: boolean
  autoStartPomodoros?: boolean
}) => {
  // Calcula durações baseadas nas configurações
  const SESSION_DURATIONS = getSessionDurations(settings)
  
  // Extrai as configurações de auto-start diretamente das settings
  // Isso garante que sempre usa os valores mais recentes
  const autoStartBreaks = settings?.autoStartBreaks ?? false
  const autoStartPomodoros = settings?.autoStartPomodoros ?? false
  
  const [state, setState] = useState<PomodoroState>(() => {
    // Tenta restaurar do localStorage
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        let restoredState: PomodoroState = {
          sessionType: parsed.sessionType || 'foco',
          timeRemaining: parsed.timeRemaining || SESSION_DURATIONS.foco,
          status: parsed.status || 'idle',
          completedCycles: parsed.completedCycles || 0,
          startTime: parsed.startTime,
          initialTimeRemaining: parsed.initialTimeRemaining,
          endTime: parsed.endTime, // Restaura o endTime se existir
          currentTask: parsed.currentTask,
          totalElapsedTime: parsed.totalElapsedTime,
          lastPauseTime: parsed.lastPauseTime,
        }

        // Se estava rodando, restaura usando o endTime (mais preciso)
        if (restoredState.status === 'running') {
          if (restoredState.endTime) {
            // Usa o endTime salvo para calcular o tempo restante com precisão
            const now = Date.now()
            const newTimeRemaining = Math.max(0, Math.ceil((restoredState.endTime - now) / 1000))
            
            if (newTimeRemaining <= 0) {
              // Timer terminou enquanto estava fechado
              const newCompletedCycles = restoredState.sessionType === 'foco' 
                ? restoredState.completedCycles + 1 
                : restoredState.completedCycles

              let nextSessionType: SessionType = 'foco'
              if (restoredState.sessionType === 'foco') {
                nextSessionType = newCompletedCycles % 4 === 0 ? 'pausa longa' : 'pausa curta'
              }

              restoredState = {
                sessionType: nextSessionType,
                timeRemaining: SESSION_DURATIONS[nextSessionType],
                status: 'idle',
                completedCycles: newCompletedCycles,
                startTime: undefined,
                initialTimeRemaining: undefined,
                endTime: undefined,
              }
            } else {
              // Restaura o timer com o endTime original
              restoredState.timeRemaining = newTimeRemaining
              // Mantém o endTime original para continuar contando corretamente
            }
          } else if (restoredState.startTime && restoredState.initialTimeRemaining !== undefined) {
            // Fallback: calcula baseado no startTime (para compatibilidade com estados antigos)
            const elapsed = Math.floor((Date.now() - restoredState.startTime) / 1000)
            const newTimeRemaining = Math.max(0, restoredState.initialTimeRemaining - elapsed)
            
            if (newTimeRemaining <= 0) {
              // Timer terminou enquanto estava fechado
              const newCompletedCycles = restoredState.sessionType === 'foco' 
                ? restoredState.completedCycles + 1 
                : restoredState.completedCycles

              let nextSessionType: SessionType = 'foco'
              if (restoredState.sessionType === 'foco') {
                nextSessionType = newCompletedCycles % 4 === 0 ? 'pausa longa' : 'pausa curta'
              }

              restoredState = {
                sessionType: nextSessionType,
                timeRemaining: SESSION_DURATIONS[nextSessionType],
                status: 'idle',
                completedCycles: newCompletedCycles,
                startTime: undefined,
                initialTimeRemaining: undefined,
                endTime: undefined,
              }
            } else {
              // Calcula novo endTime baseado no tempo restante
              restoredState.timeRemaining = newTimeRemaining
              restoredState.endTime = Date.now() + newTimeRemaining * 1000
            }
          }
        }

        return restoredState
      } catch {
        // Se houver erro ao parsear, usa valores padrão
      }
    }
    return {
      sessionType: 'foco',
      timeRemaining: SESSION_DURATIONS.foco,
      status: 'idle',
      completedCycles: 0,
      currentTask: undefined,
    }
  })

  const intervalRef = useRef<number | null>(null)
  const isFinishingRef = useRef<boolean>(false)
  const hasCompletedRef = useRef<boolean>(false)
  const isProcessingCompletion = useRef<boolean>(false) // Trava para prevenir múltiplas execuções de completion
  const isSavingRef = useRef<boolean>(false) // Trava para prevenir múltiplas gravações no banco de dados
  const endTimeRef = useRef<number | null>(null) // Timestamp de término do timer (para precisão)

  // Salva no localStorage sempre que o estado mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    localStorage.setItem(CYCLES_STORAGE_KEY, state.completedCycles.toString())
  }, [state])

  // Atualiza as durações quando as configurações mudam (apenas se o timer estiver idle)
  useEffect(() => {
    if (state.status === 'idle') {
      const newDurations = getSessionDurations(settings)
      setState((prev) => ({
        ...prev,
        timeRemaining: newDurations[prev.sessionType],
      }))
    }
  }, [settings?.focusMinutes, settings?.shortBreakMinutes, settings?.longBreakMinutes, settings?.autoStartBreaks, settings?.autoStartPomodoros])

  // Gerencia o countdown
  useEffect(() => {
    // Limpa intervalo anterior se existir
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Função de sincronização quando a aba volta ao foco (corrige drift)
    // Definida fora do bloco condicional para estar disponível no cleanup
    const syncOnVisibilityChange = () => {
      if (document.visibilityState === 'visible' && endTimeRef.current !== null) {
        // Recalcula o tempo restante imediatamente quando a aba volta ao foco
        // Usa Delta Time: calcula baseado no targetTime (endTime) vs Date.now() atual
        // Se a aba hibernar por 10 minutos, ao voltar, Date.now() será real e o timer
        // pulará para o tempo correto instantaneamente
        const now = Date.now()
        const newTimeRemaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000))
        
        setState((prev) => {
          if (prev.status !== 'running') return prev
          return {
            ...prev,
            timeRemaining: newTimeRemaining,
            endTime: endTimeRef.current!,
          }
        })
      }
    }

    if (state.status === 'running') {
      // Garante que temos startTime e initialTimeRemaining antes de iniciar o intervalo
      if (!state.startTime || state.initialTimeRemaining === undefined) {
        // Se não tem startTime ou initialTimeRemaining, define agora
        const now = Date.now()
        setState((prev) => ({
          ...prev,
          startTime: prev.startTime || now,
          initialTimeRemaining: prev.initialTimeRemaining ?? prev.timeRemaining,
        }))
        // Define endTime baseado no tempo restante (Delta Time: targetTime = now + seconds)
        if (state.timeRemaining !== undefined) {
          endTimeRef.current = now + state.timeRemaining * 1000
        }
        return
      }

      // Inicia o intervalo apenas quando temos todas as informações necessárias
      // Restaura o endTime do estado se existir (ao recarregar a página)
      if (endTimeRef.current === null) {
        if (state.endTime) {
          // Usa o endTime restaurado do localStorage
          endTimeRef.current = state.endTime
        } else if (state.initialTimeRemaining !== undefined) {
          // Fallback: calcula novo endTime baseado no tempo restante (Delta Time)
          endTimeRef.current = Date.now() + state.initialTimeRemaining * 1000
        }
      }

      // Adiciona listeners de visibility para corrigir drift ao voltar à aba
      document.addEventListener('visibilitychange', syncOnVisibilityChange)
      window.addEventListener('focus', syncOnVisibilityChange)

      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.status !== 'running' || endTimeRef.current === null) {
            return prev
          }

          // Delta Time: Calcula tempo restante baseado no targetTime (endTime)
          // Isso garante precisão mesmo com tab throttling - se a aba hibernar por 10 minutos,
          // ao voltar, Date.now() será real e o timer pulará para o tempo correto instantaneamente
          const now = Date.now()
          const newTimeRemaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000))

          // Atualiza o endTime no estado para persistir no localStorage
          if (prev.endTime !== endTimeRef.current) {
            return { ...prev, timeRemaining: newTimeRemaining, endTime: endTimeRef.current }
          }

          if (newTimeRemaining <= 0) {
            // Previne múltiplas execuções quando o timer completa
            if (hasCompletedRef.current || isProcessingCompletion.current) {
              return prev
            }
            
            // Verifica se o timer está realmente rodando antes de processar
            if (prev.status !== 'running') {
              return prev
            }
            
            // Marca como processando para prevenir múltiplas execuções
            isProcessingCompletion.current = true
            hasCompletedRef.current = true
            
            const newCompletedCycles = prev.sessionType === 'foco' 
              ? prev.completedCycles + 1 
              : prev.completedCycles

            // Salva a sessão na tabela sessions (histórico completo)
            const modeMap: Record<SessionType, 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'> = {
              'foco': 'FOCUS',
              'pausa curta': 'SHORT_BREAK',
              'pausa longa': 'LONG_BREAK',
            }
            const mode = modeMap[prev.sessionType]
            const durationInSeconds = prev.initialTimeRemaining ?? prev.timeRemaining
            
            // Salva automaticamente na tabela sessions (histórico completo)
            saveSessionToHistory(mode, durationInSeconds, 'COMPLETED').catch(() => {
              // Erro silencioso - não quebra o fluxo
            })

            if (prev.sessionType === 'foco' && prev.initialTimeRemaining !== undefined) {
              const durationInMinutes = Math.floor(durationInSeconds / 60)
              
              if (durationInSeconds < 60) {
                toast.dismiss('session-completed')
                toast.dismiss('session-saved-manual')
                toast.dismiss('session-too-short')
                setTimeout(() => {
                  toast.warning('Sessão não registrada no ranking', {
                    description: `A sessão durou menos de 1 minuto. O mínimo é 1 minuto para contar no ranking.`,
                    duration: 5000,
                    id: 'session-too-short',
                  })
                }, 50)
              } else {
                const historyEntry: FocusHistoryEntry = {
                  id: uuidv4(),
                  date: new Date().toISOString(),
                  durationInMinutes,
                }
                
                // Lê histórico existente
                const existingHistory = localStorage.getItem(FOCUS_HISTORY_KEY)
                const history: FocusHistoryEntry[] = existingHistory 
                  ? JSON.parse(existingHistory) 
                  : []
                
                // Adiciona nova entrada
                history.push(historyEntry)
                
                // Salva no localStorage
                localStorage.setItem(FOCUS_HISTORY_KEY, JSON.stringify(history))
                
                // Remove notificações anteriores e mostra nova
                toast.dismiss('session-completed')
                toast.dismiss('session-saved-manual')
                toast.dismiss('session-too-short')
                setTimeout(() => {
                  toast.success('Foco concluído!', {
                    description: `${durationInMinutes} minutos registrados no ranking global.`,
                    duration: 4000,
                    id: 'session-completed',
                  })
                }, 50)

                // Salva no Supabase se o usuário estiver logado (ranking) - apenas se >= 1 minuto
                saveSessionToSupabase(durationInMinutes).then(async () => {
                  // Após salvar a sessão, verifica badges
                  if (!isSupabaseConfigured() || !supabase) return
                  
                  try {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                      // Busca estatísticas do usuário para verificar badges
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('total_minutes')
                        .eq('id', user.id)
                        .single()

                      const { data: sessions } = await supabase
                        .from('focus_sessions')
                        .select('completed_at')
                        .eq('user_id', user.id)
                        .order('completed_at', { ascending: false })

                      const totalSessions = sessions?.length || 0
                      const totalMinutes = profile?.total_minutes || 0
                      const currentHour = new Date().getHours()

                      // Calcula dias consecutivos com sessões
                      let consecutiveDays = 0
                      if (sessions && sessions.length > 0) {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        let checkDate = new Date(today)
                        const uniqueDates = new Set<string>()
                        
                        // Coleta todas as datas únicas das sessões
                        for (const session of sessions) {
                          const sessionDate = new Date(session.completed_at)
                          sessionDate.setHours(0, 0, 0, 0)
                          uniqueDates.add(sessionDate.toISOString().split('T')[0])
                        }
                        
                        // Conta dias consecutivos começando de hoje
                        let count = 0
                        while (true) {
                          const dateStr = checkDate.toISOString().split('T')[0]
                          if (uniqueDates.has(dateStr)) {
                            count++
                            checkDate.setDate(checkDate.getDate() - 1)
                          } else {
                            break
                          }
                        }
                        consecutiveDays = count
                      }

                      const stats: BadgeStats = {
                        totalSessions,
                        currentHour,
                        consecutiveDays,
                        totalMinutes,
                      }


                      // Verifica e concede badges (não bloqueia se houver erro)
                      try {
                        await checkAndAwardBadges(user.id, stats)
                      } catch (badgeError) {
                      }
                    }
                  } catch (error) {
                  }
                }).catch(() => {
                })
              }
            }

            // Determina próxima sessão usando nextMode
            const nextSessionType = prev.sessionType === 'foco' 
              ? getNextMode(newCompletedCycles)
              : 'foco'

            // Limpa o endTime quando completa
            endTimeRef.current = null
            
            // Reseta o flag de processamento após um pequeno delay
            setTimeout(() => {
              isProcessingCompletion.current = false
            }, 200)
            
            // AUTO-START: Usa função auxiliar para determinar próximo estado
            return getNextState(nextSessionType, newCompletedCycles, prev.sessionType)
          }

          return {
            ...prev,
            timeRemaining: newTimeRemaining,
            endTime: endTimeRef.current, // Mantém endTime sincronizado no estado
          }
        })
      }, 100) // Atualiza a cada 100ms para ser mais preciso
    }

    // Reseta o flag quando o status muda para idle (timer parado/resetado)
    if (state.status === 'idle') {
      hasCompletedRef.current = false
      isProcessingCompletion.current = false
      isSavingRef.current = false // Libera a trava de salvamento quando timer fica idle
      endTimeRef.current = null
    }

    // Cleanup geral: remove listeners e intervalo
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      // Remove listeners de visibility para evitar memory leaks
      document.removeEventListener('visibilitychange', syncOnVisibilityChange)
      window.removeEventListener('focus', syncOnVisibilityChange)
    }
  }, [state.status, state.startTime, state.initialTimeRemaining])

  const start = useCallback(() => {
    // Reseta os flags de completado e processamento quando inicia uma nova sessão
    hasCompletedRef.current = false
    isProcessingCompletion.current = false
    
    setState((prev) => {
      const now = Date.now()
      // Se estava pausado, acumula o tempo decorrido antes da pausa
      const previousElapsed = prev.totalElapsedTime || 0
      const elapsedBeforePause = prev.lastPauseTime && prev.startTime
        ? Math.floor((prev.lastPauseTime - prev.startTime) / 1000)
        : 0
      
      // Se não tinha sessionStartedAt, significa que é uma nova sessão (não retomada)
      const sessionStartedAt = prev.sessionStartedAt || new Date()
      
      // Calcula o endTime baseado no tempo restante atual
      // Isso garante precisão mesmo se o timer foi pausado e retomado
      const newEndTime = now + prev.timeRemaining * 1000
      endTimeRef.current = newEndTime
      
      return {
        ...prev,
        status: 'running',
        startTime: now,
        initialTimeRemaining: prev.timeRemaining,
        endTime: newEndTime, // Salva o endTime no estado para persistir
        totalElapsedTime: previousElapsed + elapsedBeforePause,
        lastPauseTime: undefined,
        sessionStartedAt: sessionStartedAt,
      }
    })
  }, [])

  const pause = useCallback(() => {
    setState((prev) => {
      // Calcula o tempo restante baseado no endTime (mais preciso)
      if (prev.status === 'running' && endTimeRef.current !== null) {
        const now = Date.now()
        const newTimeRemaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000))
        
        // Limpa o endTime ao pausar
        endTimeRef.current = null
        
        // Salva o tempo de pausa para calcular tempo acumulado
        const lastPauseTime = now
        
        return {
          ...prev,
          status: 'paused',
          timeRemaining: newTimeRemaining,
          startTime: undefined,
          initialTimeRemaining: undefined,
          endTime: undefined, // Remove endTime ao pausar
          lastPauseTime: lastPauseTime,
        }
      }
      
      // Se não tinha endTime, calcula baseado no startTime (fallback)
      if (prev.startTime && prev.status === 'running' && prev.initialTimeRemaining !== undefined) {
        const elapsed = Math.floor((Date.now() - prev.startTime) / 1000)
        const newTimeRemaining = Math.max(0, prev.initialTimeRemaining - elapsed)
        endTimeRef.current = null
        return {
          ...prev,
          status: 'paused',
          timeRemaining: newTimeRemaining,
          startTime: undefined,
          initialTimeRemaining: undefined,
          endTime: undefined, // Remove endTime ao pausar
          lastPauseTime: Date.now(),
        }
      }
      
      endTimeRef.current = null
      return {
        ...prev,
        status: 'paused',
        startTime: undefined,
        initialTimeRemaining: undefined,
        endTime: undefined, // Remove endTime ao pausar
      }
    })
  }, [])

  const reset = useCallback(() => {
    // Reseta os flags de completado e processamento quando reseta o timer
    hasCompletedRef.current = false
    isProcessingCompletion.current = false
    isSavingRef.current = false // Libera a trava de salvamento ao resetar
    endTimeRef.current = null
    setState((prev) => ({
      ...prev,
      timeRemaining: SESSION_DURATIONS[prev.sessionType],
      status: 'idle',
      startTime: undefined,
      initialTimeRemaining: undefined,
      endTime: undefined,
      totalElapsedTime: undefined,
      lastPauseTime: undefined,
      sessionStartedAt: undefined,
    }))
  }, [])

  const setSessionType = useCallback((type: SessionType) => {
    setState((prev) => ({
      ...prev,
      sessionType: type,
      timeRemaining: SESSION_DURATIONS[type],
      status: 'idle',
      startTime: undefined,
      initialTimeRemaining: undefined,
      endTime: undefined,
    }))
  }, [])

  const setCurrentTask = useCallback((task: string | undefined) => {
    setState((prev) => ({
      ...prev,
      currentTask: task,
    }))
  }, [])

  // Função para calcular o próximo modo baseado em ciclos inteligentes
  const getNextMode = useCallback((cycles: number): SessionType => {
    // A cada 4 sessões de FOCUS completas, sugere LONG_BREAK
    // Caso contrário, sugere SHORT_BREAK
    return cycles % 4 === 0 ? SESSION_TYPES.LONG_BREAK : SESSION_TYPES.SHORT_BREAK
  }, [])

  // Função auxiliar para criar o próximo estado com auto-start se configurado
  const getNextState = useCallback((
    nextSessionType: SessionType,
    completedCycles: number,
    previousSessionType: SessionType
  ): PomodoroState => {
    // Determina se deve iniciar automaticamente
    const shouldAutoStart = 
      (previousSessionType === 'foco' && autoStartBreaks) ||
      ((previousSessionType === 'pausa curta' || previousSessionType === 'pausa longa') && autoStartPomodoros)
    
    if (shouldAutoStart) {
      // Inicia automaticamente
      const now = Date.now()
      const nextDuration = SESSION_DURATIONS[nextSessionType]
      endTimeRef.current = now + nextDuration * 1000
      
      return {
        sessionType: nextSessionType,
        timeRemaining: nextDuration,
        status: 'running', // Inicia automaticamente
        completedCycles,
        startTime: now,
        initialTimeRemaining: nextDuration,
        endTime: endTimeRef.current,
        sessionStartedAt: new Date(),
        totalElapsedTime: undefined,
        lastPauseTime: undefined,
      }
    }
    
    // Caso contrário, mantém idle (comportamento padrão)
    return {
      sessionType: nextSessionType,
      timeRemaining: SESSION_DURATIONS[nextSessionType],
      status: 'idle',
      completedCycles,
      startTime: undefined,
      initialTimeRemaining: undefined,
      endTime: undefined,
      sessionStartedAt: undefined,
      totalElapsedTime: undefined,
      lastPauseTime: undefined,
    }
  }, [autoStartBreaks, autoStartPomodoros, SESSION_DURATIONS, settings?.autoStartBreaks, settings?.autoStartPomodoros])

  // Função para salvar sessão completa na tabela sessions (nova tabela de histórico)
  // Definida antes de ser usada para evitar problemas de hoisting
  // PROTEÇÃO: Usa isSavingRef para prevenir múltiplas gravações simultâneas
  const saveSessionToHistory = useCallback(async (
    mode: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK',
    durationInSeconds: number,
    status: 'COMPLETED' | 'ABANDONED'
  ) => {
    // 1. Se já estiver salvando, PARE IMEDIATAMENTE
    // Esta é a trava principal que previne gravações duplicadas
    if (isSavingRef.current) {
      return
    }

    if (!isSupabaseConfigured() || !supabase) {
      return
    }
    
    // 2. Marca que começou a salvar IMEDIATAMENTE (antes de qualquer async)
    // Isso garante que mesmo se a função for chamada duas vezes em milissegundos,
    // apenas a primeira execução prosseguirá
    isSavingRef.current = true
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        // Se não tem usuário, libera a trava imediatamente
        isSavingRef.current = false
        return
      }

      // Arredonda completed_at para o segundo mais próximo para evitar duplicatas por milissegundos
      const now = new Date()
      now.setMilliseconds(0) // Remove milissegundos para agrupar melhor
      const completedAt = now.toISOString()

      const { error: insertError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          mode,
          duration: durationInSeconds,
          completed_at: completedAt,
          status,
        })

      if (insertError) {
        // Se a tabela não existir, apenas loga o erro silenciosamente
        // O usuário pode executar a migração depois
        console.warn('Erro ao salvar sessão no histórico:', insertError.message)
      }
    } catch (error) {
      // Erro silencioso - não quebra o fluxo do timer
      console.warn('Erro ao salvar sessão no histórico:', error)
    } finally {
      // 3. Só libera para salvar de novo depois de um tempo
      // Trava por 1 segundo para prevenir gravações duplicadas
      // Isso garante que mesmo com React Strict Mode ou múltiplas chamadas,
      // apenas uma gravação será feita
      setTimeout(() => {
        isSavingRef.current = false
      }, 1000)
    }
  }, [])

  // Função para salvar sessão no Supabase (mantida para compatibilidade com focus_sessions)
  const saveSessionToSupabase = useCallback(async (durationInMinutes: number) => {
    if (!isSupabaseConfigured() || !supabase) {
      return
    }
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        // Se não tem usuário, libera a trava imediatamente
        isSavingRef.current = false
        return
      }

      const { error: insertError } = await supabase
        .from('focus_sessions')
        .insert({
          user_id: user.id,
          duration: durationInMinutes,
          completed_at: new Date().toISOString(),
        })

      if (insertError) {
        throw insertError
      }
    } catch (error) {
    }
  }, [])

  // Formata o tempo em MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  const setSessionTypeAndTask = useCallback((type: SessionType, task?: string) => {
    setState((prev) => ({
      ...prev,
      sessionType: type,
      timeRemaining: SESSION_DURATIONS[type],
      status: 'idle',
      startTime: undefined,
      initialTimeRemaining: undefined,
      currentTask: task !== undefined ? task : prev.currentTask,
      sessionStartedAt: undefined,
    }))
  }, [])


  // Função para finalizar sessão com status específico
  const finishSession = useCallback(async (_status: SessionStatus = 'MANUAL_STOP') => {
    if (isFinishingRef.current) {
      return
    }
    
    isFinishingRef.current = true
    
    setState((prev) => {
      if (prev.status !== 'running' || !prev.startTime || prev.initialTimeRemaining === undefined) {
        // Se não está rodando, mas tem tempo total acumulado (estava pausado), usa esse
        if (prev.status === 'paused' && prev.totalElapsedTime !== undefined && prev.totalElapsedTime > 0) {
          const timeSpent = prev.totalElapsedTime
          
          // Se for pausa curta, apenas finaliza sem salvar
          if (prev.sessionType === 'pausa curta') {
            toast.dismiss('pause-finished')
            toast.success('Pausa finalizada!', {
              description: autoStartPomodoros 
                ? 'Iniciando próxima sessão de foco automaticamente...'
                : 'Avançando para a próxima sessão de foco.',
              duration: 2000,
              id: 'pause-finished',
            })
            // AUTO-START: Usa função auxiliar para determinar próximo estado
            return getNextState('foco', prev.completedCycles, prev.sessionType)
          }
          
          if (prev.sessionType === 'foco') {
            // Salva a sessão na tabela sessions com status ABANDONED (parou manualmente)
            const modeMap: Record<SessionType, 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'> = {
              'foco': 'FOCUS',
              'pausa curta': 'SHORT_BREAK',
              'pausa longa': 'LONG_BREAK',
            }
            const mode = modeMap[prev.sessionType]
            const durationInSeconds = prev.initialTimeRemaining ?? SESSION_DURATIONS[prev.sessionType]
            
            // Salva automaticamente na tabela sessions (histórico completo) com status ABANDONED
            saveSessionToHistory(mode, durationInSeconds, 'ABANDONED').catch(() => {
              // Erro silencioso - não quebra o fluxo
            })
            
            // Verifica duração e mostra notificação apropriada
            const durationInMinutes = Math.floor(timeSpent / 60)
            
            if (timeSpent < 60) {
              toast.dismiss('session-saved-manual')
              toast.dismiss('session-too-short')
              setTimeout(() => {
                toast.warning('Sessão não registrada no ranking', {
                  description: `A sessão durou menos de 1 minuto. O mínimo é 1 minuto para contar no ranking.`,
                  duration: 5000,
                  id: 'session-too-short',
                })
              }, 50)
            } else {
              const historyEntry: FocusHistoryEntry = {
                id: uuidv4(),
                date: new Date().toISOString(),
                durationInMinutes,
              }
              const existingHistory = localStorage.getItem(FOCUS_HISTORY_KEY)
              const history: FocusHistoryEntry[] = existingHistory 
                ? JSON.parse(existingHistory) 
                : []
              history.push(historyEntry)
              localStorage.setItem(FOCUS_HISTORY_KEY, JSON.stringify(history))
              toast.dismiss('session-saved-manual')
              toast.dismiss('session-too-short')
              setTimeout(() => {
                toast.success('Foco finalizado!', {
                  description: `${durationInMinutes} minutos registrados no ranking global.`,
                  duration: 4000,
                  id: 'session-saved-manual',
                })
              }, 50)
              saveSessionToSupabase(durationInMinutes).catch(() => {
              })
            }
            
            // Reseta para próxima sessão (apenas para foco)
            const newCompletedCycles = prev.completedCycles + 1
            const nextSessionType = getNextMode(newCompletedCycles)
            // AUTO-START: Usa função auxiliar para determinar próximo estado
            return getNextState(nextSessionType, newCompletedCycles, prev.sessionType)
          }
          
          // Se for pausa longa (única opção restante após tratar pausa curta e foco)
          // Prepara dados para salvar no histórico
          // Variáveis preparadas para uso futuro no histórico
          void (prev.initialTimeRemaining || SESSION_DURATIONS[prev.sessionType])
          void (prev.sessionStartedAt || new Date(Date.now() - timeSpent * 1000))
          
          // AUTO-START: Usa função auxiliar para determinar próximo estado
          return getNextState('foco', prev.completedCycles, prev.sessionType)
        }
        return prev
      }

      // Calcula tempo decorrido desde o último startTime
      const elapsedSinceLastStart = Math.floor((Date.now() - prev.startTime) / 1000)
      // Soma com o tempo total já acumulado (de pausas anteriores)
      const totalElapsed = (prev.totalElapsedTime ?? 0) + elapsedSinceLastStart
      // O tempo gasto é o total decorrido (não limita pelo initialTimeRemaining para permitir finalizar antes)
      const timeSpent = totalElapsed
      
      // Salva a sessão na tabela sessions com status ABANDONED (parou manualmente)
      const modeMap: Record<SessionType, 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'> = {
        'foco': 'FOCUS',
        'pausa curta': 'SHORT_BREAK',
        'pausa longa': 'LONG_BREAK',
      }
      const mode = modeMap[prev.sessionType]
      const durationInSeconds = prev.initialTimeRemaining ?? prev.timeRemaining
      
      // Salva automaticamente na tabela sessions (histórico completo) com status ABANDONED
      saveSessionToHistory(mode, durationInSeconds, 'ABANDONED').catch(() => {
        // Erro silencioso - não quebra o fluxo
      })
      
      // Se for sessão de foco, verifica duração e mostra notificação apropriada
      if (prev.sessionType === 'foco') {
        const durationInMinutes = Math.floor(timeSpent / 60)
        
        if (timeSpent < 60) {
          toast.dismiss('session-completed')
          toast.dismiss('session-saved-manual')
          toast.dismiss('session-too-short')
          // Pequeno delay para garantir que o dismiss foi processado
          setTimeout(() => {
            toast.warning('Sessão não registrada no ranking', {
              description: `A sessão durou menos de 1 minuto. O mínimo é 1 minuto para contar no ranking.`,
              duration: 5000,
              id: 'session-too-short',
            })
          }, 50)
        } else {
          
          const historyEntry: FocusHistoryEntry = {
            id: uuidv4(),
            date: new Date().toISOString(),
            durationInMinutes,
          }
          
          // Lê histórico existente
          const existingHistory = localStorage.getItem(FOCUS_HISTORY_KEY)
          const history: FocusHistoryEntry[] = existingHistory 
            ? JSON.parse(existingHistory) 
            : []
          
          // Adiciona nova entrada
          history.push(historyEntry)
          
          // Salva no localStorage
          localStorage.setItem(FOCUS_HISTORY_KEY, JSON.stringify(history))
          // Remove notificações anteriores e mostra nova
          toast.dismiss('session-completed')
          toast.dismiss('session-saved-manual')
          toast.dismiss('session-too-short')
          // Pequeno delay para garantir que o dismiss foi processado
          setTimeout(() => {
            toast.success('Foco finalizado!', {
              description: `${durationInMinutes} minutos registrados no ranking global.`,
              duration: 4000,
              id: 'session-saved-manual',
            })
          }, 50)

          // Salva no Supabase se o usuário estiver logado (ranking) - apenas se >= 1 minuto
          saveSessionToSupabase(durationInMinutes).then(async () => {
            // Verifica badges após salvar
            if (!isSupabaseConfigured() || !supabase) return
            
            try {
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('total_minutes')
                  .eq('id', user.id)
                  .single()

                const { data: sessions } = await supabase
                  .from('focus_sessions')
                  .select('completed_at')
                  .eq('user_id', user.id)
                  .order('completed_at', { ascending: false })

                const totalSessions = sessions?.length || 0
                const totalMinutes = profile?.total_minutes || 0
                const currentHour = new Date().getHours()

                // Calcula dias consecutivos com sessões
                let consecutiveDays = 0
                if (sessions && sessions.length > 0) {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  let checkDate = new Date(today)
                  const uniqueDates = new Set<string>()
                  
                  // Coleta todas as datas únicas das sessões
                  for (const session of sessions) {
                    const sessionDate = new Date(session.completed_at)
                    sessionDate.setHours(0, 0, 0, 0)
                    uniqueDates.add(sessionDate.toISOString().split('T')[0])
                  }
                  
                  // Conta dias consecutivos começando de hoje
                  let count = 0
                  while (true) {
                    const dateStr = checkDate.toISOString().split('T')[0]
                    if (uniqueDates.has(dateStr)) {
                      count++
                      checkDate.setDate(checkDate.getDate() - 1)
                    } else {
                      break
                    }
                  }
                  consecutiveDays = count
                }

                const stats: BadgeStats = {
                  totalSessions,
                  currentHour,
                  consecutiveDays,
                  totalMinutes,
                }


                try {
                  await checkAndAwardBadges(user.id, stats)
                } catch (badgeError) {
                }
              }
            } catch (error) {
            }
          }).catch(() => {
          })

          // Reseta o timer após salvar
          const newCompletedCycles = prev.completedCycles + 1
          const nextSessionType = getNextMode(newCompletedCycles)
          // AUTO-START: Usa função auxiliar para determinar próximo estado
          return getNextState(nextSessionType, newCompletedCycles, prev.sessionType)
        }
        
        // Se for foco mas menos de 1 minuto, reseta sem salvar
        return {
          ...prev,
          timeRemaining: SESSION_DURATIONS[prev.sessionType],
          status: 'idle',
          startTime: undefined,
          initialTimeRemaining: undefined,
          totalElapsedTime: undefined,
          sessionStartedAt: undefined,
        }
      }

      // Se for pausa curta, apenas finaliza sem salvar (pausas não contam para estatísticas)
      if (prev.sessionType === 'pausa curta') {
        
        // Prepara dados para salvar no histórico
        // Variáveis preparadas para uso futuro no histórico
        void (prev.initialTimeRemaining || SESSION_DURATIONS[prev.sessionType])
        void (prev.sessionStartedAt || new Date(Date.now() - timeSpent * 1000))
        
        
        toast.dismiss('pause-finished')
        toast.success('Pausa finalizada!', {
          description: autoStartPomodoros 
            ? 'Iniciando próxima sessão de foco automaticamente...'
            : 'Avançando para a próxima sessão de foco.',
          duration: 2000,
          id: 'pause-finished',
        })
        
        // AUTO-START: Usa função auxiliar para determinar próximo estado
        return getNextState('foco', prev.completedCycles, prev.sessionType)
      }

      // Se for pausa longa, apenas finaliza sem salvar
      if (prev.sessionType === 'pausa longa') {
        
        // Prepara dados para salvar no histórico
        // Variáveis preparadas para uso futuro no histórico
        void (prev.initialTimeRemaining || SESSION_DURATIONS[prev.sessionType])
        void (prev.sessionStartedAt || new Date(Date.now() - timeSpent * 1000))
        
        
        toast.dismiss('pause-finished')
        toast.success('Pausa longa finalizada!', {
          description: autoStartPomodoros 
            ? 'Iniciando próxima sessão de foco automaticamente...'
            : 'Avançando para a próxima sessão de foco.',
          duration: 2000,
          id: 'pause-finished',
        })
        
        // AUTO-START: Usa função auxiliar para determinar próximo estado
        return getNextState('foco', prev.completedCycles, prev.sessionType)
      }

      // Prepara dados para salvar no histórico (caso genérico)
      // Variáveis preparadas para uso futuro no histórico
      void (prev.initialTimeRemaining || SESSION_DURATIONS[prev.sessionType])
      void (prev.sessionStartedAt || new Date(Date.now() - timeSpent * 1000))
      
      
      // Reseta o timer
      const newCompletedCycles = prev.sessionType === 'foco' 
        ? prev.completedCycles + 1 
        : prev.completedCycles

      const nextSessionType = prev.sessionType === 'foco' 
        ? getNextMode(newCompletedCycles)
        : 'foco'

      // AUTO-START: Usa função auxiliar para determinar próximo estado
      return getNextState(nextSessionType, newCompletedCycles, prev.sessionType)
    })
    
    // Reseta o flag após um pequeno delay para permitir que o estado seja atualizado
    setTimeout(() => {
      isFinishingRef.current = false
    }, 200)
  }, [saveSessionToSupabase])

  // Calcula o próximo modo baseado nos ciclos
  const nextMode = getNextMode(state.completedCycles)

  return {
    sessionType: state.sessionType,
    timeRemaining: state.timeRemaining,
    formattedTime: formatTime(state.timeRemaining),
    status: state.status,
    completedCycles: state.completedCycles,
    currentTask: state.currentTask,
    nextMode, // Próximo modo sugerido baseado em ciclos inteligentes
    start,
    pause,
    reset,
    setSessionType,
    setCurrentTask,
    setSessionTypeAndTask,
    finishSession,
  }
}
