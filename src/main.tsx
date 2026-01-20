import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PomodoroProvider } from './contexts/PomodoroContext'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { useSettings } from './hooks/useSettings'
import { Toaster } from 'sonner'

// Componente wrapper para acessar settings no provider
const AppWithProviders = () => {
  const { settings, isLoading } = useSettings()
  
  // Mostra loading enquanto carrega configurações do Supabase
  if (isLoading) {
    return (
      <div className="min-h-screen bg-skin-base text-skin-text flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-skin-accent mx-auto mb-4"></div>
          <p className="text-skin-muted">Carregando configurações...</p>
        </div>
      </div>
    )
  }
  
  return (
    <PomodoroProvider settings={settings}>
      <App />
    </PomodoroProvider>
  )
}

// Componente para configurar o Toaster com o tema
const ThemedToaster = () => {
  const { styles, getBorderRadiusClass } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  
  // Classes dinâmicas baseadas no tema
  // Cyberpunk: Preto e Quadrado, com borda Ciano
  // Lofi: Creme e Redondo (rounded-3xl), parecendo um balão de fala
  // Zen: Verde Escura e Discreta
  const toastClasses = {
    toast: `glass border-2 shadow-xl ${borderRadiusClass} border-skin-border`,
    title: 'text-skin-text font-semibold',
    description: 'text-skin-muted text-sm',
    actionButton: 'bg-skin-accent text-skin-accent-text font-medium px-4 py-2 rounded-button',
    cancelButton: 'bg-skin-card text-skin-text border border-skin-border font-medium px-4 py-2 rounded-button',
    closeButton: 'text-skin-text hover:text-skin-accent',
  }
  
  return (
    <Toaster 
      position="top-center"
      offset={16}
      expand={true}
      richColors={false}
      gap={40}
      visibleToasts={5}
      closeButton={true}
      toastOptions={{
        classNames: toastClasses,
        style: {
          // Força o background a ser controlado pelo Tailwind, não pelo JS da lib
          background: 'transparent',
          border: 'none', // Deixa o Tailwind controlar a borda
          color: styles.text.primary,
        },
        unstyled: false, // Permite que o Tailwind sobrescreva estilos nativos
      }}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AppWithProviders />
        {/* Toaster para notificações - no topo da árvore */}
        <ThemedToaster />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
