import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { PomodoroSettings } from '../components/layout/SettingsModal'

const SETTINGS_STORAGE_KEY = 'pomodoro-settings'

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
}

export const useSettings = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  // Carrega configurações do Supabase ou localStorage
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      
      try {
        // Se o usuário está autenticado, tenta carregar do Supabase
        if (user && isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase
            .from('profiles')
            .select('pomodoro_settings')
            .eq('id', user.id)
            .single()

          if (!error && data?.pomodoro_settings) {
            const savedSettings = data.pomodoro_settings as PomodoroSettings
            // Valida e mescla com padrões
            const validatedSettings: PomodoroSettings = {
              focusMinutes: savedSettings.focusMinutes ?? DEFAULT_SETTINGS.focusMinutes,
              shortBreakMinutes: savedSettings.shortBreakMinutes ?? DEFAULT_SETTINGS.shortBreakMinutes,
              longBreakMinutes: savedSettings.longBreakMinutes ?? DEFAULT_SETTINGS.longBreakMinutes,
              autoStartBreaks: savedSettings.autoStartBreaks ?? DEFAULT_SETTINGS.autoStartBreaks,
              autoStartPomodoros: savedSettings.autoStartPomodoros ?? DEFAULT_SETTINGS.autoStartPomodoros,
            }
            setSettings(validatedSettings)
            // Sincroniza com localStorage como backup
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(validatedSettings))
            setIsLoading(false)
            return
          }
          
          if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
          }
        }

        // Fallback: carrega do localStorage
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as PomodoroSettings
            const validatedSettings: PomodoroSettings = {
              focusMinutes: parsed.focusMinutes ?? DEFAULT_SETTINGS.focusMinutes,
              shortBreakMinutes: parsed.shortBreakMinutes ?? DEFAULT_SETTINGS.shortBreakMinutes,
              longBreakMinutes: parsed.longBreakMinutes ?? DEFAULT_SETTINGS.longBreakMinutes,
              autoStartBreaks: parsed.autoStartBreaks ?? DEFAULT_SETTINGS.autoStartBreaks,
              autoStartPomodoros: parsed.autoStartPomodoros ?? DEFAULT_SETTINGS.autoStartPomodoros,
            }
            setSettings(validatedSettings)
          } catch (error) {
            setSettings(DEFAULT_SETTINGS)
          }
        } else {
          setSettings(DEFAULT_SETTINGS)
        }
      } catch (error) {
        // Fallback para localStorage
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as PomodoroSettings
            setSettings({
              focusMinutes: parsed.focusMinutes ?? DEFAULT_SETTINGS.focusMinutes,
              shortBreakMinutes: parsed.shortBreakMinutes ?? DEFAULT_SETTINGS.shortBreakMinutes,
              longBreakMinutes: parsed.longBreakMinutes ?? DEFAULT_SETTINGS.longBreakMinutes,
              autoStartBreaks: parsed.autoStartBreaks ?? DEFAULT_SETTINGS.autoStartBreaks,
              autoStartPomodoros: parsed.autoStartPomodoros ?? DEFAULT_SETTINGS.autoStartPomodoros,
            })
          } catch {
            setSettings(DEFAULT_SETTINGS)
          }
        } else {
          setSettings(DEFAULT_SETTINGS)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [user])

  // Salva configurações no Supabase (se autenticado) e localStorage
  useEffect(() => {
    if (isLoading) return // Não salva durante o carregamento inicial

    const saveSettings = async () => {
      // Sempre salva no localStorage como backup
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))

      // Se o usuário está autenticado, salva no Supabase
      if (user && isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ pomodoro_settings: settings })
            .eq('id', user.id)

          if (error) {
            // Se a coluna não existe, apenas loga o erro (não quebra a aplicação)
            if (error.message?.includes('column') || error.message?.includes('does not exist') || error.code === '42703') {
              // Código 42703 = undefined_column no PostgreSQL
            } else {
            }
          }
        } catch (error) {
        }
      }
    }

    saveSettings()
  }, [settings, user, isLoading])

  const updateSettings = useCallback((newSettings: PomodoroSettings) => {
    setSettings(newSettings)
  }, [])

  return {
    settings,
    updateSettings,
    isLoading,
  }
}
