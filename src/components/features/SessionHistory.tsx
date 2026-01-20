import { useState, useEffect, useMemo } from 'react'
import { Brain, Coffee, Clock, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useTheme } from '../../hooks/useTheme'
import type { SessionHistoryItem } from '../../types'

interface SessionHistoryProps {
  isOpen: boolean
  onClose: () => void
  onResumeSession?: (item: SessionHistoryItem) => void
}

interface GroupedSessions {
  label: string
  sessions: SessionHistoryItem[]
}

export const SessionHistory = ({ isOpen, onClose, onResumeSession }: SessionHistoryProps) => {
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()

  const themeColors = useMemo(() => {
    return {
      background: 'var(--color-surface)',
      border: 'var(--color-border)',
      text: 'var(--color-text)',
      highlight: 'var(--color-primary)',
      cardBg: 'var(--color-surface)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
    }
  }, [theme])

  // Busca sessões do Supabase
  useEffect(() => {
    if (!isOpen) return

    const fetchSessions = async () => {
      setLoading(true)
      try {
        if (!isSupabaseConfigured() || !supabase) {
          setSessions([])
          setLoading(false)
          return
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          setSessions([])
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('session_history')
          .select('*')
          .eq('user_id', user.id)
          .order('finished_at', { ascending: false })
          .limit(50) // Limita a 50 sessões mais recentes

        if (error) {
          if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            setSessions([])
          } else {
            setSessions([])
          }
        } else {
          setSessions((data || []) as SessionHistoryItem[])
        }
      } catch (error) {
        setSessions([])
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [isOpen])

  // Agrupa sessões por dia
  const groupedSessions = useMemo((): GroupedSessions[] => {
    if (sessions.length === 0) return []

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const groups: GroupedSessions[] = []
    const todaySessions: SessionHistoryItem[] = []
    const yesterdaySessions: SessionHistoryItem[] = []
    const olderSessions: SessionHistoryItem[] = []

    sessions.forEach((session) => {
      const sessionDate = new Date(session.finished_at)
      sessionDate.setHours(0, 0, 0, 0)

      if (sessionDate.getTime() === today.getTime()) {
        todaySessions.push(session)
      } else if (sessionDate.getTime() === yesterday.getTime()) {
        yesterdaySessions.push(session)
      } else {
        olderSessions.push(session)
      }
    })

    if (todaySessions.length > 0) {
      groups.push({ label: 'Hoje', sessions: todaySessions })
    }
    if (yesterdaySessions.length > 0) {
      groups.push({ label: 'Ontem', sessions: yesterdaySessions })
    }
    if (olderSessions.length > 0) {
      // Agrupa sessões mais antigas por data
      const olderGroups = new Map<string, SessionHistoryItem[]>()
      olderSessions.forEach((session) => {
        const date = new Date(session.finished_at)
        const dateKey = date.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        })
        if (!olderGroups.has(dateKey)) {
          olderGroups.set(dateKey, [])
        }
        olderGroups.get(dateKey)!.push(session)
      })

      olderGroups.forEach((sessions, dateKey) => {
        groups.push({ label: dateKey, sessions })
      })
    }

    return groups
  }, [sessions])

  // Formata duração em minutos e segundos
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}min ${secs}s`
    }
    return `${secs}s`
  }

  // Formata horário
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Obtém ícone baseado no tipo de sessão
  const getSessionIcon = (sessionType: string) => {
    switch (sessionType) {
      case 'foco':
        return <Brain className="w-5 h-5" />
      case 'pausa curta':
      case 'pausa longa':
        return <Coffee className="w-5 h-5" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  // Obtém cor do status
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return themeColors.success
      case 'MANUAL_STOP':
        return themeColors.warning
      default:
        return themeColors.text
    }
  }

  // Obtém nome do tipo de sessão
  const getSessionTypeName = (sessionType: string): string => {
    switch (sessionType) {
      case 'foco':
        return 'Foco'
      case 'pausa curta':
        return 'Pausa Curta'
      case 'pausa longa':
        return 'Pausa Longa'
      default:
        return sessionType
    }
  }

  // Item mais recente para botão de retomar
  const mostRecentSession = sessions.length > 0 ? sessions[0] : null
  const canResume = mostRecentSession?.status === 'MANUAL_STOP'

  const handleResume = () => {
    if (mostRecentSession && onResumeSession) {
      onResumeSession(mostRecentSession)
      onClose()
    }
  }

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
            className="fixed inset-0 backdrop-blur-md z-50"
            style={{ backgroundColor: 'var(--color-backdrop)' }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-surface/95 backdrop-blur-xl border-2 rounded-button shadow-theme max-w-2xl w-full max-h-[85vh] overflow-hidden pointer-events-auto"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.cardBg,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-6 border-b-2"
                style={{ borderColor: themeColors.border }}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6" style={{ color: themeColors.highlight }} />
                  <h2 className="text-2xl font-bold" style={{ color: themeColors.text }}>
                    Histórico de Sessões
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  style={{ color: themeColors.text }}
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div 
                className="p-6 overflow-y-auto"
                style={{ 
                  maxHeight: 'calc(85vh - 120px)',
                  minHeight: '300px',
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-lg" style={{ color: themeColors.text }}>
                      Carregando...
                    </div>
                  </div>
                ) : groupedSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Clock className="w-16 h-16 mb-4 opacity-50" style={{ color: themeColors.text }} />
                    <p className="text-lg opacity-70" style={{ color: themeColors.text }}>
                      Nenhuma sessão registrada ainda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Botão de Retomar no topo (se aplicável) */}
                    {canResume && mostRecentSession && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                      >
                        <motion.button
                          onClick={handleResume}
                          className="w-full p-4 rounded-xl border-2 flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          style={{
                            backgroundColor: 'var(--color-warning-bg)',
                            borderColor: 'var(--color-warning-border)',
                            color: themeColors.warning,
                            willChange: 'transform'
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                          <RotateCcw className="w-5 h-5" />
                          <div className="flex-1 text-left">
                            <div className="font-bold">Retomar de onde parei</div>
                            <div className="text-sm opacity-80">
                              {getSessionTypeName(mostRecentSession.session_type)} • {formatTime(mostRecentSession.started_at)}
                            </div>
                          </div>
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Timeline */}
                    {groupedSessions.map((group, groupIndex) => (
                      <div key={groupIndex} className="space-y-3">
                        {/* Label do grupo */}
                        <h3 
                          className="text-sm font-bold uppercase tracking-wider mb-2"
                          style={{ color: themeColors.highlight }}
                        >
                          {group.label}
                        </h3>

                        {/* Sessões do grupo */}
                        <div className="space-y-2">
                          {group.sessions.map((session, sessionIndex) => {
                            const isLastInGroup = sessionIndex === group.sessions.length - 1
                            
                            return (
                              <motion.div
                                key={session.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: sessionIndex * 0.05 }}
                                className="flex items-start gap-4 relative"
                              >
                                {/* Linha da timeline */}
                                {!isLastInGroup && (
                                  <div
                                    className="absolute left-[18px] top-[32px] w-0.5"
                                    style={{
                                      height: 'calc(100% + 8px)',
                                      backgroundColor: themeColors.border,
                                    }}
                                  />
                                )}

                                {/* Ícone */}
                                <div
                                  className="relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 flex-shrink-0"
                                  style={{
                                    backgroundColor: themeColors.cardBg,
                                    borderColor: getStatusColor(session.status),
                                    color: getStatusColor(session.status),
                                  }}
                                >
                                  {getSessionIcon(session.session_type)}
                                </div>

                                {/* Conteúdo */}
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="p-3 rounded-button border-2"
                                    style={{
                                      backgroundColor: themeColors.background,
                                      borderColor: themeColors.border,
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-2">
                                        <span 
                                          className="font-semibold text-sm"
                                          style={{ color: themeColors.text }}
                                        >
                                          {getSessionTypeName(session.session_type)}
                                        </span>
                                        <span
                                          className="text-xs px-2 py-0.5 rounded-full"
                                          style={{
                                            backgroundColor: getStatusColor(session.status) + '20',
                                            color: getStatusColor(session.status),
                                          }}
                                        >
                                          {session.status === 'COMPLETED' ? 'Completa' : 'Interrompida'}
                                        </span>
                                      </div>
                                      <div 
                                        className="text-xs flex items-center gap-1"
                                        style={{ color: themeColors.text, opacity: 0.7 }}
                                      >
                                        <Clock className="w-3 h-3" />
                                        {formatTime(session.started_at)}
                                      </div>
                                    </div>
                                    <div 
                                      className="text-sm flex items-center gap-2"
                                      style={{ color: themeColors.text, opacity: 0.8 }}
                                    >
                                      <span>Duração: {formatDuration(session.duration_seconds)}</span>
                                      {session.duration_seconds < session.target_duration && (
                                        <span className="text-xs opacity-60">
                                          (planejado: {formatDuration(session.target_duration)})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
