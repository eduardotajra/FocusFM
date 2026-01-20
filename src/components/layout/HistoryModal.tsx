import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { X, BarChart3, Brain, Coffee, Clock, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface Session {
  id: string
  mode: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'
  duration: number // em segundos
  completed_at: string
  status: 'COMPLETED' | 'ABANDONED'
}

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HistoryModal = ({ isOpen, onClose }: HistoryModalProps) => {
  const { theme, styles, getBorderRadiusClass } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Ref para evitar múltiplas chamadas simultâneas (React Strict Mode)
  const isLoadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Função auxiliar para remover duplicatas baseado no ID
  // Usa Map para garantir IDs únicos (última ocorrência prevalece)
  const removeDuplicates = useCallback((data: Session[]): Session[] => {
    if (!data || data.length === 0) return []
    
    // Usa Map para garantir IDs únicos (última ocorrência prevalece)
    const uniqueMap = new Map<string, Session>()
    data.forEach(session => {
      if (session && session.id) {
        uniqueMap.set(session.id, session)
      }
    })
    return Array.from(uniqueMap.values())
  }, [])

  // Carrega sessões do Supabase quando o modal abre
  useEffect(() => {
    // Limpa estado quando o modal fecha
    if (!isOpen) {
      setSessions([])
      setError(null)
      setLoading(false)
      isLoadingRef.current = false
      // Cancela requisição pendente se houver
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      return
    }

    // Evita múltiplas chamadas simultâneas (React Strict Mode)
    if (isLoadingRef.current) {
      return
    }

    const loadSessions = async () => {
      if (!isSupabaseConfigured() || !supabase || !user) {
        setLoading(false)
        isLoadingRef.current = false
        return
      }

      // Marca como carregando e cancela requisição anterior se houver
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      
      isLoadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(100) // Limita a 100 sessões mais recentes

        // Verifica se a requisição foi cancelada
        if (abortControllerRef.current?.signal.aborted) {
          return
        }

        if (fetchError) {
          // Se a tabela não existir, mostra mensagem amigável
          if (fetchError.message.includes('does not exist') || fetchError.message.includes('relation')) {
            setError('Tabela de histórico não configurada. Execute a migração SQL no Supabase.')
          } else {
            setError('Erro ao carregar histórico de sessões.')
          }
          setSessions([]) // Substitui, não concatena
        } else {
          // Remove duplicatas antes de definir no estado
          // Garante que não há duplicatas mesmo se o banco retornar dados duplicados
          const uniqueSessions = removeDuplicates(data || [])
          // SUBSTITUI o estado inteiramente (não concatena)
          // Usa função de atualização para garantir que substitui completamente
          setSessions(() => uniqueSessions)
        }
      } catch (err) {
        // Verifica se a requisição foi cancelada
        if (abortControllerRef.current?.signal.aborted) {
          return
        }
        setError('Erro ao carregar histórico de sessões.')
        setSessions([]) // Substitui, não concatena
      } finally {
        // Só atualiza loading se não foi cancelado
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false)
          isLoadingRef.current = false
          abortControllerRef.current = null
        }
      }
    }

    loadSessions()

    // Cleanup: cancela requisição se o componente desmontar ou modal fechar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      isLoadingRef.current = false
    }
  }, [isOpen, user])

  // Calcula estatísticas
  const stats = useMemo(() => {
    const focusSessions = sessions.filter(s => s.mode === 'FOCUS')
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED')
    
    // Tempo total de foco em segundos
    const totalFocusSeconds = focusSessions.reduce((sum, s) => sum + s.duration, 0)
    const totalFocusMinutes = Math.floor(totalFocusSeconds / 60)
    const totalFocusHours = Math.floor(totalFocusMinutes / 60)
    const remainingMinutes = totalFocusMinutes % 60

    // Tempo total de pausas em segundos
    const breakSessions = sessions.filter(s => s.mode === 'SHORT_BREAK' || s.mode === 'LONG_BREAK')
    const totalBreakSeconds = breakSessions.reduce((sum, s) => sum + s.duration, 0)
    const totalBreakMinutes = Math.floor(totalBreakSeconds / 60)

    // Total de tempo (foco + pausas)
    const totalSeconds = totalFocusSeconds + totalBreakSeconds
    const focusPercentage = totalSeconds > 0 ? Math.round((totalFocusSeconds / totalSeconds) * 100) : 0
    const breakPercentage = 100 - focusPercentage

    return {
      totalFocusHours,
      totalFocusMinutes,
      totalFocusSeconds,
      remainingMinutes,
      completedSessions: completedSessions.length,
      totalSessions: sessions.length,
      focusPercentage,
      breakPercentage,
      totalBreakMinutes,
    }
  }, [sessions])

  // Agrupa sessões por data (com proteção adicional contra duplicatas)
  const groupedSessions = useMemo(() => {
    // Remove duplicatas novamente antes de agrupar (safety check)
    // Isso garante que mesmo se o estado tiver duplicatas, o agrupamento não terá
    const uniqueSessions = removeDuplicates(sessions)
    
    const groups: Record<string, Session[]> = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    uniqueSessions.forEach(session => {
      const sessionDate = new Date(session.completed_at)
      sessionDate.setHours(0, 0, 0, 0)
      const dateStr = sessionDate.toISOString().split('T')[0]
      
      if (!groups[dateStr]) {
        groups[dateStr] = []
      }
      groups[dateStr].push(session)
    })

    // Converte para array e ordena por data (mais recente primeiro)
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, sessions]) => {
        const sessionDate = new Date(date)
        sessionDate.setHours(0, 0, 0, 0)
        
        let label = date
        if (sessionDate.getTime() === today.getTime()) {
          label = 'Hoje'
        } else if (sessionDate.getTime() === yesterday.getTime()) {
          label = 'Ontem'
        } else {
          // Formata data: "15 de Janeiro"
          label = sessionDate.toLocaleDateString('pt-BR', { 
            day: 'numeric', 
            month: 'long' 
          })
        }

        return { date, label, sessions }
      })
  }, [sessions])

  // Formata duração
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }

  // Formata hora
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // Estilos baseados no tema
  const themeStyles = useMemo(() => {
    const isCyberpunk = theme === 'cyberpunk'
    const isLofi = theme === 'lofi'
    
    return {
      cardStyle: isCyberpunk 
        ? { 
            fontFamily: 'monospace',
            borderWidth: '1px',
            borderStyle: 'solid',
          }
        : {},
      textStyle: isCyberpunk
        ? { fontFamily: 'monospace', fontSize: '0.875rem' }
        : {},
      timelineItemStyle: isLofi
        ? { borderRadius: borderRadiusClass }
        : isCyberpunk
        ? { borderLeft: `2px solid ${styles.accent.color}` }
        : {},
    }
  }, [theme, styles, borderRadiusClass])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-md z-50 bg-black/50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className={`glass border-2 border-skin-border ${borderRadiusClass} shadow-theme max-w-4xl w-full overflow-hidden pointer-events-auto max-h-[90vh] flex flex-col`}
              style={{
                borderColor: styles.border.color,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-skin-border"
                style={{ borderColor: styles.border.color }}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6" style={{ color: styles.accent.color }} />
                  <h2 className="text-xl sm:text-2xl font-bold" style={{ color: styles.text.primary }}>
                    Histórico de Sessões
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2`}
                  style={{ color: styles.text.primary }}
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div 
                      className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: styles.accent.color }}
                    />
                  </div>
                ) : error ? (
                  <div 
                    className={`p-4 ${borderRadiusClass} border-2`}
                    style={{
                      backgroundColor: styles.states.errorBg,
                      borderColor: styles.states.errorBorder,
                      color: styles.states.error,
                    }}
                  >
                    <p className="font-medium">{error}</p>
                    <p className="text-sm mt-2 opacity-80">
                      Execute a migração: database/migrations/supabase_update_sessions_table.sql
                    </p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div 
                      className={`p-6 ${borderRadiusClass} border-2 text-center max-w-md`}
                      style={{
                        backgroundColor: styles.bg.card,
                        borderColor: styles.border.color,
                      }}
                    >
                      <p 
                        className="text-xl font-bold mb-2"
                        style={{ color: styles.accent.color }}
                      >
                        Nenhuma sessão registrada
                      </p>
                      <p 
                        className="text-base mb-4"
                        style={{ color: styles.text.secondary }}
                      >
                        Complete suas primeiras sessões para ver o histórico aqui!
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Dashboard - Cards de Resumo */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      {/* Card 1: Tempo Total de Foco */}
                      <div 
                        className={`p-4 ${borderRadiusClass} border-2`}
                        style={{
                          backgroundColor: styles.bg.card,
                          borderColor: styles.border.color,
                          ...themeStyles.cardStyle,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-5 h-5" style={{ color: styles.accent.color }} />
                          <div 
                            className="text-sm font-semibold"
                            style={{ color: styles.text.secondary }}
                          >
                            Tempo Total de Foco
                          </div>
                        </div>
                        <div 
                          className="text-2xl font-bold"
                          style={{ color: styles.accent.color }}
                        >
                          {stats.totalFocusHours > 0 
                            ? `${stats.totalFocusHours}h ${stats.remainingMinutes}m`
                            : `${stats.totalFocusMinutes}m`
                          }
                        </div>
                      </div>

                      {/* Card 2: Sessões Completas */}
                      <div 
                        className={`p-4 ${borderRadiusClass} border-2`}
                        style={{
                          backgroundColor: styles.bg.card,
                          borderColor: styles.border.color,
                          ...themeStyles.cardStyle,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5" style={{ color: styles.accent.color }} />
                          <div 
                            className="text-sm font-semibold"
                            style={{ color: styles.text.secondary }}
                          >
                            Sessões Completas
                          </div>
                        </div>
                        <div 
                          className="text-2xl font-bold"
                          style={{ color: styles.accent.color }}
                        >
                          {stats.completedSessions} {stats.completedSessions === 1 ? 'Ciclo' : 'Ciclos'}
                        </div>
                      </div>

                      {/* Card 3: Balanço */}
                      <div 
                        className={`p-4 ${borderRadiusClass} border-2`}
                        style={{
                          backgroundColor: styles.bg.card,
                          borderColor: styles.border.color,
                          ...themeStyles.cardStyle,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5" style={{ color: styles.accent.color }} />
                          <div 
                            className="text-sm font-semibold"
                            style={{ color: styles.text.secondary }}
                          >
                            Balanço
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-2 flex-1 rounded-full"
                              style={{ backgroundColor: styles.border.color }}
                            >
                              <div 
                                className="h-full rounded-full"
                                style={{ 
                                  width: `${stats.focusPercentage}%`,
                                  backgroundColor: styles.accent.color,
                                }}
                              />
                            </div>
                            <span 
                              className="text-xs font-medium"
                              style={{ color: styles.text.primary }}
                            >
                              {stats.focusPercentage}%
                            </span>
                          </div>
                          <div 
                            className="text-xs"
                            style={{ color: styles.text.secondary }}
                          >
                            {stats.focusPercentage}% Foco / {stats.breakPercentage}% Pausa
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline - Lista Detalhada */}
                    <div className="space-y-6">
                      <h3 
                        className="text-lg font-bold"
                        style={{ color: styles.text.primary }}
                      >
                        Timeline
                      </h3>
                      
                      {groupedSessions.map(({ date, label, sessions: daySessions }) => (
                        <div key={date} className="space-y-3">
                          {/* Cabeçalho da Data */}
                          <div 
                            className="text-sm font-semibold px-2"
                            style={{ color: styles.text.secondary }}
                          >
                            {label}
                          </div>
                          
                          {/* Lista de Sessões do Dia */}
                          <div className="space-y-2">
                            {daySessions.map((session) => {
                              const isFocus = session.mode === 'FOCUS'
                              const isCompleted = session.status === 'COMPLETED'
                              
                              return (
                                <motion.div
                                  key={session.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={`flex items-center gap-3 p-3 ${borderRadiusClass} border-2`}
                                  style={{
                                    backgroundColor: styles.bg.card,
                                    borderColor: isFocus 
                                      ? styles.accent.color 
                                      : styles.border.color,
                                    opacity: isCompleted ? 1 : 0.7,
                                    ...themeStyles.timelineItemStyle,
                                  }}
                                >
                                  {/* Ícone */}
                                  <div 
                                    className="flex-shrink-0"
                                    style={{ color: isFocus ? styles.accent.color : styles.text.secondary }}
                                  >
                                    {isFocus ? (
                                      <Brain className="w-5 h-5" />
                                    ) : (
                                      <Coffee className="w-5 h-5" />
                                    )}
                                  </div>
                                  
                                  {/* Informações */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span 
                                        className="font-medium"
                                        style={{ color: styles.text.primary }}
                                      >
                                        {isFocus ? 'Foco' : session.mode === 'SHORT_BREAK' ? 'Pausa Curta' : 'Pausa Longa'}
                                      </span>
                                      {!isCompleted && (
                                        <span 
                                          className="text-xs px-2 py-0.5 rounded"
                                          style={{
                                            backgroundColor: styles.states.warningBg,
                                            color: styles.states.warning,
                                          }}
                                        >
                                          Abandonada
                                        </span>
                                      )}
                                    </div>
                                    <div 
                                      className="text-xs mt-0.5"
                                      style={{ color: styles.text.secondary }}
                                    >
                                      {formatTime(session.completed_at)} • {formatDuration(session.duration)}
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
