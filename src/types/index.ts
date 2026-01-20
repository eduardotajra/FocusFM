// Tipos centralizados do projeto

// Tipos de tema
export type Theme = 'lofi' | 'cyberpunk' | 'zen'

// Tipos de sessão Pomodoro
export type SessionType = 'foco' | 'pausa curta' | 'pausa longa'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type SessionStatus = 'COMPLETED' | 'MANUAL_STOP'

// Tipos de áudio
export type AudioType = 'white-noise' | 'rain'

// Tipos de histórico de sessão
export interface SessionHistoryItem {
  id: string
  user_id: string
  session_type: string
  started_at: string
  finished_at: string
  duration_seconds: number
  target_duration: number
  status?: SessionStatus | string
  task_name?: string | null
  created_at?: string
}

// Tipos de badge
export interface BadgeStats {
  totalSessions: number
  currentHour: number
  totalMinutes: number
  consecutiveDays: number
  longestSession: number
}
