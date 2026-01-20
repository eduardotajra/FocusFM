import { useState, useMemo, useEffect, useRef } from 'react'
import { ThemeSelector } from './components/ui/ThemeSelector'
import { AudioPlayer } from './components/ui/AudioPlayer'
import { HistoryModal } from './components/layout/HistoryModal'
import { Leaderboard } from './components/features/Leaderboard'
import { AITaskGenerator } from './components/features/AITaskGenerator'
import { AuthButton } from './components/layout/AuthButton'
import { HowItWorksModal } from './components/layout/HowItWorksModal'
import { SettingsModal } from './components/layout/SettingsModal'
import { ProfileModal } from './components/layout/ProfileModal'
import { AchievementsModal } from './components/layout/AchievementsModal'
import { ResetPassword } from './components/layout/ResetPassword'
import { usePomodoro } from './contexts/PomodoroContext'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './contexts/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, ChevronDown, Trophy, Play, Pause, RotateCcw, Target, Coffee, Moon, HelpCircle, CheckCircle2, Settings } from 'lucide-react'

// Helper para adicionar opacidade a uma cor hex
const addOpacity = (hex: string, opacity: number): string => {
  // Remove o # se existir
  hex = hex.replace('#', '')
  
  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Retorna rgba
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function App() {
  const {
    sessionType,
    formattedTime,
    status,
    start,
    pause,
    reset,
    setSessionType,
    currentTask,
    finishSession,
  } = usePomodoro()

  const { getBorderRadiusClass, styles, theme } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false)
  const [isPlanningExpanded, setIsPlanningExpanded] = useState(false)
  
  // Verifica se há um token de redefinição de senha na URL
  const [showResetPassword, setShowResetPassword] = useState(false)
  
  useEffect(() => {
    // Verifica se a URL contém /reset-password
    const isResetPasswordPath = window.location.pathname.includes('/reset-password') || 
                                 window.location.href.includes('/reset-password')
    
    if (isResetPasswordPath) {
      setShowResetPassword(true)
      return
    }
    
    // Verifica se há um token de redefinição na URL (hash ou query params)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const queryParams = new URLSearchParams(window.location.search)
    const type = hashParams.get('type') || queryParams.get('type')
    const accessToken = hashParams.get('access_token')
    
    if (type === 'recovery' || accessToken) {
      setShowResetPassword(true)
      if (!window.location.pathname.includes('/reset-password')) {
        window.history.replaceState({}, '', '/reset-password' + window.location.hash)
      }
    }
  }, [])
  
  const { settings, updateSettings } = useSettings()
  const isRunning = status === 'running'
  const isIdle = status === 'idle'
  const isTimerFinished = formattedTime === '00:00' && isIdle
  // Quando uma sessão de foco termina, o próximo modo já está calculado
  const shouldSuggestNextBreak = isTimerFinished && sessionType !== 'foco' && (sessionType === 'pausa curta' || sessionType === 'pausa longa')
  
  // Zen Mode: ativo quando timer está rodando e é sessão de foco
  const isZenMode = isRunning && sessionType === 'foco'
  const [isHovering, setIsHovering] = useState(true) // Inicia como true para evitar tela apagada ao recarregar
  const [stableZenMode, setStableZenMode] = useState(false) // Estado estável do Zen Mode com debounce
  const inactivityTimeoutRef = useRef<number | null>(null)
  const zenModeDebounceRef = useRef<number | null>(null)
  const hoverUpdateTimeoutRef = useRef<number | null>(null)
  const lastHoverStateRef = useRef(true) // Rastreia último estado para evitar mudanças desnecessárias
  const zenModeActivationTimeRef = useRef<number | null>(null) // Timestamp de quando Zen Mode foi ativado
  
  // Debounce do Zen Mode para evitar mudanças muito rápidas que causam piscar
  useEffect(() => {
    // Limpa debounce anterior
    if (zenModeDebounceRef.current) {
      clearTimeout(zenModeDebounceRef.current)
    }
    
    // Aguarda 300ms antes de atualizar o estado estável
    // Isso evita que mudanças rápidas de isRunning/sessionType causem piscar
    zenModeDebounceRef.current = window.setTimeout(() => {
      const wasZenMode = stableZenMode
      setStableZenMode(isZenMode)
      
      // Quando Zen Mode é ativado (mudou de false para true)
      if (!wasZenMode && isZenMode) {
        // Marca timestamp de ativação
        zenModeActivationTimeRef.current = Date.now()
        
        setIsHovering(true)
        lastHoverStateRef.current = true
        
        // Limpa qualquer timeout de inatividade ao ativar
        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current)
          inactivityTimeoutRef.current = null
        }
        if (hoverUpdateTimeoutRef.current) {
          clearTimeout(hoverUpdateTimeoutRef.current)
          hoverUpdateTimeoutRef.current = null
        }
      } else if (wasZenMode && !isZenMode) {
        // Quando Zen Mode é desativado, restaura hover e limpa timestamp
        zenModeActivationTimeRef.current = null
        setIsHovering(true)
        lastHoverStateRef.current = true
        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current)
          inactivityTimeoutRef.current = null
        }
        if (hoverUpdateTimeoutRef.current) {
          clearTimeout(hoverUpdateTimeoutRef.current)
          hoverUpdateTimeoutRef.current = null
        }
      }
    }, 300)
    
    return () => {
      if (zenModeDebounceRef.current) {
        clearTimeout(zenModeDebounceRef.current)
      }
    }
  }, [isZenMode, stableZenMode])
  
  // Gerencia o estado de hover baseado em movimento do mouse
  useEffect(() => {
    // Se não está em Zen Mode estável, sempre mostra (opacidade 1)
    if (!stableZenMode) {
      setIsHovering(true)
      lastHoverStateRef.current = true
      // Limpa timeout ao sair do Zen Mode
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
        inactivityTimeoutRef.current = null
      }
      if (hoverUpdateTimeoutRef.current) {
        clearTimeout(hoverUpdateTimeoutRef.current)
        hoverUpdateTimeoutRef.current = null
      }
      return
    }
    
    // Handler de movimento do mouse - mantém hover ativo
    const handleMouseMove = () => {
      // Verifica se Zen Mode foi ativado recentemente (menos de 2 segundos)
      const timeSinceActivation = zenModeActivationTimeRef.current 
        ? Date.now() - zenModeActivationTimeRef.current 
        : Infinity
      const isRecentlyActivated = timeSinceActivation < 2000
      
      // Limpa timeout de inatividade anterior
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
        inactivityTimeoutRef.current = null
      }
      
      // Limpa timeout de atualização anterior
      if (hoverUpdateTimeoutRef.current) {
        clearTimeout(hoverUpdateTimeoutRef.current)
        hoverUpdateTimeoutRef.current = null
      }
      
      // Atualiza estado apenas se necessário (evita oscilação)
      if (!lastHoverStateRef.current) {
        lastHoverStateRef.current = true
        setIsHovering(true)
      }
      
      // Define timeout para desativar após 3 segundos de inatividade
      // Mas só se o Zen Mode não foi ativado recentemente
      if (!isRecentlyActivated) {
        inactivityTimeoutRef.current = window.setTimeout(() => {
          // Verifica novamente se ainda está em Zen Mode e se o estado mudou
          if (stableZenMode && lastHoverStateRef.current) {
            lastHoverStateRef.current = false
            setIsHovering(false)
          }
          inactivityTimeoutRef.current = null
        }, 3000)
      }
    }
    
    // Handler quando o mouse sai da janela
    const handleMouseLeave = () => {
      // Verifica se Zen Mode foi ativado recentemente
      const timeSinceActivation = zenModeActivationTimeRef.current 
        ? Date.now() - zenModeActivationTimeRef.current 
        : Infinity
      const isRecentlyActivated = timeSinceActivation < 2000
      
      // Se foi ativado recentemente, não desativa (proteção contra piscar)
      if (isRecentlyActivated) {
        return
      }
      
      // Limpa timeouts
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
        inactivityTimeoutRef.current = null
      }
      if (hoverUpdateTimeoutRef.current) {
        clearTimeout(hoverUpdateTimeoutRef.current)
        hoverUpdateTimeoutRef.current = null
      }
      // Desativa após delay para evitar piscar
      if (lastHoverStateRef.current) {
        lastHoverStateRef.current = false
        inactivityTimeoutRef.current = window.setTimeout(() => {
          if (stableZenMode) {
            setIsHovering(false)
          }
          inactivityTimeoutRef.current = null
        }, 500)
      }
    }
    
    // Handler quando o mouse entra na janela
    const handleMouseEnter = () => {
      // Limpa timeouts
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
        inactivityTimeoutRef.current = null
      }
      if (hoverUpdateTimeoutRef.current) {
        clearTimeout(hoverUpdateTimeoutRef.current)
        hoverUpdateTimeoutRef.current = null
      }
      // Ativa imediatamente
      if (!lastHoverStateRef.current) {
        lastHoverStateRef.current = true
        setIsHovering(true)
      }
    }
    
    // Adiciona listeners globais
    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
        inactivityTimeoutRef.current = null
      }
      if (hoverUpdateTimeoutRef.current) {
        clearTimeout(hoverUpdateTimeoutRef.current)
        hoverUpdateTimeoutRef.current = null
      }
    }
  }, [stableZenMode])
  
  // Opacidade dos elementos no Zen Mode (0.1 quando ativo e não hover, 1 quando hover ou não zen mode)
  const zenOpacity = useMemo(() => {
    if (!stableZenMode) return 1
    return isHovering ? 1 : 0.1
  }, [stableZenMode, isHovering])
  
  if (showResetPassword) {
    return <ResetPassword />
  }

  return (
    <div 
      className="min-h-screen text-skin-text flex flex-col relative transition-colors duration-500"
      style={{ backgroundColor: styles.bg.app }}
    >
      {/* Cabeçalho com botões */}
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
        {/* Botões da esquerda */}
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.button
            onClick={() => setIsHistoryModalOpen(true)}
            className={`glass flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 border ${borderRadiusClass} shadow-theme text-xs sm:text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2`}
            aria-label="Ver estatísticas"
            whileHover={{ scale: 1.05, opacity: 0.9 }}
            whileTap={{ scale: 0.95 }}
            animate={{ opacity: zenOpacity }}
            style={{ 
              willChange: 'transform, opacity'
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 17,
              opacity: { duration: 0.5, ease: 'easeInOut' }
            }}
          >
            <BarChart3 className="w-4 h-4 text-skin-text" />
            <span className="hidden sm:inline text-skin-text">Estatísticas</span>
          </motion.button>
          <motion.button
            onClick={() => setIsLeaderboardOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 border ${borderRadiusClass} shadow-theme text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 hover:opacity-90 transition-opacity`}
            aria-label="Ver ranking global"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ opacity: zenOpacity }}
            style={{ 
              willChange: 'transform, opacity',
              backgroundColor: styles.bg.card,
              borderColor: styles.border.color,
              color: styles.text.primary
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 17,
              opacity: { duration: 0.5, ease: 'easeInOut' }
            }}
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Ranking Global</span>
            <span className="sm:hidden">Rank</span>
          </motion.button>
        </div>

        {/* Botões à direita: Configurações, Interrogação, Tema, Perfil */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Botão de configurações */}
          <motion.button
            onClick={() => setIsSettingsOpen(true)}
            className={`glass p-2 border ${borderRadiusClass} shadow-theme outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2`}
            aria-label="Configurações"
            whileHover={{ scale: 1.05, opacity: 0.9 }}
            whileTap={{ scale: 0.95 }}
            animate={{ opacity: zenOpacity }}
            style={{ 
              willChange: 'transform, opacity'
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 17,
              opacity: { duration: 0.5, ease: 'easeInOut' }
            }}
          >
            <Settings className="w-4 h-4 text-skin-text" />
          </motion.button>
          {/* Botão de ajuda */}
          <motion.button
            onClick={() => setIsHowItWorksOpen(true)}
            className={`glass p-2 border ${borderRadiusClass} shadow-theme outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2`}
            aria-label="Como funciona"
            whileHover={{ scale: 1.05, opacity: 0.9 }}
            whileTap={{ scale: 0.95 }}
            animate={{ opacity: zenOpacity }}
            style={{ 
              willChange: 'transform, opacity'
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 17,
              opacity: { duration: 0.5, ease: 'easeInOut' }
            }}
          >
            <HelpCircle className="w-4 h-4 text-skin-text" />
          </motion.button>
          {/* Seletor de tema */}
          <motion.div 
            className="relative z-30"
            animate={{ opacity: zenOpacity }}
            style={{ willChange: 'opacity' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <ThemeSelector />
          </motion.div>
          {/* Botão de perfil */}
          <motion.div 
            className="relative z-30"
            animate={{ opacity: zenOpacity }}
            style={{ willChange: 'opacity' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <AuthButton 
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenAchievements={() => setIsAchievementsOpen(true)}
            />
          </motion.div>
        </div>
      </header>

      {/* Conteúdo principal completamente centralizado */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 pt-24 sm:pt-28 md:pt-32 pb-24 sm:pb-28 md:pb-32">
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center">
          {/* Timer Gigante - Card com Glassmorphism */}
          <motion.div 
            className={`glass mb-12 sm:mb-16 md:mb-20 p-8 sm:p-10 md:p-12 ${borderRadiusClass}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ willChange: 'transform, opacity' }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-9xl sm:text-[10rem] md:text-[14rem] lg:text-[16rem] font-mono-timer text-skin-accent leading-none tracking-tight">
              {formattedTime.split(':').map((part, index, array) => (
                <span key={index} className="inline-block">
                  {part}
                  {index < array.length - 1 && (
                    <motion.span
                      animate={
                        !isRunning && status === 'paused'
                          ? {
                              opacity: [1, 0.3, 1],
                            }
                          : { opacity: 1 }
                      }
                      transition={{
                        duration: 1.5,
                        repeat: !isRunning && status === 'paused' ? Infinity : 0,
                        ease: 'easeInOut',
                      }}
                      className="inline-block"
                    >
                      :
                    </motion.span>
                  )}
                </span>
              ))}
            </div>
            <div className="mt-4 sm:mt-6 text-lg sm:text-xl md:text-2xl uppercase tracking-widest text-skin-muted font-semibold">
              {sessionType}
            </div>
            {currentTask && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 sm:mt-6 text-lg sm:text-xl md:text-2xl text-skin-accent font-semibold max-w-2xl mx-auto px-4"
              >
                Tarefa: {currentTask}
              </motion.p>
            )}
          </motion.div>

          {/* Botões de Controle (Start/Pause/Reset/Finish) */}
          <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 mb-8 sm:mb-10 md:mb-12 flex-wrap">
            <motion.button
              onClick={isRunning ? pause : start}
              className={`flex items-center gap-1 sm:gap-2 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 ${borderRadiusClass} font-bold text-sm sm:text-base md:text-lg shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-transform active:scale-95`}
              style={{ 
                willChange: 'transform',
                backgroundColor: styles.accent.color,
                color: theme === 'cyberpunk' ? '#000000' : styles.accent.text
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              aria-label={isRunning ? 'Pausar' : (shouldSuggestNextBreak ? `Iniciar ${sessionType === 'pausa longa' ? 'Pausa Longa' : 'Pausa Curta'}` : 'Iniciar')}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pausar</span>
                </>
              ) : shouldSuggestNextBreak ? (
                <>
                  {sessionType === 'pausa longa' ? (
                    <>
                      <Moon className="w-5 h-5" />
                      <span className="hidden sm:inline">🌴 Iniciar Pausa Longa</span>
                      <span className="sm:hidden">🌴 Pausa Longa</span>
                    </>
                  ) : (
                    <>
                      <Coffee className="w-5 h-5" />
                      <span className="hidden sm:inline">☕ Iniciar Pausa Curta</span>
                      <span className="sm:hidden">☕ Pausa Curta</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Iniciar</span>
                </>
              )}
            </motion.button>
            {isRunning && (sessionType === 'foco' || sessionType === 'pausa curta') && (
              <motion.button
                onClick={() => finishSession('MANUAL_STOP')}
                className={`flex items-center gap-1 sm:gap-2 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 ${borderRadiusClass} font-bold text-sm sm:text-base md:text-lg shadow-theme outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                whileHover={{ scale: 1.05, opacity: 0.9 }}
                whileTap={{ scale: 0.95 }}
                style={{ 
                  willChange: 'transform, opacity',
                  backgroundColor: styles.accent.color,
                  color: theme === 'cyberpunk' ? '#000000' : styles.accent.text
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                aria-label="Finalizar sessão"
                title={sessionType === 'foco' 
                  ? "Finaliza a sessão e salva o progresso no ranking e estatísticas"
                  : "Finaliza a pausa e avança para a próxima sessão"}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="hidden sm:inline">Finalizar</span>
                <span className="sm:hidden">✓</span>
              </motion.button>
            )}
            <motion.button
              onClick={reset}
              className={`flex items-center gap-1 sm:gap-2 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 ${borderRadiusClass} border-2 bg-transparent font-bold text-sm sm:text-base md:text-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:opacity-80 transition-opacity`}
              style={{ 
                willChange: 'transform',
                borderColor: styles.border.color,
                color: styles.text.primary
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              aria-label="Resetar timer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Resetar</span>
            </motion.button>
          </div>

          {/* Botões de Modo (Foco/Pausa Curta/Pausa Longa) */}
          <motion.div 
            className="flex flex-row items-center justify-center gap-3 flex-wrap"
            animate={{ opacity: zenOpacity }}
            style={{ willChange: 'opacity' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <motion.button
              onClick={() => setSessionType('foco')}
              className={`flex items-center gap-2 px-6 py-3 ${borderRadiusClass} border-2 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-opacity ${
                sessionType === 'foco'
                  ? ''
                  : 'opacity-50 hover:opacity-100'
              }`}
              style={{ 
                willChange: 'transform',
                borderColor: sessionType === 'foco' ? styles.accent.color : styles.border.color,
                backgroundColor: sessionType === 'foco' 
                  ? addOpacity(styles.accent.color, 0.1)
                  : 'transparent',
                color: sessionType === 'foco' ? styles.accent.color : styles.text.primary
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              aria-label="Modo Foco"
            >
              <Target className="w-4 h-4" />
              <span>Foco</span>
            </motion.button>
            <motion.button
              onClick={() => setSessionType('pausa curta')}
              className={`flex items-center gap-2 px-6 py-3 ${borderRadiusClass} border-2 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-opacity ${
                sessionType === 'pausa curta'
                  ? ''
                  : 'opacity-50 hover:opacity-100'
              }`}
              style={{ 
                willChange: 'transform',
                borderColor: sessionType === 'pausa curta' ? styles.accent.color : styles.border.color,
                backgroundColor: sessionType === 'pausa curta' 
                  ? addOpacity(styles.accent.color, 0.1)
                  : 'transparent',
                color: sessionType === 'pausa curta' ? styles.accent.color : styles.text.primary
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              aria-label="Pausa Curta"
            >
              <Coffee className="w-4 h-4" />
              <span>Pausa Curta</span>
            </motion.button>
            <motion.button
              onClick={() => setSessionType('pausa longa')}
              className={`flex items-center gap-2 px-6 py-3 ${borderRadiusClass} border-2 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-opacity ${
                sessionType === 'pausa longa'
                  ? ''
                  : 'opacity-50 hover:opacity-100'
              }`}
              style={{ 
                willChange: 'transform',
                borderColor: sessionType === 'pausa longa' ? styles.accent.color : styles.border.color,
                backgroundColor: sessionType === 'pausa longa' 
                  ? addOpacity(styles.accent.color, 0.1)
                  : 'transparent',
                color: sessionType === 'pausa longa' ? styles.accent.color : styles.text.primary
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              aria-label="Pausa Longa"
            >
              <Moon className="w-4 h-4" />
              <span>Pausa Longa</span>
            </motion.button>
          </motion.div>

          {/* Accordion de Planejamento Inteligente */}
          <motion.div 
            className="w-full max-w-2xl mt-12 sm:mt-16 md:mt-20"
            animate={{ opacity: zenOpacity }}
            style={{ willChange: 'opacity' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <motion.button
              onClick={() => setIsPlanningExpanded(!isPlanningExpanded)}
              className={`glass w-full flex items-center justify-between p-4 sm:p-5 border border-skin-border ${borderRadiusClass} shadow-theme outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2`}
              style={{ 
                willChange: 'transform, opacity'
              }}
              whileHover={{ scale: 1.01, opacity: 0.9 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <h2 className="text-lg sm:text-xl font-bold text-skin-text">Planejamento Inteligente</h2>
              <motion.div
                animate={{ rotate: isPlanningExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-5 h-5 text-skin-text" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {isPlanningExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4">
                    <AITaskGenerator />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* AudioPlayer fixo no rodapé - discreto e responsivo */}
      <div className="fixed bottom-0 left-0 right-0 px-2 sm:px-4 pb-2 sm:pb-4 z-10 pointer-events-none">
        <div className="container mx-auto max-w-xl flex justify-center">
          <div className="pointer-events-auto w-full max-w-full">
            <AudioPlayer />
          </div>
        </div>
      </div>

      {/* Modal de Histórico de Estatísticas */}
      <HistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
      />

      {/* Modal de Ranking */}
      <Leaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      {/* Modal de Configurações */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={updateSettings}
        currentSettings={settings}
        onSettingsChange={updateSettings} // Salvamento otimista para auto-start
      />

      {/* Modal Como Funciona */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      {/* Modal de Perfil */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Modal de Conquistas */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
      />
    </div>
  )
}

export default App
