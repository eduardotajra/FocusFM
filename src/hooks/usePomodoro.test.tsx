import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePomodoroHook } from './usePomodoro'

// Mock do localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock do Supabase
vi.mock('../lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}))

// Mock do badgeChecker
vi.mock('../utils/badgeChecker', () => ({
  checkAndAwardBadges: vi.fn(),
}))

describe('usePomodoro', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve iniciar com 25 minutos (1500 segundos) no modo foco', () => {
    const { result } = renderHook(() => usePomodoroHook())

    expect(result.current.sessionType).toBe('foco')
    expect(result.current.timeRemaining).toBe(25 * 60) // 1500 segundos
    expect(result.current.status).toBe('idle')
  })

  it('deve iniciar o timer quando start() é chamado', () => {
    const { result } = renderHook(() => usePomodoroHook())

    expect(result.current.status).toBe('idle')

    act(() => {
      result.current.start()
    })

    expect(result.current.status).toBe('running')
  })

  it('deve pausar o timer quando pause() é chamado', () => {
    const { result } = renderHook(() => usePomodoroHook())

    // Inicia o timer
    act(() => {
      result.current.start()
    })
    expect(result.current.status).toBe('running')

    // Pausa o timer
    act(() => {
      result.current.pause()
    })
    expect(result.current.status).toBe('paused')
  })

  it('deve alterar o tempo inicial quando muda para "pausa curta"', () => {
    const { result } = renderHook(() => usePomodoroHook())

    expect(result.current.timeRemaining).toBe(25 * 60) // 25 minutos

    act(() => {
      result.current.setSessionType('pausa curta')
    })

    expect(result.current.sessionType).toBe('pausa curta')
    expect(result.current.timeRemaining).toBe(5 * 60) // 5 minutos
    expect(result.current.status).toBe('idle')
  })

  it('deve alterar o tempo inicial quando muda para "pausa longa"', () => {
    const { result } = renderHook(() => usePomodoroHook())

    act(() => {
      result.current.setSessionType('pausa longa')
    })

    expect(result.current.sessionType).toBe('pausa longa')
    expect(result.current.timeRemaining).toBe(15 * 60) // 15 minutos
  })

  it('deve resetar o timer para o tempo inicial quando reset() é chamado', () => {
    const { result } = renderHook(() => usePomodoroHook())

    // Inicia o timer
    act(() => {
      result.current.start()
    })

    // Avança o tempo
    act(() => {
      vi.advanceTimersByTime(5000) // 5 segundos
    })

    // Reseta
    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.timeRemaining).toBe(25 * 60) // Volta para 25 minutos
  })

  it('deve formatar o tempo corretamente', () => {
    const { result } = renderHook(() => usePomodoroHook())

    expect(result.current.formattedTime).toBe('25:00')

    // Muda para pausa curta (5 minutos)
    act(() => {
      result.current.setSessionType('pausa curta')
    })

    expect(result.current.formattedTime).toBe('05:00')
  })

  it('deve manter o estado no localStorage', () => {
    const { result, unmount } = renderHook(() => usePomodoroHook())

    act(() => {
      result.current.start()
    })

    // Verifica que está running antes de mudar o tipo
    expect(result.current.status).toBe('running')

    act(() => {
      result.current.setSessionType('pausa curta')
    })

    // setSessionType reseta o status para 'idle'
    expect(result.current.status).toBe('idle')
    expect(result.current.sessionType).toBe('pausa curta')

    unmount()

    // Verifica se foi salvo no localStorage
    const saved = localStorageMock.getItem('pomodoro-state')
    expect(saved).toBeTruthy()

    if (saved) {
      const parsed = JSON.parse(saved)
      expect(parsed.sessionType).toBe('pausa curta')
      // setSessionType sempre reseta o status para 'idle'
      expect(parsed.status).toBe('idle')
    }
  })
})
