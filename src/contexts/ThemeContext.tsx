import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export type Theme = 'lofi' | 'cyberpunk' | 'zen'

// Dicionário de estilos estrito - cada tema é completamente isolado
export interface ThemeStyles {
  // Cores de fundo
  bg: {
    app: string
    card: string
    cardHover: string
  }
  // Cores de texto
  text: {
    primary: string
    secondary: string
  }
  // Cores de destaque
  accent: {
    color: string
    dark: string
    text: string
  }
  // Cores secundárias
  secondary: string
  // Cores de borda
  border: {
    color: string
  }
  // Estados
  states: {
    warning: string
    warningBg: string
    warningBorder: string
    error: string
    errorBg: string
    errorBorder: string
    success: string
    successBg: string
    successBorder: string
  }
  // Glassmorphism
  glass: {
    bg: string
    border: string
    shadow: string
  }
  // Inputs
  input: {
    glassBg: string
  }
  // Sombras
  shadows: {
    default: string
    dark: string
    modal: string
  }
  // Geometria
  geometry: {
    borderRadius: string
    borderRadiusClass: string // Classe Tailwind correspondente
  }
  // Backdrop
  backdrop: string
}

// Dicionário completo de temas
const THEMES: Record<Theme, ThemeStyles> = {
  lofi: {
    bg: {
      app: '#f5f2eb', // Bege/Areia suave - Warm Light (Kindle)
      card: '#e6e2d8', // Bege levemente mais escuro - Tom sobre Tom (5-10% diferença)
      cardHover: '#ddd9cf', // Bege um pouco mais escuro no hover
    },
    text: {
      primary: '#4a4036', // Marrom café suave - nunca preto puro
      secondary: '#6b5f52', // Marrom mais claro mas suave
    },
    accent: {
      color: '#d97757', // Laranja queimado
      dark: '#c46242',
      text: '#ffffff',
    },
    secondary: '#a8c5a0', // Verde sálvia
    border: {
      color: '#e8ddd4', // Bege suave
    },
    states: {
      warning: '#d97757',
      warningBg: 'rgba(217, 119, 87, 0.1)',
      warningBorder: 'rgba(217, 119, 87, 0.4)',
      error: '#c46242',
      errorBg: 'rgba(196, 98, 66, 0.1)',
      errorBorder: 'rgba(196, 98, 66, 0.4)',
      success: '#a8c5a0',
      successBg: 'rgba(168, 197, 160, 0.15)',
      successBorder: 'rgba(168, 197, 160, 0.5)',
    },
    glass: {
      bg: 'rgba(230, 226, 216, 0.95)', // Bege harmonizado com card - Tom sobre Tom
      border: 'rgba(218, 212, 200, 0.6)', // Borda suave e desaturada
      shadow: '0 8px 32px 0 rgba(74, 64, 54, 0.08)', // Sombra suave e reduzida
    },
    input: {
      glassBg: 'rgba(235, 231, 221, 0.9)', // Bege levemente mais claro - harmonizado
    },
    shadows: {
      default: 'rgba(217, 119, 87, 0.15)',
      dark: 'rgba(0, 0, 0, 0.08)',
      modal: 'rgba(0, 0, 0, 0.25)',
    },
    geometry: {
      borderRadius: '1.5rem', // rounded-3xl (24px)
      borderRadiusClass: 'rounded-3xl',
    },
    backdrop: 'rgba(0, 0, 0, 0.3)',
  },
  cyberpunk: {
    bg: {
      app: '#050505', // Preto quase absoluto, para o Ciano brilhar
      card: '#0f1115', // Cinza Carvão profundo - Tom sobre Tom (5-10% diferença)
      cardHover: '#181b21', // Levemente mais claro no hover
    },
    text: {
      primary: '#e5e7eb', // Cinza muito claro - reduz brilho, mantém legibilidade
      secondary: '#9ca3af', // Cinza médio suave
    },
    accent: {
      color: '#00ffff', // CIANO - APENAS CIANO
      dark: '#00cccc',
      text: '#000000', // Preto para alto contraste
    },
    secondary: '#00ffff', // CIANO também
    border: {
      color: 'rgba(6, 78, 59, 0.5)', // Ciano reduzido (cyan-900/50) - borda sutil, neon só no texto
    },
    states: {
      warning: '#00ffff',
      warningBg: 'rgba(0, 255, 255, 0.2)',
      warningBorder: 'rgba(0, 255, 255, 0.6)',
      error: '#00cccc',
      errorBg: 'rgba(0, 204, 204, 0.2)',
      errorBorder: 'rgba(0, 204, 204, 0.6)',
      success: '#00ffff',
      successBg: 'rgba(0, 255, 255, 0.2)',
      successBorder: 'rgba(0, 255, 255, 0.6)',
    },
    glass: {
      bg: 'rgba(15, 17, 21, 0.95)', // Harmonizado com card - Tom sobre Tom
      border: 'rgba(6, 78, 59, 0.3)', // Borda ciano reduzida e sutil
      shadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)', // Sombra escura, sem neon
    },
    input: {
      glassBg: 'rgba(24, 27, 33, 0.9)', // Harmonizado com cardHover
    },
    shadows: {
      default: 'rgba(0, 255, 255, 0.3)',
      dark: 'rgba(0, 0, 0, 0.4)',
      modal: 'rgba(0, 0, 0, 0.6)',
    },
    geometry: {
      borderRadius: '0px', // rounded-none - 100% quadrado
      borderRadiusClass: 'rounded-none',
    },
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  zen: {
    bg: {
      app: '#1c2e26', // Verde Floresta Escuro - Ardósia/Musgo Escuro
      card: '#253530', // Levemente mais claro - Tom sobre Tom (5-10% diferença)
      cardHover: '#2d3e35', // Levemente mais claro no hover
    },
    text: {
      primary: '#b8d4c0', // Verde menta bem pálido e desaturado
      secondary: '#8fa896', // Verde acinzentado suave e desaturado
    },
    accent: {
      color: '#5a8a6e', // Verde floresta médio - suave
      dark: '#4a7a5e',
      text: '#ffffff',
    },
    secondary: '#6b9a7e', // Verde floresta claro
    border: {
      color: 'rgba(90, 138, 110, 0.25)', // Verde translúcido suave
    },
    states: {
      warning: '#7ba88e',
      warningBg: 'rgba(123, 168, 142, 0.12)',
      warningBorder: 'rgba(123, 168, 142, 0.3)',
      error: '#8a7a6e',
      errorBg: 'rgba(138, 122, 110, 0.12)',
      errorBorder: 'rgba(138, 122, 110, 0.3)',
      success: '#6b9a7e',
      successBg: 'rgba(107, 154, 126, 0.12)',
      successBorder: 'rgba(107, 154, 126, 0.4)',
    },
    glass: {
      bg: 'rgba(37, 53, 48, 0.95)', // Harmonizado com card - Tom sobre Tom
      border: 'rgba(90, 138, 110, 0.2)', // Borda verde suave e reduzida
      shadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)', // Sombra escura e suave
    },
    input: {
      glassBg: 'rgba(45, 62, 53, 0.85)', // Harmonizado com cardHover
    },
    shadows: {
      default: 'rgba(90, 138, 110, 0.12)',
      dark: 'rgba(0, 0, 0, 0.15)',
      modal: 'rgba(0, 0, 0, 0.3)',
    },
    geometry: {
      borderRadius: '0.5rem', // rounded-lg (8px)
      borderRadiusClass: 'rounded-lg',
    },
    backdrop: 'rgba(0, 0, 0, 0.3)',
  },
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  styles: ThemeStyles
  // Helpers para classes comuns
  getBorderRadius: () => string
  getBorderRadiusClass: () => string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'app-theme'

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return (saved as Theme) || 'lofi'
  })

  const styles = THEMES[theme]

  // Aplica o tema ao documento e atualiza variáveis CSS
  useEffect(() => {
    // Remove classes de tema anteriores
    document.documentElement.classList.remove('theme-lofi', 'theme-cyberpunk', 'theme-zen')
    // Aplica a classe do tema atual
    document.documentElement.classList.add(`theme-${theme}`)
    // Mantém data-theme para compatibilidade
    document.documentElement.setAttribute('data-theme', theme)
    
    // Aplica variáveis CSS dinamicamente
    const root = document.documentElement
    root.style.setProperty('--bg-app', styles.bg.app)
    root.style.setProperty('--bg-card', styles.bg.card)
    root.style.setProperty('--bg-card-hover', styles.bg.cardHover)
    root.style.setProperty('--border-color', styles.border.color)
    root.style.setProperty('--text-primary', styles.text.primary)
    root.style.setProperty('--text-secondary', styles.text.secondary)
    root.style.setProperty('--accent', styles.accent.color)
    root.style.setProperty('--accent-dark', styles.accent.dark)
    root.style.setProperty('--accent-text', styles.accent.text)
    root.style.setProperty('--secondary', styles.secondary)
    root.style.setProperty('--warning', styles.states.warning)
    root.style.setProperty('--warning-bg', styles.states.warningBg)
    root.style.setProperty('--warning-border', styles.states.warningBorder)
    root.style.setProperty('--error', styles.states.error)
    root.style.setProperty('--error-bg', styles.states.errorBg)
    root.style.setProperty('--error-border', styles.states.errorBorder)
    root.style.setProperty('--success', styles.states.success)
    root.style.setProperty('--success-bg', styles.states.successBg)
    root.style.setProperty('--success-border', styles.states.successBorder)
    root.style.setProperty('--glass-bg', styles.glass.bg)
    root.style.setProperty('--glass-border', styles.glass.border)
    root.style.setProperty('--glass-shadow', styles.glass.shadow)
    root.style.setProperty('--input-glass-bg', styles.input.glassBg)
    root.style.setProperty('--shadow', styles.shadows.default)
    root.style.setProperty('--shadow-dark', styles.shadows.dark)
    root.style.setProperty('--shadow-modal', styles.shadows.modal)
    root.style.setProperty('--border-radius', styles.geometry.borderRadius)
    root.style.setProperty('--backdrop', styles.backdrop)
    
    // Salva no localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme, styles])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const getBorderRadius = () => styles.geometry.borderRadius
  const getBorderRadiusClass = () => styles.geometry.borderRadiusClass

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        styles,
        getBorderRadius,
        getBorderRadiusClass,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
