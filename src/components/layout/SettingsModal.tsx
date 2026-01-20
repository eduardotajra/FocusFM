import { useState, useEffect, useRef } from 'react'
import { X, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

// const SETTINGS_STORAGE_KEY = 'pomodoro-settings' // Não usado no momento

export interface PomodoroSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: PomodoroSettings) => void
  currentSettings: PomodoroSettings
  // Permite salvamento otimista (opcional)
  onSettingsChange?: (settings: PomodoroSettings) => void
}

export const SettingsModal = ({ isOpen, onClose, onSave, currentSettings, onSettingsChange }: SettingsModalProps) => {
  const { getBorderRadiusClass, styles, theme } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  const [settings, setSettings] = useState<PomodoroSettings>(currentSettings)
  const prevIsOpenRef = useRef(false)

  // Atualiza o estado apenas quando o modal é aberto (não durante a edição)
  useEffect(() => {
    // Se o modal acabou de ser aberto (estava fechado e agora está aberto)
    if (isOpen && !prevIsOpenRef.current) {
      setSettings(currentSettings)
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen, currentSettings])

  // Removido themeColors - usando classes semânticas do Tailwind

  const handleSave = () => {
    onSave(settings)
    onClose()
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  const updateSetting = <K extends keyof PomodoroSettings>(
    key: K,
    value: PomodoroSettings[K]
  ) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        [key]: value,
      }
      // Salvamento otimista: salva imediatamente quando auto-start muda
      // Isso garante que as preferências sejam salvas mesmo se o usuário fechar o modal sem clicar em "Salvar"
      if (key === 'autoStartBreaks' || key === 'autoStartPomodoros') {
        if (onSettingsChange) {
          onSettingsChange(newSettings)
        }
      }
      return newSettings
    })
  }

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
                  <Settings className="w-6 h-6 text-skin-accent" />
                  <h2 className="text-xl sm:text-2xl font-bold text-skin-text">
                    Configurações
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
                <div className="space-y-6">
                  {/* Durações */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-skin-text">
                      Durações (em minutos)
                    </h3>
                    <div className="space-y-4">
                      {/* Foco */}
                      <div>
                        <label
                          htmlFor="focus-minutes"
                          className="block text-sm font-semibold mb-2 text-skin-text"
                        >
                          Sessão de Foco
                        </label>
                        <input
                          id="focus-minutes"
                          type="number"
                          min="1"
                          max="60"
                          value={settings.focusMinutes}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            if (!isNaN(value) && value >= 1 && value <= 60) {
                              updateSetting('focusMinutes', value)
                            }
                          }}
                          className={`w-full px-4 py-2 border-2 border-skin-border ${borderRadiusClass} focus:outline-none focus:ring-2 focus:ring-skin-accent focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text bg-skin-card`}
                        />
                      </div>

                      {/* Pausa Curta */}
                      <div>
                        <label
                          htmlFor="short-break-minutes"
                          className="block text-sm font-semibold mb-2 text-skin-text"
                        >
                          Pausa Curta
                        </label>
                        <input
                          id="short-break-minutes"
                          type="number"
                          min="1"
                          max="30"
                          value={settings.shortBreakMinutes}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            if (!isNaN(value) && value >= 1 && value <= 30) {
                              updateSetting('shortBreakMinutes', value)
                            }
                          }}
                          className={`w-full px-4 py-2 border-2 border-skin-border ${borderRadiusClass} focus:outline-none focus:ring-2 focus:ring-skin-accent focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text bg-skin-card`}
                        />
                      </div>

                      {/* Pausa Longa */}
                      <div>
                        <label
                          htmlFor="long-break-minutes"
                          className="block text-sm font-semibold mb-2 text-skin-text"
                        >
                          Pausa Longa
                        </label>
                        <input
                          id="long-break-minutes"
                          type="number"
                          min="1"
                          max="60"
                          value={settings.longBreakMinutes}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            if (!isNaN(value) && value >= 1 && value <= 60) {
                              updateSetting('longBreakMinutes', value)
                            }
                          }}
                          className={`w-full px-4 py-2 border-2 border-skin-border ${borderRadiusClass} focus:outline-none focus:ring-2 focus:ring-skin-accent focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text bg-skin-card`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Auto-start */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-skin-text">
                      Auto-start
                    </h3>
                    <div className="space-y-4">
                      {/* Auto-start Breaks */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label
                            htmlFor="auto-start-breaks"
                            className="block text-sm font-semibold text-skin-text"
                          >
                            Auto-start Pausas
                          </label>
                          <p className="text-xs mt-1 text-description text-skin-muted">
                            Inicia automaticamente as pausas quando uma sessão de foco termina
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateSetting('autoStartBreaks', !settings.autoStartBreaks)}
                          className="relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-skin-accent focus:ring-offset-2 border transition-colors"
                          style={{
                            backgroundColor: settings.autoStartBreaks 
                              ? styles.accent.color 
                              : theme === 'cyberpunk'
                              ? '#2a2a2a'
                              : theme === 'zen'
                              ? '#3a3a3a'
                              : '#d4d4d4',
                            borderColor: settings.autoStartBreaks 
                              ? styles.accent.color 
                              : styles.border.color,
                            willChange: 'background-color, border-color'
                          }}
                          aria-label="Toggle auto-start breaks"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                              settings.autoStartBreaks ? 'translate-x-6' : 'translate-x-1'
                            }`}
                            style={{
                              willChange: 'transform',
                              backgroundColor: settings.autoStartBreaks 
                                ? '#ffffff'
                                : theme === 'cyberpunk'
                                ? '#e5e7eb'
                                : theme === 'zen'
                                ? '#e5e7eb'
                                : '#ffffff',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                            }}
                          />
                        </button>
                      </div>

                      {/* Auto-start Pomodoros */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label
                            htmlFor="auto-start-pomodoros"
                            className="block text-sm font-semibold text-skin-text"
                          >
                            Auto-start Pomodoros
                          </label>
                          <p className="text-xs mt-1 text-description text-skin-muted">
                            Inicia automaticamente as sessões de foco quando uma pausa termina
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateSetting('autoStartPomodoros', !settings.autoStartPomodoros)}
                          className="relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-skin-accent focus:ring-offset-2 border transition-colors"
                          style={{
                            backgroundColor: settings.autoStartPomodoros 
                              ? styles.accent.color 
                              : theme === 'cyberpunk'
                              ? '#2a2a2a'
                              : theme === 'zen'
                              ? '#3a3a3a'
                              : '#d4d4d4',
                            borderColor: settings.autoStartPomodoros 
                              ? styles.accent.color 
                              : styles.border.color,
                            willChange: 'background-color, border-color'
                          }}
                          aria-label="Toggle auto-start pomodoros"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                              settings.autoStartPomodoros ? 'translate-x-6' : 'translate-x-1'
                            }`}
                            style={{
                              willChange: 'transform',
                              backgroundColor: settings.autoStartPomodoros 
                                ? '#ffffff'
                                : theme === 'cyberpunk'
                                ? '#e5e7eb'
                                : theme === 'zen'
                                ? '#e5e7eb'
                                : '#ffffff',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between p-4 sm:p-6 border-t-2 border-skin-border gap-3"
              >
                <button
                  onClick={handleReset}
                  className={`px-4 py-2 text-sm font-medium ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-muted`}
                >
                  Restaurar Padrões
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className={`px-4 py-2 text-sm font-medium ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 text-skin-text`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className={`px-4 py-2 text-sm font-medium ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 bg-skin-accent text-skin-accent-text`}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
