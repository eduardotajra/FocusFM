import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Save, RefreshCw } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

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

interface UpdateProfileProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => Promise<void> | void
  initialUsername?: string | null
  initialAvatarUrl?: string | null
  initialAvatarBgColor?: string | null
  renderContentOnly?: boolean // Se true, renderiza apenas o conteúdo sem backdrop/modal
}

export const UpdateProfile = ({ 
  isOpen, 
  onClose, 
  onUpdate,
  initialUsername,
  initialAvatarUrl,
  initialAvatarBgColor,
  renderContentOnly = false
}: UpdateProfileProps) => {
  const { theme, styles, getBorderRadiusClass } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  const accentColor = styles.accent.color
  const { user } = useAuth() // Usa o contexto de autenticação
  const [username, setUsername] = useState('')
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  
  // Função helper para obter a cor padrão do avatar baseada no tema
  // Usa uma variação da cor accent de cada tema
  const getThemeDefaultColor = (): string => {
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
  
  const [avatarBgColor, setAvatarBgColor] = useState<string>(() => getThemeDefaultColor())
  const [isLoadingProfile, setIsLoadingProfile] = useState(false) // Loading específico para dados do perfil
  const [error, setError] = useState<string | null>(null)
  
  // Ref para rastrear se já carregamos os dados uma vez neste modal
  const hasLoadedDataRef = useRef(false)
  // Ref para evitar múltiplas chamadas de fechamento
  const isClosingRef = useRef(false)

  // Função getThemeDefaultColor já definida acima - usando variação da cor accent

  const bgColors = [
    { name: 'Roxo', value: '#c084fc' },
    { name: 'Azul', value: '#60a5fa' },
    { name: 'Verde', value: '#34d399' },
    { name: 'Rosa', value: '#f472b6' },
    { name: 'Amarelo', value: '#fbbf24' },
    { name: 'Laranja', value: '#fb923c' },
    { name: 'Vermelho', value: '#f87171' },
    { name: 'Ciano', value: '#22d3ee' },
    { name: 'Branco', value: '#ffffff' },
    { name: 'Preto', value: '#000000' },
  ]

  useEffect(() => {
    if (!isOpen) {
      // Quando o modal fecha, reseta os flags mas preserva os dados
      hasLoadedDataRef.current = false
      isClosingRef.current = false
      setIsLoadingProfile(false) // Garante que loading está false quando fecha
      setError(null) // Limpa erros quando fecha
      return
    }

    // Quando o modal abre, reseta TODOS os flags e estados para garantir funcionamento correto
    isClosingRef.current = false
    setIsLoadingProfile(false) // Garante que loading está false quando abre
    setError(null) // Limpa erros quando abre

    // Sempre usa dados iniciais primeiro quando o modal abre (se disponíveis)
    // Isso garante que os dados apareçam imediatamente mesmo se a busca do banco demorar
    if (initialUsername !== undefined && initialUsername !== null && initialUsername.trim() !== '') {
      setUsername(initialUsername)
      setCurrentUsername(initialUsername)
    }
    if (initialAvatarUrl !== undefined && initialAvatarUrl !== null) {
      setAvatarUrl(initialAvatarUrl)
    }
    if (initialAvatarBgColor !== undefined && initialAvatarBgColor !== null) {
      setAvatarBgColor(initialAvatarBgColor)
    }

    // Se já carregamos antes e temos dados iniciais, não busca novamente
    if (hasLoadedDataRef.current && (initialUsername || initialAvatarUrl || initialAvatarBgColor)) {
      return
    }

    if (!isSupabaseConfigured() || !supabase) {
      // Se temos dados iniciais, usa eles mesmo sem Supabase
      if (initialUsername) {
        setUsername(initialUsername)
        setCurrentUsername(initialUsername)
      }
      if (initialAvatarUrl) {
        setAvatarUrl(initialAvatarUrl)
      }
      if (initialAvatarBgColor) {
        setAvatarBgColor(initialAvatarBgColor)
      }
      return
    }
    
    // Se não há usuário do contexto, não faz nada
    if (!user) {
      // Se temos dados iniciais, usa eles mesmo sem usuário
      if (initialUsername) {
        setUsername(initialUsername)
        setCurrentUsername(initialUsername)
      }
      if (initialAvatarUrl) {
        setAvatarUrl(initialAvatarUrl)
      }
      if (initialAvatarBgColor) {
        setAvatarBgColor(initialAvatarBgColor)
      }
      return
    }

    let isCancelled = false
    
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true)
        
        if (!supabase) {
          setIsLoadingProfile(false)
          hasLoadedDataRef.current = true
          return
        }

        // Busca o perfil atual com retry em caso de erro
        let profile = null
        let profileError: { code?: string; message?: string } | null = null
        
        try {
          if (!supabase || !user) return
          const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_url, avatar_bg_color')
            .eq('id', user.id)
            .single()
          
          profile = data
          profileError = error as { code?: string; message?: string } | null
        } catch (err) {
          await new Promise(resolve => setTimeout(resolve, 500))
          
          if (!isCancelled && supabase) {
            try {
              const { data: retryData, error: retryError } = await supabase
                .from('profiles')
                .select('username, avatar_url, avatar_bg_color')
                .eq('id', user.id)
                .single()
              
              profile = retryData
              profileError = retryError
            } catch (retryErr) {
              profileError = retryErr as { code?: string; message?: string }
            }
          }
        }

        if (isCancelled) return

        if (profileError && profileError.code !== 'PGRST116') {
          if (initialUsername) {
            setUsername(initialUsername)
            setCurrentUsername(initialUsername)
          }
          if (initialAvatarUrl) {
            setAvatarUrl(initialAvatarUrl)
          }
          if (initialAvatarBgColor) {
            setAvatarBgColor(initialAvatarBgColor)
          }
          hasLoadedDataRef.current = true
          return
        }

        // Define o username - prioriza dados do banco, depois dados iniciais
        if (profile?.username && profile.username.trim() !== '') {
          setUsername(profile.username)
          setCurrentUsername(profile.username)
        } else if (initialUsername && initialUsername.trim() !== '') {
          setUsername(initialUsername)
          setCurrentUsername(initialUsername)
        } else {
          // Sugere um username baseado no email ou metadados
          const suggested = 
            user.user_metadata?.preferred_username ||
            user.user_metadata?.user_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            ''
          setUsername(suggested || '')
          setCurrentUsername(suggested || null)
        }

        // Carrega o avatar atual - prioriza dados do banco, depois dados iniciais
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url)
        } else if (initialAvatarUrl) {
          setAvatarUrl(initialAvatarUrl)
        } else {
          const usernameForAvatar = profile?.username || user.email?.split('@')[0] || 'user'
          const generatedAvatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(usernameForAvatar)}`
          setAvatarUrl(generatedAvatar)
        }

        // Carrega a cor de fundo do avatar - prioriza dados do banco, depois dados iniciais
        setAvatarBgColor(profile?.avatar_bg_color || initialAvatarBgColor || getThemeDefaultColor())
        
        hasLoadedDataRef.current = true
      } catch (error) {
        if (!isCancelled) {
          // Em caso de erro, usa dados iniciais se disponíveis
          if (initialUsername) {
            setUsername(initialUsername)
            setCurrentUsername(initialUsername)
          }
          if (initialAvatarUrl) {
            setAvatarUrl(initialAvatarUrl)
          }
          if (initialAvatarBgColor) {
            setAvatarBgColor(initialAvatarBgColor)
          }
          hasLoadedDataRef.current = true
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false)
        }
      }
    }

    fetchProfile()

    return () => {
      isCancelled = true
    }
  }, [isOpen, theme, initialUsername, initialAvatarUrl, initialAvatarBgColor, user])

  const handleGenerateAvatar = () => {
    // Usa o username atual ou fallback para email ou 'user'
    const baseUsername = username.trim() || user?.email?.split('@')[0] || 'user'
    // Adiciona um número aleatório ao seed para gerar um avatar diferente a cada clique
    const randomSeed = Math.random().toString(36).substring(2, 15)
    const usernameForAvatar = `${baseUsername}_${randomSeed}`
    // Adiciona timestamp para forçar reload da imagem
    const timestamp = Date.now()
    const generatedAvatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(usernameForAvatar)}&t=${timestamp}`
    setAvatarUrl(generatedAvatar)
    setError(null)
  }

  const handleSave = useCallback(async (e?: React.FormEvent | React.MouseEvent) => {
    // Permite chamar sem evento (quando chamado diretamente do onClick)
    if (e && 'preventDefault' in e) {
      e.preventDefault()
    }
    
    // Evita múltiplas chamadas simultâneas
    // Se os flags estão inconsistentes (pode acontecer após mudança de aba), reseta e bloqueia
    // O usuário precisará clicar novamente, mas agora funcionará
    if (isLoadingProfile || isClosingRef.current) {
      // Reseta os flags para permitir próxima tentativa
      setIsLoadingProfile(false)
      isClosingRef.current = false
      setError('Estado inconsistente detectado. Por favor, tente salvar novamente.')
      return
    }
    
    if (!isSupabaseConfigured() || !supabase) {
      setError('Supabase não está configurado. Não é possível salvar o perfil.')
      return
    }
    
    // Usa o usuário do contexto (já está carregado e atualizado)
    if (!user) {
      setError('Usuário não encontrado. Faça login novamente.')
      return
    }
    
    // Verifica se o username tem conteúdo válido (após trim)
    // Também verifica se não é apenas espaços em branco
    const trimmedUsername = (username || '').trim()
    if (!trimmedUsername || trimmedUsername.length === 0) {
      setError('Por favor, insira um nickname')
      return
    }

    // Validação básica
    if (trimmedUsername.length < 3) {
      setError('O nickname deve ter pelo menos 3 caracteres')
      return
    }

    if (username.length > 20) {
      setError('O nickname deve ter no máximo 20 caracteres')
      return
    }

    // Validação de caracteres permitidos (letras, números, underscore, hífen)
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      setError('O nickname só pode conter letras, números, underscore (_) e hífen (-)')
      return
    }

    // Validação de URL do avatar (se fornecido)
    if (avatarUrl.trim() && !avatarUrl.trim().startsWith('http://') && !avatarUrl.trim().startsWith('https://')) {
      setError('A URL do avatar deve começar com http:// ou https://')
      return
    }

    setIsLoadingProfile(true)
    setError(null)

    try {
      // Mantém o avatar atual, não regenera baseado no username
      const finalAvatarUrl = avatarUrl.trim() || null

      // Tenta atualizar com avatar_bg_color primeiro
      interface ProfileUpdateData {
        username: string
        avatar_url: string | null
        avatar_bg_color?: string
      }
      
      const updateData: ProfileUpdateData = {
        username: trimmedUsername,
        avatar_url: finalAvatarUrl,
        avatar_bg_color: avatarBgColor
      }

      // Atualiza o perfil
      let { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      // Se der erro porque a coluna não existe, tenta sem ela
      if (updateError && (updateError.message.includes('column') || updateError.message.includes('does not exist'))) {
        // Remove avatar_bg_color e tenta novamente
        const { avatar_bg_color: _, ...updateDataWithoutBgColor } = updateData
        const { error: retryError } = await supabase
          .from('profiles')
          .update(updateDataWithoutBgColor)
          .eq('id', user.id)
        
        if (retryError) {
          updateError = retryError
        } else {
          updateError = null
        }
      }

      if (updateError) {
        setIsLoadingProfile(false)
        if (updateError.code === '23505') {
          // Violação de constraint única
          setError('Este nickname já está em uso. Escolha outro.')
          return
        } else {
          // Mostra mensagem de erro mais detalhada
          const errorMsg = updateError.message || updateError.details || 'Erro desconhecido'
          setError(`Erro ao salvar: ${errorMsg}. Verifique se a coluna avatar_bg_color existe no banco de dados.`)
          return
        }
      }
      
      // Sucesso - aguarda um pouco para garantir que o banco foi atualizado
      // Pequeno delay para garantir que o banco foi atualizado antes de recarregar
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Reseta o flag de fechamento
      isClosingRef.current = false
      
      // Chama onUpdate e aguarda sua conclusão (se for uma Promise)
      // Com timeout para evitar travamento infinito
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      
      try {
        const updateResult = onUpdate()
        if (updateResult instanceof Promise) {
          // Cria um timeout que garante que o loading seja desativado após 5 segundos
          timeoutId = setTimeout(() => {
            if (!isClosingRef.current) {
              isClosingRef.current = true
              setIsLoadingProfile(false)
              onClose()
            }
          }, 5000)
          
          try {
            await updateResult
            // Se completou com sucesso, cancela o timeout
            if (timeoutId) {
              clearTimeout(timeoutId)
            }
          } catch (updateError) {
            if (timeoutId) {
              clearTimeout(timeoutId)
            }
          }
        }
      } catch (updateError) {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
      
      // Sempre fecha o modal e desativa loading (só se ainda não fechou)
      if (!isClosingRef.current) {
        isClosingRef.current = true
        setIsLoadingProfile(false)
        onClose()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao salvar perfil'
      setError(`Erro ao salvar perfil: ${errorMessage}`)
      setIsLoadingProfile(false)
    }
  }, [username, avatarUrl, avatarBgColor, isLoadingProfile, onUpdate, onClose, user])

  // Função para renderizar o formulário (reutilizável)
  // Definida depois de handleSave para evitar problemas de referência
  const renderForm = () => (
    <form 
      onSubmit={(e) => {
        handleSave(e)
      }} 
      className="p-6 space-y-4"
    >
      {/* Avatar Preview e Edição */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Avatar
        </label>
        <div className="flex items-center gap-4 mb-3">
          <div className="relative">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-border overflow-hidden"
              style={{ backgroundColor: avatarBgColor }}
            >
              <img
                key={avatarUrl} // Força re-render quando avatarUrl muda
                src={avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username.trim() || user?.email?.split('@')[0] || 'user')}`}
                alt="Avatar preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback para avatar padrão se a imagem falhar
                  const target = e.target as HTMLImageElement
                  const fallbackUsername = username.trim() || user?.email?.split('@')[0] || 'user'
                  target.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(fallbackUsername)}`
                }}
              />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value)
                setError(null)
              }}
              placeholder="URL da imagem ou deixe vazio para gerar automaticamente"
              className="w-full px-4 py-2 bg-bg border-2 border-border rounded-button text-text placeholder-muted focus:outline-none focus:border-primary transition-colors text-sm"
              disabled={isLoadingProfile}
            />
            <motion.button
              type="button"
              onClick={handleGenerateAvatar}
              className={`flex items-center gap-2 px-3 py-1.5 border ${borderRadiusClass} text-text text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
              style={{ 
                willChange: 'transform',
                backgroundColor: styles.bg.card,
                borderColor: styles.border.color,
                color: styles.text.primary
              }}
              whileHover={{ scale: isLoadingProfile ? 1 : 1.05 }}
              whileTap={{ scale: isLoadingProfile ? 1 : 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              disabled={isLoadingProfile}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Gerar Avatar Automático</span>
            </motion.button>
          </div>
        </div>
        <p className="text-xs text-muted">
          Cole uma URL de imagem ou deixe vazio para gerar um avatar baseado no seu nickname.
        </p>
      </div>

      {/* Seletor de Cor de Fundo */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Cor de Fundo do Avatar
        </label>
        <div className="flex flex-wrap gap-2">
          {bgColors.map((color) => (
            <motion.button
              key={color.value}
              type="button"
              onClick={() => setAvatarBgColor(color.value)}
              className={`w-10 h-10 ${borderRadiusClass} border-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                avatarBgColor === color.value
                  ? 'border-primary scale-110 shadow-lg'
                  : ''
              }`}
              style={{ 
                backgroundColor: color.value,
                willChange: 'transform',
                borderColor: avatarBgColor === color.value ? 'var(--color-primary)' : 'var(--color-border)'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              title={color.name}
              aria-label={`Selecionar cor ${color.name}`}
            />
          ))}
          <div className="flex-1 min-w-[120px]">
            <input
              type="color"
              value={avatarBgColor}
              onChange={(e) => setAvatarBgColor(e.target.value)}
              className={`w-full h-10 ${borderRadiusClass} border-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
              style={{ borderColor: 'var(--color-border)' }}
              title="Escolher cor personalizada"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          Escolha uma cor de fundo para o seu avatar.
        </p>
      </div>

      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-text mb-2">
          Escolha seu nickname
        </label>
        <input
          id="username"
          type="text"
          value={username || ''}
          onChange={(e) => {
            const value = e.target.value
            // Validação manual: apenas letras, números, underscore e hífen
            if (value === '' || /^[a-zA-Z0-9_-]*$/.test(value)) {
              setUsername(value)
              setError(null)
            }
          }}
          placeholder="meu_nickname"
          className="w-full px-4 py-3 bg-bg border-2 border-border rounded-button text-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
          disabled={isLoadingProfile}
          minLength={3}
          maxLength={20}
        />
        <p className="mt-2 text-xs text-muted">
          Mínimo 3 caracteres, máximo 20. Apenas letras, números, underscore (_) e hífen (-).
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-button text-sm"
          style={{
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </motion.div>
      )}

      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={onClose}
          className={`flex-1 px-4 py-2 border-2 ${borderRadiusClass} text-text font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
          style={{ 
            willChange: 'transform',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          disabled={isLoadingProfile}
        >
          Cancelar
        </motion.button>
        <motion.button
          type="submit"
          onClick={(e) => {
            // Chama handleSave diretamente também para garantir que funcione
            // mesmo se o onSubmit do form não disparar corretamente após mudança de aba
            if (!isLoadingProfile && username.trim()) {
              handleSave(e)
            }
          }}
          disabled={isLoadingProfile || !username.trim()}
          className={`flex-1 px-4 py-2 ${borderRadiusClass} font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
          style={{ 
            willChange: 'transform',
            backgroundColor: styles.accent.color,
            color: theme === 'cyberpunk' ? '#000000' : styles.accent.text
          }}
          whileHover={{ scale: isLoadingProfile ? 1 : 1.05 }}
          whileTap={{ scale: isLoadingProfile ? 1 : 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {isLoadingProfile ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-text border-t-transparent rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar
            </>
          )}
        </motion.button>
      </div>
    </form>
  )

  if (!isOpen) return null

  // Se renderContentOnly, renderiza apenas o conteúdo do formulário
  if (renderContentOnly) {
    return renderForm()
  }

  // Renderização completa com backdrop e modal
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
            className="fixed inset-0 backdrop-blur-sm z-[100]"
            style={{ backgroundColor: 'var(--color-backdrop-dark)' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div 
              className="glass border-2 rounded-button shadow-theme max-w-md w-full pointer-events-auto"
              style={{
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-text">
                    {currentUsername ? 'Editar Perfil' : 'Definir Perfil'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-offset-2 text-text`}
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              {renderForm()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
