import { motion, AnimatePresence } from 'framer-motion'
import { X, Brain, Coffee, Repeat, Moon } from 'lucide-react'

interface HowItWorksModalProps {
  isOpen: boolean
  onClose: () => void
}

const pomodoroSteps = [
  {
    icon: Brain,
    title: '25 min',
    description: 'Foco Total',
    color: 'var(--color-primary)',
  },
  {
    icon: Coffee,
    title: '5 min',
    description: 'Pausa Curta',
    color: 'var(--color-accent)',
  },
  {
    icon: Repeat,
    title: '4 Ciclos',
    description: 'Repetição',
    color: 'var(--color-text-muted)',
  },
  {
    icon: Moon,
    title: '15 min',
    description: 'Pausa Longa',
    color: 'var(--color-primary-dark)',
  },
]

const breakActivities = [
  {
    type: 'Pausa Curta',
    activities: ['Alongar', 'Beber água', 'Respirar fundo', 'Olhar pela janela'],
  },
  {
    type: 'Pausa Longa',
    activities: ['Caminhar', 'Redes sociais', 'Lanche saudável', 'Conversar'],
  },
]

export const HowItWorksModal = ({ isOpen, onClose }: HowItWorksModalProps) => {

  const themeColors = {
    background: 'var(--color-surface)',
    border: 'var(--color-border)',
    text: 'var(--color-text)',
    highlight: 'var(--color-primary)',
    muted: 'var(--color-text-muted)',
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
            className="fixed inset-0 backdrop-blur-md z-50"
            style={{ backgroundColor: 'var(--color-backdrop)' }}
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
              className="glass border-2 rounded-button shadow-theme max-w-2xl w-full max-h-[85vh] overflow-hidden pointer-events-auto"
              style={{
                borderColor: themeColors.border,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-6 border-b-2"
                style={{ borderColor: themeColors.border }}
              >
                <h2
                  className="text-2xl font-bold"
                  style={{ color: themeColors.text }}
                >
                  Como Funciona o Pomodoro
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  style={{ color: themeColors.text }}
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
                {/* Timeline */}
                <div className="mb-8">
                  <h3
                    className="text-lg font-semibold mb-4"
                    style={{ color: themeColors.text }}
                  >
                    Ciclo Completo
                  </h3>
                  <div className="relative">
                    {/* Linha conectora */}
                    <div
                      className="absolute top-12 left-0 right-0 h-0.5"
                      style={{ backgroundColor: themeColors.border }}
                    />

                    {/* Steps */}
                    <div className="flex justify-between items-start relative z-10">
                      {pomodoroSteps.map((step, index) => {
                        const Icon = step.icon
                        return (
                          <motion.div
                            key={step.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: index * 0.15,
                              duration: 0.4,
                              type: 'spring',
                              stiffness: 200,
                              damping: 20,
                            }}
                            className="flex flex-col items-center flex-1"
                          >
                            {/* Ícone */}
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center border-2 mb-3 shadow-lg"
                              style={{
                                backgroundColor: themeColors.background,
                                borderColor: step.color,
                              }}
                            >
                              <Icon
                                className="w-8 h-8"
                                style={{ color: step.color }}
                              />
                            </div>

                            {/* Título */}
                            <h4
                              className="text-sm font-bold mb-1"
                              style={{ color: themeColors.text }}
                            >
                              {step.title}
                            </h4>

                            {/* Descrição */}
                            <p
                              className="text-xs text-center"
                              style={{ color: themeColors.muted }}
                            >
                              {step.description}
                            </p>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Tabela de Referência */}
                <div className="mt-8">
                  <h3
                    className="text-lg font-semibold mb-4"
                    style={{ color: themeColors.text }}
                  >
                    Sugestões de Atividades
                  </h3>
                  <div className="space-y-4">
                    {breakActivities.map((breakType, index) => (
                      <motion.div
                        key={breakType.type}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.6 + index * 0.1,
                          duration: 0.4,
                        }}
                        className="border-2 rounded-button p-4"
                        style={{
                          borderColor: themeColors.border,
                          backgroundColor: themeColors.background,
                        }}
                      >
                        <h4
                          className="font-semibold mb-2"
                          style={{ color: themeColors.highlight }}
                        >
                          {breakType.type}
                        </h4>
                        <ul className="grid grid-cols-2 gap-2">
                          {breakType.activities.map((activity, actIndex) => (
                            <motion.li
                              key={activity}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                delay: 0.7 + index * 0.1 + actIndex * 0.05,
                                duration: 0.3,
                              }}
                              className="flex items-center gap-2 text-sm"
                              style={{ color: themeColors.text }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: themeColors.highlight }}
                              />
                              {activity}
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Dica Final */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.4 }}
                  className="mt-6 p-4 rounded-button"
                  style={{
                    backgroundColor: 'var(--color-primary-bg, rgba(192, 132, 252, 0.1))',
                    border: '1px solid var(--color-primary-border, rgba(192, 132, 252, 0.3))',
                  }}
                >
                  <p
                    className="text-sm text-center"
                    style={{ color: themeColors.text }}
                  >
                    <strong>Dica:</strong> Complete 4 ciclos de foco antes de fazer uma pausa longa.
                    Isso mantém sua produtividade alta e evita o esgotamento.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
