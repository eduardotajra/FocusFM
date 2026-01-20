import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X, Crown, Medal, Award } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  avatar_bg_color: string | null
  total_minutes: number
  rank_position?: number
}

// Função para gerar avatar URL usando Dicebear
const getAvatarUrl = (username: string | null): string => {
  if (!username) {
    return 'https://api.dicebear.com/9.x/avataaars/svg?seed=anonymous'
  }
  // Usa o username como seed para gerar avatar consistente
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}`
}

// Função helper para criar uma variação mais clara de uma cor hex
const lightenColor = (hex: string, percent: number): string => {
  // Remove o # se existir
  hex = hex.replace('#', '')
  
  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Clarea a cor
  const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)))
  const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)))
  const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)))
  
  // Converte de volta para hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

// Função helper para criar uma variação mais escura de uma cor hex
const darkenColor = (hex: string, percent: number): string => {
  // Remove o # se existir
  hex = hex.replace('#', '')
  
  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Escurece a cor
  const newR = Math.max(0, Math.floor(r * (1 - percent / 100)))
  const newG = Math.max(0, Math.floor(g * (1 - percent / 100)))
  const newB = Math.max(0, Math.floor(b * (1 - percent / 100)))
  
  // Converte de volta para hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

// Função helper para obter a cor padrão do avatar baseada no tema
// Usa uma variação da cor accent de cada tema
const getDefaultAvatarBgColor = (accentColor: string, theme: 'lofi' | 'cyberpunk' | 'zen'): string => {
  switch (theme) {
    case 'cyberpunk':
      // Para Cyberpunk: usa uma versão mais escura do ciano para criar profundidade
      return darkenColor(accentColor, 20) // #00cccc (mais escuro que #00ffff)
    case 'zen':
      // Para Zen: usa uma versão mais clara do verde musgo para suavidade
      return lightenColor(accentColor, 15) // Mais claro que #5a8a6e
    case 'lofi':
    default:
      // Para Lofi: usa uma versão mais clara do laranja queimado para suavidade
      return lightenColor(accentColor, 10) // Mais claro que #d97757
  }
}

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
}

export const Leaderboard = ({ isOpen, onClose }: LeaderboardProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const { user: currentUser } = useAuth() // Usa o contexto de autenticação
  const [loading, setLoading] = useState(true)
  const { theme, getBorderRadiusClass, styles } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  // Obtém a cor accent do tema atual para usar como base para o avatar
  const accentColor = styles.accent.color
  
  // Ref para rastrear se já carregamos os dados uma vez
  const hasLoadedRef = useRef(false)
  // Ref para rastrear o número de perfis carregados
  const profilesCountRef = useRef(0)
  // Ref para evitar múltiplas chamadas quando o modal abre
  const isInitialFetchRef = useRef(false)

  // Busca os top 10 e configura realtime
  useEffect(() => {
    if (!isOpen) {
      // Quando o modal fecha, reseta o flag de busca inicial
      isInitialFetchRef.current = false
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false)
      return
    }

    let channel: ReturnType<typeof supabase.channel> | null = null
    let isFetching = false

    const fetchLeaderboard = async (preserveData = false) => {
      // Evita múltiplas chamadas simultâneas
      if (isFetching) return
      isFetching = true

      // Se preserveData é true e já temos dados, não mostra loading
      if (!preserveData && profilesCountRef.current === 0) {
        setLoading(true)
      }

      try {
        if (!supabase) return
        // Busca top 10 ordenados por total_minutes
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, avatar_bg_color, total_minutes')
          .order('total_minutes', { ascending: false })
          .limit(10)

        if (error) {
          if (!preserveData && profilesCountRef.current === 0) {
            setProfiles([])
            profilesCountRef.current = 0
          }
          return
        }

        // Adiciona posição no ranking
        const profilesWithRank = (data || []).map((profile: Profile, index: number) => ({
          ...profile,
          rank_position: index + 1,
        }))

        setProfiles(profilesWithRank)
        profilesCountRef.current = profilesWithRank.length
        hasLoadedRef.current = true // Marca como carregado
      } catch (error) {
        if (!preserveData && !hasLoadedRef.current && profilesCountRef.current === 0) {
          setProfiles([])
          profilesCountRef.current = 0
        }
      } finally {
        setLoading(false)
        isFetching = false
      }
    }

    // Evita múltiplas chamadas quando o modal abre
    if (isInitialFetchRef.current) {
      return
    }

    isInitialFetchRef.current = true

    // Se já temos dados carregados, não mostra loading novamente
    if (hasLoadedRef.current && profilesCountRef.current > 0) {
      setLoading(false)
      // Ainda busca em segundo plano para atualizar, mas preserva os dados visíveis
      fetchLeaderboard(true)
    } else {
      // Busca inicial
      fetchLeaderboard()
    }

    // Configura realtime para atualizar quando profiles mudarem
    // Usa um debounce para evitar múltiplas atualizações rápidas
    let realtimeTimeout: ReturnType<typeof setTimeout> | null = null
    channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // Debounce: aguarda 500ms antes de atualizar para evitar múltiplas chamadas
          if (realtimeTimeout) {
            clearTimeout(realtimeTimeout)
          }
          realtimeTimeout = setTimeout(() => {
            // Quando houver mudança, recarrega o ranking preservando os dados visíveis
            fetchLeaderboard(true)
          }, 500)
        }
      )
      .subscribe()

    // Listener de visibilidade para preservar dados quando a página volta ao foco
    let visibilityTimeout: ReturnType<typeof setTimeout> | null = null
    const handleVisibilityChange = () => {
      // Limpa timeout anterior se existir
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout)
        visibilityTimeout = null
      }

      if (document.visibilityState === 'visible' && isOpen && hasLoadedRef.current && isInitialFetchRef.current) {
        // Debounce: aguarda 500ms antes de atualizar para evitar múltiplas chamadas
        // quando a aba volta ao foco rapidamente
        visibilityTimeout = setTimeout(() => {
          // Verifica novamente se ainda está visível e aberto antes de buscar
          if (document.visibilityState === 'visible' && isOpen && hasLoadedRef.current) {
            fetchLeaderboard(true)
          }
          visibilityTimeout = null
        }, 500)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      if (channel) {
        channel.unsubscribe()
      }
      if (realtimeTimeout) {
        clearTimeout(realtimeTimeout)
      }
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // Não reseta hasLoadedRef aqui para preservar entre aberturas do modal
    }
  }, [isOpen])

  // Formata minutos para horas e minutos
  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Ícone de medalha baseado na posição - usando cores do tema
  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-5 h-5 text-skin-accent" />
      case 2:
        return <Medal className="w-5 h-5 text-skin-muted" />
      case 3:
        return <Medal className="w-5 h-5 text-skin-accent" />
      default:
        return <Award className="w-5 h-5 text-skin-muted" />
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
              className={`glass border-2 border-skin-border ${borderRadiusClass} shadow-theme max-w-2xl w-full max-h-[85vh] overflow-hidden pointer-events-auto`}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-6 border-b-2 border-skin-border"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-skin-accent" />
                  <h2 className="text-2xl font-bold text-skin-text">
                    Ranking de Produtividade
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
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div 
                      className="w-8 h-8 border-2 border-t-transparent border-skin-accent rounded-full animate-spin"
                    />
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-skin-muted">
                      Nenhum usuário no ranking ainda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profiles.map((profile, index) => {
                      const isCurrentUser = currentUser?.id === profile.id
                      const rankIcon = getRankIcon(profile.rank_position || index + 1)
                      const displayUsername = profile.username || 'Usuário Anônimo'
                      const avatarUrl = profile.avatar_url || getAvatarUrl(profile.username)

                      return (
                        <motion.div
                          key={profile.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`
                            flex items-center gap-4 p-4 ${borderRadiusClass} transition-all
                            ${isCurrentUser ? 'border-2 border-skin-accent shadow-lg bg-skin-accent/20' : 'border border-skin-border'}
                          `}
                        >
                          {/* Posição */}
                          <div 
                            className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg bg-skin-card border border-skin-border text-skin-text"
                          >
                            {profile.rank_position || index + 1}
                          </div>

                          {/* Ícone de medalha */}
                          <div className="flex-shrink-0">{rankIcon}</div>

                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div 
                              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 overflow-hidden ${isCurrentUser ? 'border-skin-accent' : 'border-skin-border'}`}
                              style={{
                                backgroundColor: profile.avatar_bg_color || getDefaultAvatarBgColor(accentColor, theme),
                              }}
                            >
                              <img
                                src={avatarUrl}
                                alt={displayUsername}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback se a imagem não carregar
                                  const target = e.target as HTMLImageElement
                                  target.src = getAvatarUrl(profile.username)
                                }}
                              />
                            </div>
                          </div>

                          {/* Username */}
                          <div className="flex-1 min-w-0">
                            <p
                              className="font-semibold truncate text-skin-text"
                            >
                              {displayUsername}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs opacity-70">(Você)</span>
                              )}
                            </p>
                          </div>

                          {/* Total de minutos */}
                          <div className="flex-shrink-0 text-right">
                            <p
                              className="font-bold text-lg text-skin-accent"
                            >
                              {formatMinutes(profile.total_minutes)}
                            </p>
                            <p 
                              className="text-xs text-skin-muted"
                            >
                              total
                            </p>
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
