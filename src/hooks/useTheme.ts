import { useState, useEffect } from 'react'

export type Theme = 'lofi' | 'cyberpunk' | 'zen'

const THEME_STORAGE_KEY = 'app-theme'

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return (saved as Theme) || 'lofi'
  })

  useEffect(() => {
    // Remove classes de tema anteriores
    document.documentElement.classList.remove('theme-lofi', 'theme-cyberpunk', 'theme-zen')
    // Aplica a classe do tema atual
    document.documentElement.classList.add(`theme-${theme}`)
    // Mantém data-theme para compatibilidade
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  return { theme, setTheme }
}
