import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export const ResetPassword = () => {
  const { getBorderRadiusClass, styles, theme } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidatingToken, setIsValidatingToken] = useState(true)

  useEffect(() => {
    // Verifica se há um token de redefinição na URL
    const checkResetToken = async () => {
      if (!isSupabaseConfigured() || !supabase) {
        setError('Supabase não configurado')
        setIsValidatingToken(false)
        return
      }

      try {
        // O Supabase processa automaticamente o token do hash da URL
        // O formato é: #access_token=...&type=recovery&...
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const type = hashParams.get('type')
        const accessToken = hashParams.get('access_token')

        if (type === 'recovery' && accessToken && supabase) {
          setTimeout(async () => {
            if (!supabase) return
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session) {
              setIsValidatingToken(false)
            } else {
              const { data: { user } } = await supabase.auth.getUser()
              
              if (user) {
                setIsValidatingToken(false)
              } else {
                setError('Link de redefinição inválido ou expirado. Solicite um novo link.')
                setIsValidatingToken(false)
              }
            }
          }, 1000) // Aumentado para 1 segundo para dar tempo do Supabase processar
        } else {
          // Verifica se já há uma sessão válida (usuário pode ter chegado aqui de outra forma)
          if (!supabase) {
            setError('Supabase não configurado')
            setIsValidatingToken(false)
            return
          }
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setIsValidatingToken(false)
          } else {
            setIsValidatingToken(false)
          }
        }
      } catch (err) {
        setError('Erro ao validar link de redefinição')
        setIsValidatingToken(false)
      }
    }

    checkResetToken()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validações
    if (!password.trim()) {
      setError('Por favor, insira uma senha')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (!isSupabaseConfigured() || !supabase) {
      setError('Supabase não configurado')
      return
    }

    setLoading(true)

    try {
      // Atualiza a senha usando o token da URL
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim()
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      toast.success('Senha redefinida com sucesso!')

      // Redireciona após 2 segundos
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao redefinir senha'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-skin-base flex items-center justify-center p-4" style={{ backgroundColor: styles.bg.app }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-skin-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: styles.accent.color }} />
          <p className="text-skin-text" style={{ color: styles.text.primary }}>Validando link de redefinição...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-skin-base flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`glass border-2 border-skin-border ${borderRadiusClass} shadow-theme max-w-md w-full p-8 text-center`}
        >
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-skin-text mb-2">Senha Redefinida!</h2>
          <p className="text-skin-muted mb-4">Sua senha foi alterada com sucesso.</p>
          <p className="text-sm text-skin-muted">Redirecionando...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-skin-base flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass border-2 border-skin-border ${borderRadiusClass} shadow-theme max-w-md w-full overflow-hidden`}
      >
        {/* Header */}
        <div className={`p-6 border-b-2 border-skin-border`}>
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-skin-accent" />
            <h2 className="text-2xl font-bold text-skin-text">Redefinir Senha</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 ${borderRadiusClass} text-sm flex items-center gap-2 mb-4`}
              style={{
                backgroundColor: styles.states.errorBg,
                border: `1px solid ${styles.states.errorBorder}`,
                color: styles.states.error,
              }}
            >
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Nova Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-2 text-skin-text">
                Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-skin-muted" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(null)
                  }}
                  placeholder="Mínimo 6 caracteres"
                  className={`w-full pl-10 pr-10 py-3 border-2 border-skin-border ${borderRadiusClass} focus:outline-none focus:ring-2 focus:ring-skin-accent focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text bg-transparent placeholder-skin-muted`}
                  style={{
                    borderColor: styles.border.color,
                    color: styles.text.primary,
                  }}
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-skin-muted hover:text-skin-text transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2 text-skin-text">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-skin-muted" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setError(null)
                  }}
                  placeholder="Digite a senha novamente"
                  className={`w-full pl-10 pr-10 py-3 border-2 border-skin-border ${borderRadiusClass} focus:outline-none focus:ring-2 focus:ring-skin-accent focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text bg-transparent placeholder-skin-muted`}
                  style={{
                    borderColor: styles.border.color,
                    color: styles.text.primary,
                  }}
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-skin-muted hover:text-skin-text transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botão Submit */}
            <motion.button
              type="submit"
              disabled={loading || !password.trim() || !confirmPassword.trim()}
              className={`w-full py-3 ${borderRadiusClass} font-semibold disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2`}
              style={{
                backgroundColor: styles.accent.color,
                color: theme === 'cyberpunk' ? '#000000' : styles.accent.text,
                willChange: 'transform',
              }}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Redefinindo...
                </span>
              ) : (
                'Redefinir Senha'
              )}
            </motion.button>
          </form>

          <p className="mt-4 text-xs text-skin-muted text-center">
            Lembrou sua senha?{' '}
            <a
              href="/"
              className="text-skin-accent hover:underline"
            >
              Voltar ao login
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
