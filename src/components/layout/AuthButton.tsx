import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, LogOut, User, Github, AlertCircle, CheckCircle2, Edit, Trophy, X } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { UpdateProfile } from '../UpdateProfile'
import { BadgesGallery } from '../BadgesGallery'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'

// Função helper para criar uma variação mais clara de uma cor hex
const lightenColor = (hex: string, percent: number): string => {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)))
  const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)))
  const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)))
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

// Função helper para criar uma variação mais escura de uma cor hex
const darkenColor = (hex: string, percent: number): string => {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const newR = Math.max(0, Math.floor(r * (1 - percent / 100)))
  const newG = Math.max(0, Math.floor(g * (1 - percent / 100)))
  const newB = Math.max(0, Math.floor(b * (1 - percent / 100)))
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

// Função helper para obter a cor padrão do avatar baseada no tema
// Usa uma variação da cor accent de cada tema
const getDefaultAvatarBgColor = (accentColor: string, theme: 'lofi' | 'cyberpunk' | 'zen'): string => {
  switch (theme) {
    case 'cyberpunk':
      return darkenColor(accentColor, 20) // Versão mais escura do ciano
    case 'zen':
      return lightenColor(accentColor, 15) // Versão mais clara do verde musgo
    case 'lofi':
    default:
      return lightenColor(accentColor, 10) // Versão mais clara do laranja queimado
  }
}

interface AuthButtonProps {
  onOpenProfile?: () => void
  onOpenAchievements?: () => void
}

export const AuthButton = ({ onOpenProfile, onOpenAchievements }: AuthButtonProps = {}) => {
  const { theme, styles, getBorderRadiusClass } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  const accentColor = styles.accent.color
  const { user, loading: authLoading, signOut: contextSignOut } = useAuth() // Usa o contexto de autenticação
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showUpdateProfile, setShowUpdateProfile] = useState(false)
  const [hasUsername, setHasUsername] = useState<boolean | null>(null)
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null)
  const [profileAvatarBgColor, setProfileAvatarBgColor] = useState<string>(() => getDefaultAvatarBgColor(accentColor, theme))
  const [profileLoaded, setProfileLoaded] = useState(false) // Flag para saber se o perfil foi carregado
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showBadgesGallery, setShowBadgesGallery] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Refs estáveis para garantir que os handlers sempre funcionem mesmo após mudanças de aba
  const handleBadgesClickRef = useRef<() => void>(() => {
    setShowBadgesGallery(true)
    setShowProfileDropdown(false)
  })
  const handleSignOutClickRef = useRef<() => void>(() => {})
  
  // Atualiza os refs sempre que as funções mudam
  useEffect(() => {
    handleBadgesClickRef.current = () => {
      setShowBadgesGallery(true)
      setShowProfileDropdown(false)
    }
  }, [])
  
  useEffect(() => {
    handleSignOutClickRef.current = handleSignOut
  }, [])

  // Ref para evitar múltiplas chamadas simultâneas
  const checkingUsernameRef = useRef<Set<string>>(new Set())
  
  // Ref para garantir que o backdrop só feche em clique explícito (não ao soltar após mousedown no modal)
  const mouseDownOnBackdropRef = useRef(false)

  useEffect(() => {
    if (showEmailForm) mouseDownOnBackdropRef.current = false
  }, [showEmailForm])
  
  // Ref para rastrear o userId atual para evitar atualizações desnecessárias
  const currentUserIdRef = useRef<string | null>(null)
  // Ref para rastrear se já fizemos o carregamento inicial
  const isInitialLoadRef = useRef(true)

  // Função para verificar se o usuário tem username
  const checkUsername = async (userId: string) => {
    if (!isSupabaseConfigured() || !supabase) return
    
    // Evita múltiplas chamadas simultâneas para o mesmo usuário
    if (checkingUsernameRef.current.has(userId)) {
      return
    }
    
    checkingUsernameRef.current.add(userId)
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()

      const hasUsernameValue = data?.username && data.username.trim() !== '' && !data.username.startsWith('user_')
      setHasUsername(hasUsernameValue)
      
      // Se não tem username válido, mostra o modal após um pequeno delay
      if (!hasUsernameValue && user) {
        setTimeout(() => {
          setShowUpdateProfile(true)
        }, 1000)
      }
    } catch (error) {
    } finally {
      // Remove o userId do set após um delay para permitir novas verificações se necessário
      setTimeout(() => {
        checkingUsernameRef.current.delete(userId)
      }, 1000)
    }
  }

  // Função para atualizar o perfil do usuário com informações do OAuth
  // REGRA DE OURO: NUNCA sobrescreve um username que já existe no banco, mesmo que seja vazio ou curto
  // Esta função só preenche dados quando o perfil está completamente vazio (primeira vez)
  const updateUserProfile = async (user: import('@supabase/supabase-js').User) => {
    if (!user || !isSupabaseConfigured() || !supabase) return

    try {
      // Primeiro, verifica o estado atual do perfil
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()

      // REGRA DE OURO: Se existe QUALQUER valor em username (mesmo que seja vazio após trim),
      // NUNCA sobrescreve. O username do banco é a verdade absoluta.
      const hasUsernameInDatabase = currentProfile?.username !== null && 
        currentProfile?.username !== undefined &&
        currentProfile.username.trim() !== ''

      // Se já existe um username no banco (mesmo que seja o prefixo do email de antes),
      // NUNCA sobrescreve. O usuário pode ter definido isso manualmente.
      if (hasUsernameInDatabase) {
        return // NUNCA atualiza se já existe username
      }

      // Se o perfil já tem um avatar_url definido pelo usuário, não sobrescreve
      const hasUserDefinedAvatar = currentProfile?.avatar_url && 
        currentProfile.avatar_url.trim() !== ''

      // Extrai informações do user_metadata (vem do OAuth)
      const metadata = user.user_metadata || {}
      // Prioriza metadados do OAuth, mas só se não houver username no banco
      const preferredUsername = 
        metadata.preferred_username || 
        metadata.user_name || 
        metadata.full_name || 
        metadata.name ||
        null
      // Só usa o prefixo do email como último recurso e apenas se não houver username no banco
      const emailPrefix = user.email?.split('@')[0] || null

      const avatarUrl = metadata.avatar_url || metadata.picture || null

      // Prepara os dados para atualização, mantendo valores existentes quando apropriado
      interface ProfileUpdateData {
        username?: string
        avatar_url?: string
      }
      
      const updateData: ProfileUpdateData = {}
      
      // Só atualiza username se NÃO existir no banco (null ou vazio)
      // Prioriza metadados do OAuth, só usa prefixo do email se não houver metadados
      if (!hasUsernameInDatabase) {
        if (preferredUsername) {
          updateData.username = preferredUsername
        } else if (emailPrefix) {
          // Só usa prefixo do email como último recurso para novos usuários
          updateData.username = emailPrefix
        }
      }
      
      // Só atualiza avatar_url se não tiver um definido pelo usuário
      if (!hasUserDefinedAvatar && avatarUrl) {
        updateData.avatar_url = avatarUrl
      }

      // Só faz update se houver algo para atualizar
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id)

        if (error) {
          // Silenciosamente ignora erros - não queremos quebrar o fluxo
        }
      }
    } catch (error) {
      // Silenciosamente ignora erros - não queremos quebrar o fluxo
    }
  }

  // Verifica username quando o usuário muda
  // IMPORTANTE: Removido 'theme' das dependências para evitar chamadas desnecessárias
  // que poderiam sobrescrever o username do usuário
  useEffect(() => {
    if (user && isInitialLoadRef.current) {
      checkUsername(user.id)
      updateUserProfile(user)
      isInitialLoadRef.current = false
    } else if (!user) {
      // Reset quando usuário faz logout
      setHasUsername(null)
      currentUserIdRef.current = null
      setProfileUsername(null)
      setProfileAvatarUrl(null)
      setProfileAvatarBgColor(getDefaultAvatarBgColor(accentColor, theme))
      setProfileLoaded(false)
      isInitialLoadRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]) // Removido 'theme' para evitar atualizações desnecessárias

  // Fecha o dropdown quando clicar fora dele ou quando o dropdown do tema abrir
  useEffect(() => {
    if (!showProfileDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      // Verifica se o clique foi fora do dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false)
      }
    }

    const handleCloseThemeDropdown = () => {
      // Não faz nada - este é o listener para quando o tema abre
    }

    const handleThemeDropdownOpened = () => {
      // Fecha este dropdown quando o tema abrir
      setShowProfileDropdown(false)
    }

    // Adiciona listener apenas para cliques fora
    // NÃO fecha quando muda de aba - isso permite que os botões funcionem quando volta
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('close-profile-dropdown', handleCloseThemeDropdown)
    window.addEventListener('theme-dropdown-opened', handleThemeDropdownOpened)

    // Remove o listener quando o dropdown fecha ou componente desmonta
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('close-profile-dropdown', handleCloseThemeDropdown)
      window.removeEventListener('theme-dropdown-opened', handleThemeDropdownOpened)
    }
  }, [showProfileDropdown])

  const handleSignInWithOAuth = async (provider: 'github' | 'google') => {
    if (!isSupabaseConfigured() || !supabase) {
      setError('Autenticação não disponível. Configure as variáveis de ambiente do Supabase.')
      return
    }
    
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}`,
        },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isSupabaseConfigured() || !supabase) {
      setError('Autenticação não disponível. Configure as variáveis de ambiente do Supabase.')
      return
    }

    // Validação básica
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    // Validação de confirmação de senha (apenas no cadastro)
    if (isSignUp) {
      if (!confirmPassword.trim()) {
        setError('Por favor, confirme sua senha')
        return
      }

      if (password !== confirmPassword) {
        setError('As senhas não coincidem. Verifique e tente novamente.')
        return
      }
    }

    try {
      if (isSignUp) {
        // Cadastro - sempre exige email válido (não aceita username)
        const emailForSignUp = email.trim()
        
        // Valida se é um email válido (deve conter @)
        if (!emailForSignUp.includes('@')) {
          setError('Para criar uma conta, é necessário informar um e-mail válido.')
          return
        }
        
        // Cadastro
        const { data, error } = await supabase.auth.signUp({
          email: emailForSignUp,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}`,
          },
        })
        
        if (error) {
          // Tratamento específico de erros
          if (error.message.includes('already registered') || 
              error.message.includes('already exists') ||
              error.message.includes('User already registered') ||
              error.message.includes('email address has already been registered')) {
            setError('Este email já está cadastrado. Faça login ou use outro email.')
            setIsSignUp(false) // Muda para modo de login
            // Mantém o formulário aberto para o usuário tentar fazer login
          } else if (error.message.includes('Invalid email')) {
            setError('Email inválido. Verifique o formato do email.')
            // Mantém o formulário aberto
          } else if (error.message.includes('Password')) {
            setError('Senha muito fraca. Use pelo menos 6 caracteres.')
            // Mantém o formulário aberto
          } else {
            throw error
          }
          return
        }

        // Verifica se o usuário foi realmente criado
        // IMPORTANTE: O Supabase pode retornar sucesso mesmo para emails existentes (por segurança)
        // Mas não cria sessão se o email já existe
        if (data.user) {
          // Verifica se uma sessão foi criada (indica usuário novo)
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            // Usuário novo: NÃO fazer login automático. Mostrar toast e voltar à aba Login.
            // (Se o Supabase tiver confirmação de email desativada, haverá sessão; mesmo assim
            // não usamos auto-login e pedimos que verifique a caixa de entrada.)
            toast.success('E-mail de confirmação enviado! Verifique sua caixa de entrada.')
            setIsSignUp(false)
            setError(null)
            setSuccess(null)
            setEmail('')
            setPassword('')
            setConfirmPassword('')
            // Encerra sessão para forçar login após confirmar o e-mail
            await supabase.auth.signOut()
            return
          } else {
            // Sem sessão = email provavelmente já existe
            // Tenta fazer login para confirmar
            const { error: loginError } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            })

            if (!loginError) {
              // Conseguiu fazer login = email já existia
              setError(null) // Limpa erro anterior
              setToastMessage('Login realizado com sucesso! Você foi logado automaticamente.')
              setShowToast(true)
              // Fecha o formulário após mostrar a notificação
              setTimeout(() => {
                setShowEmailForm(false)
                setEmail('')
                setPassword('')
                setConfirmPassword('')
              }, 500) // Fecha rapidamente após mostrar a notificação
              // Fecha a notificação após 3 segundos
              setTimeout(() => {
                setShowToast(false)
              }, 3000)
            } else {
              // Não conseguiu fazer login = email existe mas senha está errada
              setError('Este email já está cadastrado, mas a senha está incorreta. Tente fazer login com a senha correta.')
              // Mantém o formulário aberto para o usuário tentar novamente
            }
            setIsSignUp(false) // Muda para modo de login
          }
        } else {
          // Não retornou usuário - email provavelmente já existe
          setError('Este email já está cadastrado. Tente fazer login.')
          setIsSignUp(false)
        }
      } else {
        // Login
        let emailToUse = email.trim() // O valor que o usuário digitou
        
        // Se NÃO tem '@', assumimos que é um username
        if (!emailToUse.includes('@')) {
          try {
            // Busca o email na tabela profiles baseado no username
            // ATENÇÃO: Verifique se a função get_email_by_username existe no Supabase
            // Execute: database/migrations/supabase_get_email_by_username.sql
            const { data: emailData, error: emailError } = await supabase
              .rpc('get_email_by_username', { username_param: emailToUse })
            
            if (emailError) {
              // Se a função RPC não existir, mostra erro informativo
              if (emailError.message?.includes('function') || emailError.message?.includes('does not exist')) {
                setError('Função de busca não configurada. Entre em contato com o suporte ou use seu email para fazer login.')
              } else {
                setError('Nome de usuário incorreto. Verifique e tente novamente.')
              }
              return
            }
            
            // Se a função retornou null ou string vazia, o username não existe
            if (!emailData || (typeof emailData === 'string' && emailData.trim() === '')) {
              setError('Nome de usuário incorreto. Verifique e tente novamente.')
              return
            }
            
            // A função retorna uma string (email) diretamente
            emailToUse = typeof emailData === 'string' ? emailData : String(emailData)
          } catch (err) {
            // Se a função RPC não existir, mostra erro informativo
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
            if (errorMessage.includes('function') || errorMessage.includes('does not exist')) {
              setError('Função de busca não configurada. Entre em contato com o suporte ou use seu email para fazer login.')
            } else {
              setError('Erro ao buscar usuário. Tente novamente ou use seu email.')
            }
            return
          }
        }
        
        // Faz o login normal usando o email resolvido (ou o original)
        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        })
        
        if (error) {
          if (error.message.includes('Invalid login credentials') ||
              error.message.includes('Invalid email or password')) {
            setError('E-mail/usuário ou senha incorretos. Verifique suas credenciais.')
          } else if (error.message.includes('Email not confirmed')) {
            setError('Email não confirmado. Verifique sua caixa de entrada.')
          } else {
            throw error
          }
          return
        }
        
        setShowEmailForm(false)
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na autenticação'
      setError(errorMessage)
    }
  }

  const handleSignOut = useCallback(async () => {
    try {
      await contextSignOut()
      setShowProfileDropdown(false)
      toast.success('Logout realizado com sucesso!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao sair'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [contextSignOut])
  
  // Atualiza o ref do handleSignOut sempre que a função mudar
  useEffect(() => {
    handleSignOutClickRef.current = handleSignOut
  }, [handleSignOut])

  // Ref para rastrear o último userId que foi carregado
  const lastLoadedUserIdRef = useRef<string | null>(null)

  // Escuta eventos de atualização de perfil para invalidar cache e recarregar
  useEffect(() => {
    const handleProfileUpdate = async (event: CustomEvent) => {
      const { userId } = event.detail
      // Se o perfil atualizado é do usuário atual, recarrega imediatamente do banco
      if (user && userId === user.id && isSupabaseConfigured() && supabase) {
        // Limpa o cache para forçar uma nova busca
        lastLoadedUserIdRef.current = null
        setProfileLoaded(false)
        // Limpa também o checkingUsernameRef para permitir nova busca imediata
        checkingUsernameRef.current.delete(userId)
        
        // Recarrega imediatamente do banco para garantir que temos o username atualizado
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_url, avatar_bg_color')
            .eq('id', userId)
            .single()
          
          if (!error && data) {
            // Atualiza com os dados mais recentes do banco
            const username = data?.username && data.username.trim() !== '' ? data.username.trim() : null
            setProfileUsername(username)
            setProfileAvatarUrl(data?.avatar_url || null)
            setProfileAvatarBgColor(data?.avatar_bg_color || getDefaultAvatarBgColor(accentColor, theme))
            lastLoadedUserIdRef.current = userId
            setProfileLoaded(true)
            // Atualiza também o hasUsername
            await checkUsername(userId)
          }
        } catch (err) {
          // Em caso de erro, apenas marca como carregado para evitar loops
          setProfileLoaded(true)
        }
      }
    }

    const listener = (evt: Event) => { void handleProfileUpdate(evt as CustomEvent) }
    window.addEventListener('profile-updated', listener)

    return () => {
      window.removeEventListener('profile-updated', listener)
    }
  }, [user, theme, accentColor])

  // Busca username e avatar do perfil quando o usuário muda
  useEffect(() => {
    // Se não há usuário ou Supabase não está configurado
    if (!user || !isSupabaseConfigured() || !supabase) {
      // Se já estava sem usuário, não precisa fazer nada
      if (!user && lastLoadedUserIdRef.current === null) {
        return
      }
      // Limpa o estado apenas se mudou de ter usuário para não ter
      if (lastLoadedUserIdRef.current !== null) {
        lastLoadedUserIdRef.current = null
        setProfileUsername(null)
        setProfileAvatarUrl(null)
        setProfileAvatarBgColor(getDefaultAvatarBgColor(accentColor, theme))
        setProfileLoaded(true) // Marca como carregado
      }
      return
    }

    const currentUserId = user.id

    // Se é o mesmo usuário que já foi carregado E já temos os dados do perfil (username não é null e não é vazio), não busca novamente
    // Isso evita buscas desnecessárias quando apenas o token é atualizado
    // MAS se profileLoaded é false, força uma nova busca (pode ter sido invalidado pelo evento profile-updated)
    if (lastLoadedUserIdRef.current === currentUserId && profileUsername && profileUsername.trim() !== '' && profileLoaded) {
      return
    }

    // Evita múltiplas chamadas simultâneas para o mesmo usuário
    // MAS limpa se for um usuário diferente (pode ser resíduo de busca anterior)
    if (checkingUsernameRef.current.has(currentUserId)) {
      // Se o lastLoadedUserId é diferente ou null, significa que mudou de usuário ou é primeira vez
      // então limpa o set para permitir nova busca
      if (lastLoadedUserIdRef.current !== currentUserId) {
        checkingUsernameRef.current.clear()
      } else {
        return
      }
    }

    // Se chegou aqui, precisa buscar o perfil
    // Pode ser um novo usuário ou uma recarga da página onde o perfil ainda não foi carregado
    setProfileLoaded(false)
    checkingUsernameRef.current.add(currentUserId)

    const fetchProfile = async () => {
      try {
        if (!supabase) return
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, avatar_bg_color')
          .eq('id', currentUserId)
          .single()

        // Verifica se ainda é o mesmo usuário antes de atualizar o estado
        // Isso evita atualizar o estado se o usuário mudou durante a busca
        if (currentUserId !== user?.id) {
          checkingUsernameRef.current.delete(currentUserId)
          return
        }

        if (error) {
          setProfileUsername(null)
          setProfileAvatarUrl(null)
          setProfileAvatarBgColor(getDefaultAvatarBgColor(accentColor, theme))
          lastLoadedUserIdRef.current = currentUserId // Marca como carregado mesmo sem dados
          setProfileLoaded(true) // Marca como carregado
        } else {
          // Sempre atualiza os dados, mesmo se forem null
          // Trata strings vazias como null
          const username = data?.username && data.username.trim() !== '' ? data.username.trim() : null
          setProfileUsername(username)
          setProfileAvatarUrl(data?.avatar_url || null)
          setProfileAvatarBgColor(data?.avatar_bg_color || getDefaultAvatarBgColor(accentColor, theme))
          lastLoadedUserIdRef.current = currentUserId // Marca este usuário como carregado
          setProfileLoaded(true) // Marca como carregado
        }
      } catch (error) {
        // Verifica se ainda é o mesmo usuário antes de atualizar
        if (currentUserId === user?.id) {
          lastLoadedUserIdRef.current = currentUserId // Marca mesmo em caso de erro para evitar loops
          setProfileLoaded(true) // Marca como carregado mesmo em caso de erro
        }
      } finally {
        checkingUsernameRef.current.delete(currentUserId)
      }
    }
    
    fetchProfile()
    
    // Cleanup: limpa o checkingUsernameRef quando o usuário muda ou componente desmonta
    return () => {
      // Não limpa completamente aqui porque pode estar em uso
      // Mas remove o usuário atual se ele mudar
      if (user?.id) {
        checkingUsernameRef.current.delete(user.id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, theme, profileLoaded]) // Inclui profileLoaded para recarregar quando cache é invalidado
    // Nota: profileUsername não está nas dependências para evitar loops infinitos

  if (authLoading) {
    return (
      <div className="p-2">
        <div className={`w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin`} style={{ borderColor: styles.accent.color }} />
      </div>
    )
  }

  if (user) {
    // REGRA DE OURO: O username do banco (profiles) é a verdade absoluta
    // NUNCA usa o email como fallback se o perfil foi carregado e não tem username
    // Isso garante que se o usuário definiu um username, ele será sempre exibido
    // Se o perfil foi carregado e não tem username, mostra "Usuário" (não o email)
    // O email só é usado como fallback visual se o perfil ainda não foi carregado
    const displayName = profileUsername && profileUsername.trim() !== ''
      ? profileUsername  // Prioridade 1: Username do banco
      : (profileLoaded 
          ? 'Usuário'  // Perfil carregado mas sem username - não usa email
          : (user.email?.split('@')[0] || 'Carregando...'))  // Apenas enquanto carrega
    
    const avatarUrl = profileLoaded 
      ? (profileAvatarUrl || 
         (profileUsername ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(profileUsername)}` : null))
      : null

    return (
      <>
        <div className="flex items-center gap-2 relative" ref={dropdownRef}>
          {/* Alerta se não tem username */}
          {hasUsername === false && (
            <motion.button
              onClick={() => setShowUpdateProfile(true)}
              className={`p-2 ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
              style={{
                backgroundColor: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
                color: 'var(--color-warning)',
                willChange: 'transform, opacity'
              }}
              whileHover={{ scale: 1.05, opacity: 0.8 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              aria-label="Definir nickname"
              title="Clique para definir seu nickname"
            >
              <AlertCircle className="w-4 h-4" />
            </motion.button>
          )}
          
          {/* Botão do perfil - abre/fecha dropdown */}
          <motion.button
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowProfileDropdown(prev => {
                const newValue = !prev
                // Fecha o dropdown do tema se este abrir
                if (newValue) {
                  window.dispatchEvent(new CustomEvent('close-theme-dropdown'))
                  window.dispatchEvent(new CustomEvent('profile-dropdown-opened'))
                }
                return newValue
              })
            }}
            className={`flex items-center gap-2 px-3 py-2 border ${borderRadiusClass} relative z-30 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
            style={{ 
              pointerEvents: 'auto',
              willChange: 'transform',
              backgroundColor: styles.bg.card,
              borderColor: styles.border.color
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            aria-label="Perfil do usuário"
            aria-expanded={showProfileDropdown}
            type="button"
          >
            {avatarUrl ? (
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: profileAvatarBgColor }}
              >
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: profileAvatarBgColor }}
              >
                <User className="w-4 h-4" style={{ color: styles.accent.text }} />
              </div>
            )}
            <span className={`text-sm font-medium hidden sm:inline`} style={{ color: styles.text.primary }}>
              {displayName}
            </span>
          </motion.button>

          {/* Dropdown do perfil */}
          <AnimatePresence>
            {showProfileDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`absolute top-full right-0 mt-2 border-2 ${borderRadiusClass} shadow-theme min-w-[180px] z-[9999] overflow-hidden`}
                style={{
                  backgroundColor: styles.bg.card,
                  borderColor: styles.border.color,
                  pointerEvents: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="py-2">
                  <motion.button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowProfileDropdown(false)
                      if (onOpenProfile) {
                        onOpenProfile()
                      } else {
                        // Fallback: comportamento antigo se a prop não for fornecida
                        setShowUpdateProfile(true)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium border-b cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                    style={{ 
                      willChange: 'transform, background-color',
                      borderColor: styles.border.color,
                      color: styles.text.primary
                    }}
                    whileHover={{ 
                      backgroundColor: theme === 'cyberpunk' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : theme === 'zen'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.05)'
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    type="button"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar Perfil</span>
                  </motion.button>
                  <motion.button
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowProfileDropdown(false)
                      if (onOpenAchievements) {
                        onOpenAchievements()
                      } else {
                        // Fallback: comportamento antigo se a prop não for fornecida
                        handleBadgesClickRef.current()
                      }
                    }}
                    className={`w-full flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 border ${borderRadiusClass} shadow-theme text-xs sm:text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                    style={{ 
                      pointerEvents: 'auto', 
                      willChange: 'transform, opacity',
                      backgroundColor: styles.bg.card,
                      borderColor: styles.border.color,
                      color: styles.text.primary
                    }}
                    whileHover={{ scale: 1.05, opacity: 0.9 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ 
                      type: 'spring', 
                      stiffness: 400, 
                      damping: 17,
                      opacity: { duration: 0.5, ease: 'easeInOut' }
                    }}
                    type="button"
                  >
                    <Trophy className="w-4 h-4" style={{ color: styles.text.primary }} />
                    <span style={{ color: styles.text.primary }}>Conquistas</span>
                  </motion.button>
                  <motion.button
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Usa ref estável para garantir que sempre funciona
                      handleSignOutClickRef.current()
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                    style={{ 
                      pointerEvents: 'auto',
                      willChange: 'transform, background-color',
                      color: styles.text.primary
                    }}
                    whileHover={{ 
                      backgroundColor: theme === 'cyberpunk' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : theme === 'zen'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.05)'
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    type="button"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Desconectar</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Modal de Conquistas */}
        <BadgesGallery
          isOpen={showBadgesGallery}
          onClose={() => setShowBadgesGallery(false)}
          currentUser={user}
        />

        {/* Modal de atualização de perfil */}
        <UpdateProfile
          isOpen={showUpdateProfile}
          onClose={() => setShowUpdateProfile(false)}
          initialUsername={profileUsername}
          initialAvatarUrl={profileAvatarUrl}
          initialAvatarBgColor={profileAvatarBgColor}
          onUpdate={async () => {
            if (!isSupabaseConfigured() || !supabase) {
              return
            }
            
            try {
              // Usa o usuário do contexto (já está carregado)
              if (!user) {
                return
              }
              const currentUser = user
              
              // Guarda o username anterior para comparar depois
              const previousUsername = profileUsername
              
              // Recarrega os dados do perfil do banco após salvar
              // Usa um pequeno delay para garantir que o banco foi atualizado
              await new Promise(resolve => setTimeout(resolve, 200))
              
              // Reseta o ref para forçar uma nova busca
              lastLoadedUserIdRef.current = null
              
              // Força uma nova consulta ao banco (sem cache)
              const { data, error } = await supabase
                .from('profiles')
                .select('username, avatar_url, avatar_bg_color')
                .eq('id', currentUser.id)
                .single()
              
              if (error) {
                setProfileLoaded(true)
              } else if (data) {
                const newUsername = data.username || null
                
                // Verifica se o username foi alterado
                const usernameChanged = previousUsername !== newUsername && 
                                       previousUsername !== null && 
                                       newUsername !== null &&
                                       previousUsername.trim() !== newUsername.trim()
                
                // Atualiza todos os estados do perfil com os dados salvos
                setProfileUsername(newUsername)
                setProfileAvatarUrl(data.avatar_url || null)
                setProfileAvatarBgColor(data.avatar_bg_color || getDefaultAvatarBgColor(accentColor, theme))
                // Marca como carregado
                setProfileLoaded(true)
                // Atualiza também o hasUsername para refletir o novo estado
                await checkUsername(currentUser.id)
                // Atualiza o ref para evitar buscas desnecessárias
                lastLoadedUserIdRef.current = currentUser.id
                
                // Mostra notificação se o username foi alterado
                if (usernameChanged) {
                  setToastMessage('Nickname editado com sucesso!')
                  setShowToast(true)
                  // Fecha a notificação após 3 segundos
                  setTimeout(() => {
                    setShowToast(false)
                  }, 3000)
                }
              }
            } catch (err) {
              setProfileLoaded(true)
            }
          }}
        />

        {/* Notificação Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
              animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
              exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="fixed top-4 left-1/2 z-[200] transform -translate-x-1/2"
            >
              <div 
                className="rounded-button shadow-lg px-5 py-3.5 flex items-center gap-3 min-w-[320px] max-w-[90vw] backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--toast-bg)',
                  border: '2px solid var(--toast-border)',
                }}
              >
                <CheckCircle2 
                  className="w-5 h-5 flex-shrink-0" 
                  style={{ color: 'var(--toast-icon)' }}
                />
                <p 
                  className="font-medium text-sm flex-1"
                  style={{ color: 'var(--toast-text)' }}
                >
                  {toastMessage}
                </p>
                <button
                  onClick={() => setShowToast(false)}
                  className="transition-colors flex-shrink-0 text-lg leading-none hover:opacity-70"
                  style={{ color: 'var(--toast-icon)' }}
                  aria-label="Fechar notificação"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  // Usuário não logado
  if (showEmailForm) {
    return (
      <AnimatePresence>
        {showEmailForm && (
          <>
            {/* Backdrop: só fecha em clique explícito no overlay (evita fechar ao soltar após mousedown no card) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(e) => { if (e.target === e.currentTarget) mouseDownOnBackdropRef.current = true }}
              onClick={(e) => {
                if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) setShowEmailForm(false)
                mouseDownOnBackdropRef.current = false
              }}
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
                className={`glass border-2 border-skin-border ${borderRadiusClass} shadow-theme max-w-md w-full overflow-hidden pointer-events-auto`}
                style={{ willChange: 'transform, opacity' }}
                onMouseDown={() => { mouseDownOnBackdropRef.current = false }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-skin-border">
                  <h3 className="text-lg sm:text-xl font-bold text-skin-text">
                    {isSignUp ? 'Criar Conta' : 'Entrar'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowEmailForm(false)
                      setError(null)
                      setSuccess(null)
                      setEmail('')
                      setPassword('')
                      setConfirmPassword('')
                    }}
                    className={`p-2 ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text hover:bg-skin-surface-hover transition-colors`}
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                      <label htmlFor="email-input" className="block text-sm font-semibold text-skin-text mb-2">
                        {isSignUp ? 'E-mail' : 'E-mail ou Usuário'}
                      </label>
                      <input
                        id="email-input"
                        type={isSignUp ? 'email' : 'text'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={isSignUp ? 'seu@email.com' : 'seu@email.com ou seu_usuario'}
                        required
                        className={`w-full px-4 py-3 border-2 border-skin-border ${borderRadiusClass} focus:outline-none focus:ring-2 focus:ring-skin-accent focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text bg-transparent placeholder-skin-muted text-sm`}
                        style={{
                          borderColor: styles.border.color,
                          color: styles.text.primary,
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="password-input" className="block text-sm font-semibold text-skin-text mb-2">
                        Senha
                      </label>
                      <input
                        id="password-input"
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setError(null)
                        }}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                        className={`w-full px-4 py-3 border-2 border-skin-border ${borderRadiusClass} focus:outline-none focus:ring-2 focus:ring-skin-accent focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text bg-transparent placeholder-skin-muted text-sm`}
                        style={{
                          borderColor: styles.border.color,
                          color: styles.text.primary,
                        }}
                      />
                    </div>

                    {isSignUp && (
                      <div>
                        <label htmlFor="confirm-password-input" className="block text-sm font-semibold text-skin-text mb-2">
                          Confirmar Senha
                        </label>
                        <input
                          id="confirm-password-input"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            setError(null)
                          }}
                          placeholder="Digite a senha novamente"
                          required
                          minLength={6}
                          className={`w-full px-4 py-3 border-2 ${borderRadiusClass} focus:outline-none focus:ring-2 focus:ring-skin-accent focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text bg-transparent placeholder-skin-muted text-sm`}
                          style={{
                            borderColor: password && confirmPassword && password !== confirmPassword
                              ? styles.states.error
                              : styles.border.color,
                            color: styles.text.primary,
                          }}
                        />
                        {password && confirmPassword && password !== confirmPassword && (
                          <p 
                            className="mt-1 text-xs"
                            style={{ color: styles.states.error }}
                          >
                            As senhas não coincidem
                          </p>
                        )}
                      </div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-sm p-3 ${borderRadiusClass} font-medium`}
                        style={{
                          color: styles.states.error,
                          backgroundColor: styles.states.errorBg,
                          border: `1px solid ${styles.states.errorBorder}`,
                        }}
                      >
                        {error}
                      </motion.div>
                    )}

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-sm p-3 ${borderRadiusClass} font-medium`}
                        style={{
                          color: styles.states.success,
                          backgroundColor: styles.states.successBg,
                          border: `1px solid ${styles.states.successBorder}`,
                        }}
                      >
                        {success}
                      </motion.div>
                    )}

                    <div className="flex gap-3">
                      <motion.button
                        type="submit"
                        className={`flex-1 px-6 py-3 ${borderRadiusClass} font-bold text-sm shadow-theme outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                        style={{
                          backgroundColor: styles.accent.color,
                          color: theme === 'cyberpunk' ? '#000000' : styles.accent.text,
                          willChange: 'transform'
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      >
                        {isSignUp ? 'Cadastrar' : 'Entrar'}
                      </motion.button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp)
                        setError(null)
                        setSuccess(null)
                        setConfirmPassword('') // Limpa confirmação ao trocar modo
                      }}
                      className={`text-sm text-skin-muted w-full text-center py-2 ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                      style={{ color: styles.text.secondary }}
                    >
                      {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar'}
                    </button>

                    {/* Divisor */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px" style={{ backgroundColor: styles.border.color }}></div>
                      <span className="text-xs text-skin-muted" style={{ color: styles.text.secondary }}>ou</span>
                      <div className="flex-1 h-px" style={{ backgroundColor: styles.border.color }}></div>
                    </div>

                    {/* Botões OAuth */}
                    <div className="flex flex-col gap-2">
                      <motion.button
                        type="button"
                        onClick={() => handleSignInWithOAuth('github')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 border-2 ${borderRadiusClass} font-semibold text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                        style={{ 
                          willChange: 'transform',
                          backgroundColor: styles.bg.card,
                          borderColor: styles.border.color,
                          color: styles.text.primary
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      >
                        <Github className="w-5 h-5" />
                        <span>Continuar com GitHub</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={() => handleSignInWithOAuth('google')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 border-2 ${borderRadiusClass} font-semibold text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                        style={{ 
                          willChange: 'transform',
                          backgroundColor: styles.bg.card,
                          borderColor: styles.border.color,
                          color: styles.text.primary
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span>Continuar com Google</span>
                      </motion.button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <>
      <div className="relative z-30">
        <motion.button
          onClick={() => setShowEmailForm(true)}
          className={`flex items-center gap-2 px-4 py-2 ${borderRadiusClass} text-sm font-semibold shadow-theme outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
          style={{ 
            backgroundColor: styles.accent.color,
            color: theme === 'cyberpunk' ? '#000000' : styles.accent.text,
            willChange: 'transform' 
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <LogIn className="w-4 h-4" />
          <span>Login</span>
        </motion.button>
      </div>

      {/* Notificação Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-1/2 left-1/2 z-[200] transform -translate-x-1/2 -translate-y-1/2"
          >
            <div 
              className="rounded-button shadow-lg px-5 py-3.5 flex items-center gap-3 min-w-[320px] max-w-[90vw] backdrop-blur-sm"
              style={{
                backgroundColor: 'var(--toast-bg)',
                border: '2px solid var(--toast-border)',
              }}
            >
              <CheckCircle2 
                className="w-5 h-5 flex-shrink-0" 
                style={{ color: 'var(--toast-icon, #22c55e)' }}
              />
              <p 
                className="font-medium text-sm flex-1"
                style={{ color: 'var(--toast-text, #166534)' }}
              >
                {toastMessage}
              </p>
              <button
                onClick={() => setShowToast(false)}
                className="transition-colors flex-shrink-0 text-lg leading-none hover:opacity-70"
                style={{ color: 'var(--toast-icon, #22c55e)' }}
                aria-label="Fechar notificação"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
