import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Trophy } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { BADGES } from '../constants/badges'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface BadgesGalleryProps {
  isOpen: boolean
  onClose: () => void
  currentUser?: SupabaseUser | null // Usuário atual passado como prop
  renderContentOnly?: boolean // Se true, renderiza apenas o conteúdo sem backdrop/modal
}

export const BadgesGallery = ({ isOpen, onClose, currentUser: propUser, renderContentOnly = false }: BadgesGalleryProps) => {
  const [ownedBadgeIds, setOwnedBadgeIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false) // Começa como false, só ativa quando realmente vai buscar
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

    // Se não temos usuário da prop, não pode buscar badges
    if (!propUser) {
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
      
      // Timeout de segurança: se a busca demorar mais de 5 segundos, desativa o loading
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
        // Verifica se foi cancelado antes de continuar
        if (signal.aborted) {
          return
        }

        // Usa o usuário da prop, não precisa buscar novamente
        const currentUser = propUser

        if (currentUser && !signal.aborted && supabase) {
          const { data: badges, error } = await supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', currentUser.id)

          // Verifica novamente se foi cancelado antes de atualizar estado
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
            setOwnedBadgeIds(new Set(badges?.map((b) => b.badge_id) || []))
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
        // SEMPRE desativa loading no finally para garantir que nunca fique infinito
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
  }, [isOpen, propUser?.id]) // Depende do ID do usuário da prop

  const themeColors = {
    bg: 'var(--color-bg)',
    surface: 'var(--color-surface)',
    surfaceHover: 'var(--color-surface-hover)',
    text: 'var(--color-text)',
    muted: 'var(--color-muted)',
    border: 'var(--color-border)',
    primary: 'var(--color-primary)',
    backdrop: 'var(--color-backdrop)',
    backdropDark: 'var(--color-backdrop-dark)',
    shadowModal: 'var(--color-shadow-modal)',
    shadowDark: 'var(--color-shadow-dark)',
  }

  // Se renderContentOnly, renderiza apenas o conteúdo
  if (renderContentOnly) {
    if (!isOpen) return null
    return (
      <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: themeColors.primary, borderTopColor: 'transparent' }} />
            </div>
          ) : !propUser ? (
            <div className="text-center py-12" style={{ color: themeColors.muted }}>
              <p>Faça login para ver suas conquistas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BADGES.map((badge) => {
                const isOwned = ownedBadgeIds.has(badge.id)
                const Icon = badge.icon

                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: BADGES.indexOf(badge) * 0.05 }}
                    className={`relative p-4 rounded-button border-2 transition-all ${
                      isOwned ? '' : 'grayscale opacity-60'
                    }`}
                    style={{
                      backgroundColor: isOwned ? themeColors.surface : themeColors.bg,
                      borderColor: isOwned ? themeColors.primary : themeColors.border,
                    }}
                  >
                    {!isOwned && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-4 h-4" style={{ color: themeColors.muted }} />
                      </div>
                    )}
                    <div className="flex flex-col items-center text-center gap-2">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                          isOwned ? badge.color : 'text-gray-500'
                        }`}
                        style={{
                          borderColor: isOwned ? themeColors.primary : themeColors.border,
                          backgroundColor: isOwned ? `${themeColors.primary}20` : 'transparent',
                        }}
                      >
                        <Icon className={`w-8 h-8 ${isOwned ? badge.color : 'text-gray-500'}`} />
                      </div>
                      <h3
                        className={`font-bold text-lg ${isOwned ? '' : 'text-gray-500'}`}
                        style={{ color: isOwned ? themeColors.text : themeColors.muted }}
                      >
                        {badge.name}
                      </h3>
                      <p className="text-sm" style={{ color: themeColors.muted }}>
                        {badge.description}
                      </p>
                      {isOwned && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-1"
                        >
                          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: themeColors.primary, color: 'white' }}>
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
    )
  }

  // Renderização completa com backdrop e modal
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-sm"
            style={{ backgroundColor: themeColors.backdropDark }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="glass relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-button border-2 pointer-events-auto"
            style={{
              borderColor: themeColors.border,
            }}
          >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: themeColors.border }}>
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6" style={{ color: themeColors.primary }} />
            <h2 className="text-2xl font-bold" style={{ color: themeColors.text }}>
              Conquistas
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            style={{
              color: themeColors.text,
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.surfaceHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: themeColors.primary, borderTopColor: 'transparent' }} />
            </div>
          ) : !propUser ? (
            <div className="text-center py-12" style={{ color: themeColors.muted }}>
              <p>Faça login para ver suas conquistas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BADGES.map((badge) => {
                const isOwned = ownedBadgeIds.has(badge.id)
                const Icon = badge.icon

                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: BADGES.indexOf(badge) * 0.05 }}
                    className={`relative p-4 rounded-button border-2 transition-all ${
                      isOwned ? '' : 'grayscale opacity-60'
                    }`}
                    style={{
                      backgroundColor: isOwned ? themeColors.surface : themeColors.bg,
                      borderColor: isOwned ? themeColors.primary : themeColors.border,
                    }}
                  >
                    {!isOwned && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-4 h-4" style={{ color: themeColors.muted }} />
                      </div>
                    )}
                    <div className="flex flex-col items-center text-center gap-2">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                          isOwned ? badge.color : 'text-gray-500'
                        }`}
                        style={{
                          borderColor: isOwned ? themeColors.primary : themeColors.border,
                          backgroundColor: isOwned ? `${themeColors.primary}20` : 'transparent',
                        }}
                      >
                        <Icon className={`w-8 h-8 ${isOwned ? badge.color : 'text-gray-500'}`} />
                      </div>
                      <h3
                        className={`font-bold text-lg ${isOwned ? '' : 'text-gray-500'}`}
                        style={{ color: isOwned ? themeColors.text : themeColors.muted }}
                      >
                        {badge.name}
                      </h3>
                      <p className="text-sm" style={{ color: themeColors.muted }}>
                        {badge.description}
                      </p>
                      {isOwned && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-1"
                        >
                          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: themeColors.primary, color: 'white' }}>
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
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  )
}
