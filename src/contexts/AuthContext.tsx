import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const sessionRef = useRef<Session | null>(null)
  
  // Mantém ref sincronizada com o estado
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false)
      return
    }

    const initializeAuth = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }
      
      try {
        // Verifica primeiro getSession() que é rápido/síncrono
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setLoading(false)
          return
        }

        if (initialSession) {
          setSession(initialSession)
          setUser(initialSession.user)
        } else {
          setSession(null)
          setUser(null)
        }
        
        setLoading(false)
      } catch (error) {
        setLoading(false)
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)

      if (event === 'TOKEN_REFRESHED') {
        return
      }
    })

    // Revalida sessão quando a aba volta ao foco (corrige problemas de sincronia)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          // Force uma verificação rápida da sessão quando a aba fica visível
          // Isso garante que, se o token expirou enquanto estava fora, ele renova na hora
          // e meus dados (Badges/Perfil) reaparecem
          if (!supabase) return
          const { data: { session: currentSession }, error } = await supabase.auth.getSession()
          
          if (!error && currentSession) {
            // Atualiza o estado se a sessão mudou (token renovado ou nova sessão)
            // Usa ref para comparar sem causar loops de dependência
            if (currentSession.access_token !== sessionRef.current?.access_token) {
              setSession(currentSession)
              setUser(currentSession.user)
            }
          } else if (!currentSession) {
            // Sessão expirou ou foi invalidada
            setSession(null)
            setUser(null)
          }
        } catch (error) {
        }
      }
    }

    // Adiciona listener de visibilitychange para revalidar quando a aba volta ao foco
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      // Remove listeners para evitar memory leaks
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, []) // Dependências vazias - listeners são estáticos

  const signOut = async () => {
    if (!isSupabaseConfigured() || !supabase) {
      return
    }

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setSession(null)
    } catch (error) {
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
