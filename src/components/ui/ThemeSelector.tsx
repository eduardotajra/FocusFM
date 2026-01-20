import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { Palette, Zap, Leaf } from 'lucide-react'

const themes = [
  {
    id: 'lofi' as const,
    name: 'Lofi',
    icon: Palette,
    description: 'Tons pastéis, bordas arredondadas',
  },
  {
    id: 'cyberpunk' as const,
    name: 'Cyberpunk',
    icon: Zap,
    description: 'Neon, fundo escuro, bordas afiadas',
  },
  {
    id: 'zen' as const,
    name: 'Zen',
    icon: Leaf,
    description: 'Verdes florestas, baixo contraste',
  },
]

export const ThemeSelector = () => {
  const { theme, setTheme, styles, getBorderRadiusClass } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fecha o dropdown quando clicar fora dele ou quando o dropdown do perfil abrir
  useEffect(() => {
    if (!showDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    const handleCloseProfileDropdown = () => {
      // Não faz nada - este é o listener para quando o perfil abre
    }

    const handleProfileDropdownOpened = () => {
      // Fecha este dropdown quando o perfil abrir
      setShowDropdown(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('close-theme-dropdown', handleCloseProfileDropdown)
    window.addEventListener('profile-dropdown-opened', handleProfileDropdownOpened)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('close-theme-dropdown', handleCloseProfileDropdown)
      window.removeEventListener('profile-dropdown-opened', handleProfileDropdownOpened)
    }
  }, [showDropdown])

  const currentTheme = themes.find(t => t.id === theme) || themes[0]
  const CurrentIcon = currentTheme.icon

  return (
    <div className="relative z-30" ref={dropdownRef}>
      {/* Botão do tema - abre/fecha dropdown */}
      <motion.button
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowDropdown(prev => {
            const newValue = !prev
            // Fecha o dropdown do perfil se este abrir
            if (newValue) {
              window.dispatchEvent(new CustomEvent('close-profile-dropdown'))
              window.dispatchEvent(new CustomEvent('theme-dropdown-opened'))
            }
            return newValue
          })
        }}
        className={`glass flex items-center gap-2 px-3 py-2 border ${borderRadiusClass} relative z-30 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2`}
        style={{ 
          pointerEvents: 'auto',
          willChange: 'transform',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        aria-label="Selecionar tema"
        aria-expanded={showDropdown}
        type="button"
      >
        <CurrentIcon className="w-4 h-4 text-skin-accent" />
        <span className="text-sm font-medium text-skin-text hidden sm:inline">
          Tema
        </span>
      </motion.button>

      {/* Dropdown do tema */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`absolute top-full right-0 mt-2 border-2 ${borderRadiusClass} shadow-theme min-w-[180px] z-[9999] overflow-hidden`}
            style={{
              backgroundColor: styles.bg.card,
              borderColor: styles.border.color,
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="py-2">
              {themes.map((themeOption) => {
                const Icon = themeOption.icon
                const isActive = theme === themeOption.id

                return (
                  <motion.button
                    key={themeOption.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setTheme(themeOption.id)
                      setShowDropdown(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium ${
                      themeOption.id !== themes[themes.length - 1].id ? '' : ''
                    } cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                    style={{ 
                      willChange: 'transform, background-color',
                      borderBottom: themeOption.id !== themes[themes.length - 1].id 
                        ? `1px solid ${styles.border.color}` 
                        : 'none',
                      color: isActive ? styles.accent.color : styles.text.primary,
                      backgroundColor: isActive 
                        ? theme === 'cyberpunk' 
                          ? 'rgba(0, 255, 255, 0.1)' 
                          : theme === 'zen'
                          ? 'rgba(90, 138, 110, 0.1)'
                          : 'rgba(217, 119, 87, 0.1)'
                        : 'transparent'
                    }}
                    whileHover={{ 
                      backgroundColor: theme === 'cyberpunk' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : theme === 'zen'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.05)'
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    type="button"
                  >
                    <Icon className="w-4 h-4" />
                    <div className="flex-1">
                      <div className="font-semibold">{themeOption.name}</div>
                      <div className="text-xs opacity-70">{themeOption.description}</div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-skin-accent" />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
