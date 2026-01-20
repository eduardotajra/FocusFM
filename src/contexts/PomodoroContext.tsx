import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { usePomodoroHook } from '../hooks/usePomodoro'
import type { PomodoroSettings } from '../components/layout/SettingsModal'

type PomodoroContextType = ReturnType<typeof usePomodoroHook>

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined)

interface PomodoroProviderProps {
  children: ReactNode
  settings?: PomodoroSettings
}

export const PomodoroProvider = ({ children, settings }: PomodoroProviderProps) => {
  const pomodoroValue = usePomodoroHook(settings)

  return (
    <PomodoroContext.Provider value={pomodoroValue}>
      {children}
    </PomodoroContext.Provider>
  )
}

export const usePomodoro = () => {
  const context = useContext(PomodoroContext)
  if (context === undefined) {
    throw new Error('usePomodoro deve ser usado dentro de PomodoroProvider')
  }
  return context
}
