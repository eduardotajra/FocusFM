import { useState, useEffect, useRef } from 'react'
import { X, Trophy, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { BADGES, type Badge } from '../../constants/badges'

interface AchievementsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AchievementsModal = ({ isOpen, onClose }: AchievementsModalProps) => {
  const { getBorderRadiusClass, styles, theme } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  const { user } = useAuth()
  
  const [ownedBadgeIds, setOwnedBadgeIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const isFetchingRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Quando o modal fecha, reseta o estado completamente
    if (!isOpen) {
      setLoading(false)
      isFetchingRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      return
    }

    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false)
      return
    }

    // Se não temos usuário, não pode buscar badges
    if (!user) {
      setLoading(false)
      return
    }

    // Evita múltiplas chamadas simultâneas
    if (isFetchingRef.current) {
      return
    }

    const fetchBadges = async () => {
      // Cancela qualquer busca anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      isFetchingRef.current = true
      setLoading(true)
      
      // Timeout de segurança
      timeoutRef.current = setTimeout(() => {
        if (!signal.aborted) {
          setLoading(false)
          isFetchingRef.current = false
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }, 5000)

      try {
        if (signal.aborted) {
          return
        }

        if (user && !signal.aborted && supabase) {
          const { data: badges, error } = await supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', user.id)

          if (signal.aborted) {
            return
          }

          if (error) {
            if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist')) {
              setOwnedBadgeIds(new Set())
            } else {
              setOwnedBadgeIds(new Set())
            }
          } else {
            setOwnedBadgeIds(new Set(badges?.map((b: { badge_id: string }) => b.badge_id) || []))
          }
        } else if (!signal.aborted) {
          setOwnedBadgeIds(new Set())
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        if (!signal.aborted) {
          setOwnedBadgeIds(new Set())
        }
      } finally {
        setLoading(false)
        isFetchingRef.current = false
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        abortControllerRef.current = null
      }
    }

    fetchBadges()
  }, [isOpen, user?.id])

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
              className={`glass border-2 border-skin-border ${borderRadiusClass} shadow-theme max-w-4xl w-full overflow-hidden pointer-events-auto`}
              style={{
                willChange: 'transform, opacity',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-skin-border"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-skin-accent" />
                  <h2 className="text-xl sm:text-2xl font-bold text-skin-text">
                    Conquistas
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text`}
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-skin-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !user ? (
                  <div className="text-center py-12 text-skin-muted">
                    <p>Faça login para ver suas conquistas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {BADGES.map((badge: Badge) => {
                      const isOwned = ownedBadgeIds.has(badge.id)
                      const Icon = badge.icon

                      return (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: BADGES.indexOf(badge) * 0.05 }}
                          className={`relative p-4 ${borderRadiusClass} border-2 transition-all ${
                            isOwned ? '' : 'grayscale opacity-50'
                          }`}
                          style={{
                            backgroundColor: isOwned ? styles.bg.card : styles.bg.app,
                            borderColor: isOwned ? styles.accent.color : styles.border.color,
                          }}
                        >
                          {!isOwned && (
                            <div className="absolute top-2 right-2">
                              <Lock className="w-4 h-4" style={{ color: styles.text.secondary }} />
                            </div>
                          )}
                          <div className="flex flex-col items-center text-center gap-2">
                            <div
                              className={`w-16 h-16 ${borderRadiusClass} flex items-center justify-center border-2 ${
                                isOwned ? badge.color : 'text-gray-500'
                              }`}
                              style={{
                                borderColor: isOwned ? styles.accent.color : styles.border.color,
                                backgroundColor: isOwned 
                                  ? `${styles.accent.color}20` 
                                  : 'transparent',
                              }}
                            >
                              <Icon 
                                className={`w-8 h-8 ${isOwned ? badge.color : 'text-gray-500'}`} 
                              />
                            </div>
                            <h3
                              className={`font-bold text-lg ${
                                isOwned ? 'text-skin-text' : 'text-skin-muted'
                              }`}
                            >
                              {badge.name}
                            </h3>
                            <p className="text-sm text-skin-muted">
                              {badge.description}
                            </p>
                            {isOwned && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="mt-1"
                              >
                                <span 
                                  className="text-xs font-semibold px-2 py-1 rounded-full" 
                                  style={{ 
                                    backgroundColor: styles.accent.color, 
                                    color: theme === 'cyberpunk' ? '#000000' : styles.accent.text 
                                  }}
                                >
                                  Conquistada!
                                </span>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
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
