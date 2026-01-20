import { useState, useEffect, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { X, User, Save, RefreshCw, Mail, Lock, LogOut, Upload, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { toast } from 'sonner'
import { getCroppedImg } from '../../utils/cropImage'

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

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const { getBorderRadiusClass, styles, theme } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  const { user, signOut } = useAuth()
  const accentColor = styles.accent.color
  
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado do recorte de imagem (Image Cropper)
  const [showCropper, setShowCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  
  // Função helper para obter a cor padrão do avatar baseada no tema
  const getThemeDefaultColor = (): string => {
    switch (theme) {
      case 'cyberpunk':
        return darkenColor(accentColor, 20)
      case 'zen':
        return lightenColor(accentColor, 15)
      case 'lofi':
      default:
        return lightenColor(accentColor, 10)
    }
  }
  
  const [avatarBgColor, setAvatarBgColor] = useState<string>(() => getThemeDefaultColor())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordEmailSent, setPasswordEmailSent] = useState(false)

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

  // Carrega o perfil quando o modal abre
  useEffect(() => {
    if (!isOpen || !user || !isSupabaseConfigured() || !supabase) {
      return
    }

    const fetchProfile = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }
      
      setLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('username, avatar_url, avatar_bg_color')
          .eq('id', user.id)
          .single()

        if (fetchError) {
          setError('Erro ao carregar perfil')
        } else {
          setUsername(data?.username || '')
          setAvatarUrl(data?.avatar_url || '')
          setAvatarBgColor(data?.avatar_bg_color || getThemeDefaultColor())
          setError(null)
        }
      } catch (err) {
        setError('Erro ao carregar perfil')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [isOpen, user, theme])

  // Limpa o cropper e revoga object URL quando o modal fecha
  useEffect(() => {
    if (!isOpen) {
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop)
        setImageToCrop(null)
      }
      setShowCropper(false)
      setCroppedAreaPixels(null)
    }
  }, [isOpen, imageToCrop])

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !user) return

    const file = files[0]
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB')
      return
    }

    setError(null)
    const url = URL.createObjectURL(file)
    setImageToCrop(url)
    setShowCropper(true)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCropCancel = useCallback(() => {
    if (imageToCrop) URL.revokeObjectURL(imageToCrop)
    setImageToCrop(null)
    setShowCropper(false)
    setCroppedAreaPixels(null)
  }, [imageToCrop])

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropSave = useCallback(async () => {
    if (!croppedAreaPixels || !imageToCrop || !user || !isSupabaseConfigured() || !supabase) return

    setUploadingAvatar(true)
    setError(null)
    try {
      const blob = await getCroppedImg(imageToCrop, croppedAreaPixels, 'image/jpeg')
      const filePath = `${user.id}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        if (uploadError.message.includes('Bucket') || uploadError.message.includes('not found')) {
          setError('Bucket "avatars" não encontrado. Veja GUIA_CONFIGURAR_BUCKET_AVATARS.md')
        } else if (uploadError.message.includes('row-level security') || uploadError.message.includes('RLS') || uploadError.message.includes('policy')) {
          setError('Erro de permissão (RLS). Veja GUIA_CONFIGURAR_BUCKET_AVATARS.md')
        } else {
          throw uploadError
        }
        setUploadingAvatar(false)
        return
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = urlData?.publicUrl?.startsWith('http') ? urlData.publicUrl : `https://${urlData?.publicUrl || ''}`
      setAvatarUrl(publicUrl)
      toast.success('Avatar atualizado com sucesso!')
      if (imageToCrop) URL.revokeObjectURL(imageToCrop)
      setImageToCrop(null)
      setShowCropper(false)
      setCroppedAreaPixels(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer upload'
      setError(`Erro ao fazer upload: ${msg}`)
    } finally {
      setUploadingAvatar(false)
    }
  }, [croppedAreaPixels, imageToCrop, user])

  const handleGenerateAvatar = () => {
    const baseUsername = username.trim() || user?.email?.split('@')[0] || 'user'
    const randomSeed = Math.random().toString(36).substring(2, 15)
    const usernameForAvatar = `${baseUsername}_${randomSeed}`
    const timestamp = Date.now()
    const generatedAvatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(usernameForAvatar)}&t=${timestamp}`
    setAvatarUrl(generatedAvatar)
    setError(null)
  }

  const handleChangePassword = async () => {
    if (!user?.email || !isSupabaseConfigured() || !supabase) {
      setError('Email não encontrado')
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw error
      }

      setPasswordEmailSent(true)
      toast.success('Email de redefinição de senha enviado! Verifique sua caixa de entrada.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar email'
      setError(`Erro ao enviar email: ${errorMessage}`)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Logout realizado com sucesso!')
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao sair'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isSupabaseConfigured() || !supabase || !user) {
      setError('Supabase não está configurado ou usuário não encontrado')
      return
    }

    const trimmedUsername = username.trim()
    
    // Validações
    if (!trimmedUsername) {
      setError('Por favor, insira um nickname')
      return
    }

    if (trimmedUsername.length < 3) {
      setError('O nickname deve ter pelo menos 3 caracteres')
      return
    }

    if (trimmedUsername.length > 20) {
      setError('O nickname deve ter no máximo 20 caracteres')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      setError('O nickname só pode conter letras, números, underscore (_) e hífen (-)')
      return
    }

    // Validação de URL do avatar (se fornecido)
    if (avatarUrl.trim() && !avatarUrl.trim().startsWith('http://') && !avatarUrl.trim().startsWith('https://')) {
      setError('A URL do avatar deve começar com http:// ou https://')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const finalAvatarUrl = avatarUrl.trim() || null

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

      let { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      // Se der erro porque a coluna não existe, tenta sem ela
      if (updateError && (updateError.message.includes('column') || updateError.message.includes('does not exist'))) {
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
        setIsSaving(false)
        if (updateError.code === '23505') {
          setError('Este nickname já está em uso. Escolha outro.')
        } else {
          setError(`Erro ao salvar: ${updateError.message}`)
        }
        return
      }

      // Sucesso!
      toast.success('Perfil atualizado com sucesso!')
      
      // Dispara evento para notificar outros componentes
      window.dispatchEvent(new CustomEvent('profile-updated', { 
        detail: { userId: user.id } 
      }))
      
      // Fecha o modal após um pequeno delay
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(`Erro ao salvar perfil: ${errorMessage}`)
      setIsSaving(false)
    }
  }

  // Função para obter iniciais do usuário
  const getInitials = (): string => {
    if (username.trim()) {
      return username.trim().substring(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  // Determina se o avatar deve ser redondo ou quadrado
  const avatarShape = borderRadiusClass === 'rounded-none' ? borderRadiusClass : 'rounded-full'

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
              className={`glass border-2 border-skin-border ${borderRadiusClass} shadow-theme max-w-2xl w-full overflow-hidden pointer-events-auto`}
              style={{
                willChange: 'transform, opacity',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-skin-border"
              >
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-skin-accent" />
                  <h2 className="text-xl sm:text-2xl font-bold text-skin-text">
                    Editar Perfil
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
                {showCropper && imageToCrop ? (
                  /* Área de edição (recorte e zoom) */
                  <div className="space-y-4">
                    <div className="relative w-full h-[320px] bg-skin-base">
                      <Cropper
                        image={imageToCrop}
                        crop={crop}
                        zoom={zoom}
                        minZoom={1}
                        maxZoom={3}
                        aspect={1}
                        cropShape={theme === 'cyberpunk' ? 'rect' : 'round'}
                        showGrid={theme === 'cyberpunk'}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-skin-text mb-2">Zoom (1× – 3×)</label>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-2 rounded-full"
                        style={{ accentColor: styles.accent.color }}
                      />
                    </div>
                    {error && (
                      <p className="text-sm font-medium" style={{ color: styles.states.error }}>{error}</p>
                    )}
                    <div className="flex gap-3 pt-2">
                      <motion.button
                        type="button"
                        onClick={handleCropCancel}
                        disabled={uploadingAvatar}
                        className={`flex-1 px-4 py-3 ${borderRadiusClass} font-semibold text-sm border-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50`}
                        style={{ borderColor: styles.border.color, color: styles.text.primary }}
                        whileHover={!uploadingAvatar ? { scale: 1.02 } : {}}
                        whileTap={!uploadingAvatar ? { scale: 0.98 } : {}}
                      >
                        Cancelar
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={handleCropSave}
                        disabled={uploadingAvatar || !croppedAreaPixels}
                        className={`flex-1 px-4 py-3 ${borderRadiusClass} font-semibold text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50`}
                        style={{ backgroundColor: styles.accent.color, color: theme === 'cyberpunk' ? '#000000' : styles.accent.text }}
                        whileHover={!uploadingAvatar && croppedAreaPixels ? { scale: 1.02 } : {}}
                        whileTap={!uploadingAvatar && croppedAreaPixels ? { scale: 0.98 } : {}}
                      >
                        {uploadingAvatar ? 'Salvando...' : 'Salvar Foto'}
                      </motion.button>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-skin-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <form onSubmit={handleSave} className="space-y-6">
                    {/* Seção de Avatar */}
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-skin-text">
                        Avatar
                      </label>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="relative">
                          <div 
                            className={`w-24 h-24 ${avatarShape} flex items-center justify-center border-2 border-skin-border overflow-hidden`}
                            style={{ backgroundColor: avatarBgColor }}
                          >
                            {avatarUrl ? (
                              <img
                                key={avatarUrl}
                                src={avatarUrl}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  const fallbackUsername = username.trim() || user?.email?.split('@')[0] || 'user'
                                  target.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(fallbackUsername)}`
                                }}
                              />
                            ) : (
                              <span className="text-2xl font-bold" style={{ color: styles.text.primary }}>
                                {getInitials()}
                              </span>
                            )}
                          </div>
                          {uploadingAvatar && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={uploadingAvatar || isSaving}
                          />
                          <motion.button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex items-center gap-2 px-4 py-2 border-2 border-skin-border ${borderRadiusClass} text-skin-text text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                            style={{ 
                              willChange: 'transform',
                              backgroundColor: styles.bg.card,
                              borderColor: styles.border.color,
                              color: styles.text.primary
                            }}
                            whileHover={{ scale: uploadingAvatar || isSaving ? 1 : 1.05 }}
                            whileTap={{ scale: uploadingAvatar || isSaving ? 1 : 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            disabled={uploadingAvatar || isSaving}
                          >
                            <Upload className="w-4 h-4" />
                            <span>{uploadingAvatar ? 'Enviando...' : 'Alterar Foto'}</span>
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={handleGenerateAvatar}
                            className={`flex items-center gap-2 px-3 py-1.5 border border-skin-border ${borderRadiusClass} text-skin-text text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                            style={{ 
                              willChange: 'transform',
                              backgroundColor: styles.bg.card,
                              borderColor: styles.border.color,
                              color: styles.text.primary
                            }}
                            whileHover={{ scale: isSaving ? 1 : 1.05 }}
                            whileTap={{ scale: isSaving ? 1 : 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            disabled={isSaving}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Gerar Avatar Automático</span>
                          </motion.button>
                        </div>
                      </div>
                      {/* Input para URL do avatar */}
                      <div className="mt-3">
                        <input
                          type="text"
                          value={avatarUrl}
                          onChange={(e) => {
                            const url = e.target.value.trim()
                            // Valida se a URL começa com http:// ou https://
                            if (url === '' || url.startsWith('http://') || url.startsWith('https://')) {
                              setAvatarUrl(url)
                              setError(null)
                            } else {
                              setError('A URL deve começar com http:// ou https://')
                            }
                          }}
                          onBlur={(e) => {
                            const url = e.target.value.trim()
                            // Se o usuário colar uma URL sem http/https, tenta adicionar
                            if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                              // Se parece uma URL (contém .), adiciona https://
                              if (url.includes('.') && !url.includes(' ')) {
                                setAvatarUrl(`https://${url}`)
                                setError(null)
                              } else {
                                setError('A URL deve começar com http:// ou https://')
                              }
                            }
                          }}
                          placeholder="Ou cole uma URL de imagem (http:// ou https://)"
                          className={`w-full px-4 py-2 border-2 border-skin-border ${borderRadiusClass} focus:outline-none focus:ring-2 focus:ring-skin-accent focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text bg-transparent placeholder-skin-muted text-sm`}
                          style={{
                            borderColor: styles.border.color,
                            color: styles.text.primary,
                          }}
                          disabled={isSaving || uploadingAvatar}
                        />
                      </div>
                      <p className="text-xs text-skin-muted">
                        Clique em "Alterar Foto" para fazer upload, cole uma URL de imagem ou use "Gerar Avatar Automático".
                      </p>
                    </div>

                    {/* Seletor de Cor de Fundo */}
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-skin-text">
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
                                ? 'scale-110 shadow-lg'
                                : ''
                            }`}
                            style={{ 
                              backgroundColor: color.value,
                              willChange: 'transform',
                              borderColor: avatarBgColor === color.value ? styles.accent.color : styles.border.color
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            title={color.name}
                            aria-label={`Selecionar cor ${color.name}`}
                            disabled={isSaving}
                          />
                        ))}
                        <div className="flex-1 min-w-[120px]">
                          <input
                            type="color"
                            value={avatarBgColor}
                            onChange={(e) => setAvatarBgColor(e.target.value)}
                            className={`w-full h-10 ${borderRadiusClass} border-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                            style={{ borderColor: styles.border.color }}
                            title="Escolher cor personalizada"
                            disabled={isSaving}
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-skin-muted">
                        Escolha uma cor de fundo para o seu avatar.
                      </p>
                    </div>

                    {/* Dados Pessoais */}
                    <div className="space-y-4 pt-4 border-t-2 border-skin-border">
                      <h3 className="text-lg font-bold text-skin-text">Dados Pessoais</h3>
                      
                      {/* Email */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold mb-2 text-skin-text">
                          E-mail
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-skin-muted" />
                          <input
                            id="email"
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className={`w-full pl-10 pr-4 py-3 border-2 border-skin-border ${borderRadiusClass} bg-transparent text-skin-muted cursor-not-allowed`}
                            style={{
                              borderColor: styles.border.color,
                              color: styles.text.secondary,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-skin-muted">
                          O e-mail não pode ser alterado.
                        </p>
                      </div>

                      {/* Nickname */}
                      <div>
                        <label htmlFor="username" className="block text-sm font-semibold mb-2 text-skin-text">
                          Nickname
                        </label>
                        <input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === '' || /^[a-zA-Z0-9_-]*$/.test(value)) {
                              setUsername(value)
                              setError(null)
                            }
                          }}
                          placeholder="meu_nickname"
                          className={`w-full px-4 py-3 border-2 border-skin-border ${borderRadiusClass} focus:outline-none focus:ring-2 focus:ring-skin-accent focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text bg-transparent placeholder-skin-muted`}
                          style={{
                            borderColor: styles.border.color,
                            color: styles.text.primary,
                          }}
                          disabled={isSaving}
                          minLength={3}
                          maxLength={20}
                        />
                        <p className="mt-2 text-xs text-skin-muted">
                          Mínimo 3 caracteres, máximo 20. Apenas letras, números, underscore (_) e hífen (-).
                        </p>
                      </div>
                    </div>

                    {/* Segurança */}
                    <div className="pt-4 border-t-2 border-skin-border">
                      <h3 className="text-lg font-bold text-skin-text mb-4">Segurança</h3>
                      
                      {!showChangePassword ? (
                        <motion.button
                          type="button"
                          onClick={() => setShowChangePassword(true)}
                          className={`flex items-center gap-2 px-4 py-2 border-2 border-skin-border ${borderRadiusClass} text-skin-text text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                          style={{ 
                            willChange: 'transform',
                            backgroundColor: 'transparent',
                            borderColor: styles.border.color,
                            color: styles.text.primary
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                          <Lock className="w-4 h-4" />
                          <span>Alterar Senha</span>
                        </motion.button>
                      ) : (
                        <div className="space-y-3">
                          {passwordEmailSent ? (
                            <div className={`p-3 ${borderRadiusClass}`} style={{
                              backgroundColor: styles.states.successBg,
                              border: `1px solid ${styles.states.successBorder}`,
                              color: styles.states.success,
                            }}>
                              <p className="text-sm">
                                Email de redefinição de senha enviado! Verifique sua caixa de entrada e siga as instruções.
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-skin-muted">
                                Um email com instruções para redefinir sua senha será enviado para <strong>{user?.email}</strong>.
                              </p>
                              <div className="flex gap-2">
                                <motion.button
                                  type="button"
                                  onClick={handleChangePassword}
                                  className={`flex items-center gap-2 px-4 py-2 ${borderRadiusClass} text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                                  style={{ 
                                    willChange: 'transform',
                                    backgroundColor: styles.accent.color,
                                    color: theme === 'cyberpunk' ? '#000000' : styles.accent.text
                                  }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                >
                                  <Lock className="w-4 h-4" />
                                  <span style={{ color: 'inherit' }}>Enviar Email de Redefinição</span>
                                </motion.button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowChangePassword(false)
                                    setPasswordEmailSent(false)
                                  }}
                                  className={`px-4 py-2 border-2 border-skin-border ${borderRadiusClass} text-sm font-medium text-skin-text outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                                  style={{
                                    borderColor: styles.border.color,
                                    color: styles.text.primary
                                  }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 ${borderRadiusClass} text-sm flex items-start gap-2`}
                        style={{
                          backgroundColor: styles.states.errorBg,
                          border: `1px solid ${styles.states.errorBorder}`,
                          color: styles.states.error,
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="whitespace-pre-line leading-relaxed">{error}</span>
                      </motion.div>
                    )}

                    {/* Footer com botões de ação */}
                    <div className="flex items-center justify-between pt-4 border-t-2 border-skin-border">
                      {/* Zona de Perigo */}
                      <motion.button
                        type="button"
                        onClick={handleSignOut}
                        className={`flex items-center gap-2 px-4 py-2 border-2 ${borderRadiusClass} text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                        style={{ 
                          willChange: 'transform',
                          backgroundColor: 'transparent',
                          borderColor: styles.states.error,
                          color: styles.states.error
                        }}
                        whileHover={{ scale: 1.05, backgroundColor: styles.states.errorBg }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sair da Conta</span>
                      </motion.button>

                      {/* Botões de ação */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className={`px-4 py-2 text-sm font-medium ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text`}
                          disabled={isSaving}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving || !username.trim()}
                          className={`px-4 py-2 text-sm font-medium ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 bg-skin-accent text-skin-accent-text disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                          style={theme === 'cyberpunk' ? { color: '#000000' } : undefined}
                        >
                          {isSaving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-skin-accent-text border-t-transparent rounded-full animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Salvar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
