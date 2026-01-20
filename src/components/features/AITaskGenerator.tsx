import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Plus, Check, X, Trash2 } from 'lucide-react'
import { usePomodoro } from '../../contexts/PomodoroContext'
import { useTheme } from '../../contexts/ThemeContext'

export const AITaskGenerator = () => {
  const { styles, getBorderRadiusClass, theme } = useTheme()
  const borderRadiusClass = getBorderRadiusClass()
  const [prompt, setPrompt] = useState('')
  const [tasks, setTasks] = useState<string[]>([])
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [newTaskValue, setNewTaskValue] = useState<string>('')
  const [isAddingTask, setIsAddingTask] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  const newTaskInputRef = useRef<HTMLInputElement>(null)
  const { setSessionTypeAndTask } = usePomodoro()

  // Foca no input quando começa a editar
  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingIndex])

  // Foca no input quando começa a adicionar tarefa
  useEffect(() => {
    if (isAddingTask && newTaskInputRef.current) {
      newTaskInputRef.current.focus()
    }
  }, [isAddingTask])

  const generateTasks = async () => {
    if (!prompt.trim()) {
      setError('Por favor, insira um objetivo')
      return
    }

    setIsLoading(true)
    setError(null)
    setTasks([])

    try {
      const response = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      // Lê o texto da resposta (só pode ser lido uma vez)
      const text = await response.text()
      
      // Verifica se a resposta está vazia
      if (!text || text.trim().length === 0) {
        throw new Error('Resposta vazia do servidor')
      }

      // Verifica o content-type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Resposta inválida: ${text.substring(0, 100)}`)
      }

      // Tenta fazer parse do JSON
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error(`Erro ao processar JSON: ${text.substring(0, 100)}`)
      }

      // Verifica se houve erro na resposta
      if (!response.ok) {
        const errorMsg = data.error || data.message || `Erro ${response.status}: ${response.statusText}`
        // Mostra mensagem mais detalhada incluindo o status
        throw new Error(`${errorMsg} (Status: ${response.status})`)
      }

      // Valida o formato da resposta
      if (!data.tasks || !Array.isArray(data.tasks)) {
        throw new Error('Formato de resposta inválido: esperado array de tarefas')
      }

      setTasks(data.tasks)
    } catch (err) {
      // Tratamento específico para diferentes tipos de erro
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Erro de conexão. Em desenvolvimento local, use "vercel dev" para testar a API ou faça deploy no Vercel.')
      } else if (err instanceof SyntaxError) {
        setError('Erro ao processar resposta do servidor.')
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao gerar tarefas'
        // Mostra a mensagem completa do erro para debug
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToTimer = (task: string) => {
    // Muda para modo foco e define a tarefa atual em uma única operação
    // Isso garante que ambas as atualizações sejam aplicadas atomicamente
    setSessionTypeAndTask('foco', task)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      generateTasks()
    }
  }

  const handleEditStart = (index: number, task: string) => {
    setEditingIndex(index)
    setEditingValue(task)
  }

  const handleEditSave = (index: number) => {
    if (editingValue.trim()) {
      const updatedTasks = [...tasks]
      updatedTasks[index] = editingValue.trim()
      setTasks(updatedTasks)
    }
    setEditingIndex(null)
    setEditingValue('')
  }

  const handleEditCancel = () => {
    setEditingIndex(null)
    setEditingValue('')
  }

  const handleDelete = (index: number) => {
    const updatedTasks = tasks.filter((_, i) => i !== index)
    setTasks(updatedTasks)
    // Se estava editando e deletou a tarefa sendo editada, cancela edição
    if (editingIndex === index) {
      setEditingIndex(null)
      setEditingValue('')
    }
  }

  const handleAddTask = () => {
    if (newTaskValue.trim()) {
      setTasks([...tasks, newTaskValue.trim()])
      setNewTaskValue('')
      setIsAddingTask(false)
    }
  }

  const handleCancelAddTask = () => {
    setIsAddingTask(false)
    setNewTaskValue('')
  }

  const handleKeyPressEdit = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      handleEditSave(index)
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  const handleKeyPressNewTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask()
    } else if (e.key === 'Escape') {
      handleCancelAddTask()
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ willChange: 'transform, opacity' }}
      className={`w-full max-w-2xl mx-auto p-6 glass ${borderRadiusClass} shadow-theme`}
    >
      <h3 className="text-xl font-bold text-skin-text mb-4">Gerador de Tarefas com IA</h3>
      
      {/* Input e Botão */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Qual seu objetivo hoje?"
          className={`flex-1 px-4 py-3 border-2 border-skin-border ${borderRadiusClass} text-skin-text bg-transparent placeholder-skin-muted focus:outline-none focus:ring-2 focus:ring-skin-accent focus:border-skin-accent`}
          style={{ borderColor: styles.border.color, color: styles.text.primary }}
          disabled={isLoading}
        />
        <motion.button
          onClick={generateTasks}
          disabled={isLoading || !prompt.trim()}
          className={`px-6 py-3 ${borderRadiusClass} font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-theme outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
          style={{
            backgroundColor: styles.accent.color,
            color: theme === 'cyberpunk' ? '#000000' : styles.accent.text,
            willChange: 'transform'
          }}
          whileHover={{ scale: isLoading ? 1 : 1.05 }}
          whileTap={{ scale: isLoading ? 1 : 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="hidden sm:inline" style={{ color: 'inherit' }}>Gerando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span className="hidden sm:inline" style={{ color: 'inherit' }}>Gerar com IA</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Mensagem de Erro */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-3 ${borderRadiusClass} text-sm`}
            style={{
              backgroundColor: styles.states.errorBg,
              border: `1px solid ${styles.states.errorBorder}`,
              color: styles.states.error,
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="flex flex-col items-center gap-3"
            >
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: styles.accent.color }} />
              <p className="text-sm" style={{ color: styles.text.secondary }}>Gerando tarefas com IA...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Tarefas */}
      <AnimatePresence>
        {tasks.length > 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3 mt-4"
          >
            <h4 className="text-lg font-semibold text-skin-text mb-3">Tarefas Geradas:</h4>
            {tasks.map((task, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`group flex items-center gap-2 p-4 glass border ${borderRadiusClass}`}
                style={{ 
                  willChange: 'transform, opacity',
                  borderColor: styles.border.color
                }}
                onMouseEnter={() => {}}
              >
                {/* Conteúdo da Tarefa */}
                {editingIndex === index ? (
                  // Modo Edição
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => handleKeyPressEdit(e, index)}
                      className={`flex-1 px-3 py-2 border-2 border-skin-border ${borderRadiusClass} text-skin-text bg-transparent focus:outline-none focus:ring-2 focus:ring-skin-accent focus:border-skin-accent`}
                      style={{ borderColor: styles.border.color, color: styles.text.primary }}
                    />
                    <motion.button
                      onClick={() => handleEditSave(index)}
                      className={`p-2 ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                      style={{
                        backgroundColor: styles.accent.color,
                        color: theme === 'cyberpunk' ? '#000000' : styles.accent.text,
                        willChange: 'transform'
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      aria-label="Salvar"
                    >
                      <Check className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      onClick={handleEditCancel}
                      className={`p-2 border ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                      style={{ 
                        willChange: 'transform, opacity',
                        backgroundColor: theme === 'cyberpunk' ? '#0a0a0a' : styles.bg.card,
                        borderColor: styles.border.color,
                        color: styles.text.primary
                      }}
                      whileHover={{ scale: 1.05, opacity: 0.9 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      aria-label="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                ) : (
                  // Modo Visualização
                  <>
                    <motion.span
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleEditStart(index, task)
                      }}
                      onMouseDown={(e) => {
                        // Previne que o clique no texto interfira com os botões
                        if ((e.target as HTMLElement).closest('button')) {
                          e.stopPropagation()
                        }
                      }}
                      className={`text-skin-text flex-1 cursor-pointer select-none ${
                        completedTasks.has(index) ? 'line-through' : ''
                      }`}
                      animate={{
                        opacity: completedTasks.has(index) ? 0.5 : 1,
                      }}
                      style={{ color: completedTasks.has(index) ? styles.text.secondary : styles.text.primary, willChange: 'opacity, color' }}
                      transition={{ duration: 0.3 }}
                    >
                      {task}
                    </motion.span>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete(index)
                        }}
                        type="button"
                        className={`p-2 border ${borderRadiusClass} opacity-0 group-hover:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                        style={{ 
                          backgroundColor: theme === 'cyberpunk' ? '#0a0a0a' : styles.bg.card,
                          borderColor: styles.border.color,
                          color: styles.states.error,
                          willChange: 'transform, opacity'
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        aria-label="Excluir tarefa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                      {completedTasks.has(index) ? (
                        <motion.button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const newCompleted = new Set(completedTasks)
                            newCompleted.delete(index)
                            setCompletedTasks(newCompleted)
                          }}
                          type="button"
                          className={`px-4 py-2 border ${borderRadiusClass} flex items-center gap-2 text-sm font-semibold shadow-theme outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                          style={{ 
                            backgroundColor: theme === 'cyberpunk' ? '#0a0a0a' : styles.states.success,
                            borderColor: styles.states.success,
                            color: theme === 'cyberpunk' ? styles.states.success : '#ffffff',
                            willChange: 'transform, opacity'
                          }}
                          whileHover={{ scale: 1.05, opacity: 0.9 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <X className="w-4 h-4" />
                          <span className="hidden sm:inline">Desmarcar</span>
                          <span className="sm:hidden">✕</span>
                        </motion.button>
                      ) : (
                        <>
                          <motion.button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const newCompleted = new Set(completedTasks)
                              newCompleted.add(index)
                              setCompletedTasks(newCompleted)
                            }}
                            type="button"
                            className={`px-4 py-2 border ${borderRadiusClass} flex items-center gap-2 text-sm font-semibold shadow-theme opacity-60 group-hover:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                            style={{ 
                              backgroundColor: theme === 'cyberpunk' ? '#0a0a0a' : styles.states.success,
                              borderColor: styles.states.success,
                              color: theme === 'cyberpunk' ? styles.states.success : '#ffffff',
                              willChange: 'transform, opacity'
                            }}
                            whileHover={{ scale: 1.05, opacity: 0.9 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          >
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">Concluir</span>
                            <span className="sm:hidden">✓</span>
                          </motion.button>
                          <motion.button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleAddToTimer(task)
                            }}
                            type="button"
                            className={`px-4 py-2 ${borderRadiusClass} flex items-center gap-2 text-sm font-semibold shadow-theme opacity-60 group-hover:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                            style={{
                              backgroundColor: styles.accent.color,
                              color: theme === 'cyberpunk' ? '#000000' : styles.accent.text,
                              willChange: 'transform, opacity'
                            }}
                            whileHover={{ scale: 1.05, opacity: 0.9 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline" style={{ color: 'inherit' }}>Adicionar ao Timer</span>
                            <span className="sm:hidden" style={{ color: 'inherit' }}>Adicionar</span>
                          </motion.button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            ))}

            {/* Botão para Adicionar Tarefa Manualmente */}
            {isAddingTask ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 p-4 glass border-2 border-skin-border ${borderRadiusClass}`}
                style={{ borderColor: styles.border.color }}
              >
                <input
                  ref={newTaskInputRef}
                  type="text"
                  value={newTaskValue}
                  onChange={(e) => setNewTaskValue(e.target.value)}
                  onKeyDown={handleKeyPressNewTask}
                  placeholder="Digite a nova tarefa..."
                  className={`flex-1 px-3 py-2 border-2 border-skin-border ${borderRadiusClass} text-skin-text bg-transparent placeholder-skin-muted focus:outline-none focus:ring-2 focus:ring-skin-accent focus:border-skin-accent`}
                  style={{ borderColor: styles.border.color, color: styles.text.primary }}
                />
                <motion.button
                  onClick={handleAddTask}
                  disabled={!newTaskValue.trim()}
                  className={`p-2 ${borderRadiusClass} disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                  style={{
                    backgroundColor: styles.accent.color,
                    color: theme === 'cyberpunk' ? '#000000' : styles.accent.text,
                    willChange: 'transform'
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  aria-label="Salvar tarefa"
                >
                  <Check className="w-4 h-4" />
                </motion.button>
                <motion.button
                  onClick={handleCancelAddTask}
                  className={`p-2 border ${borderRadiusClass} outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                  style={{ 
                    backgroundColor: theme === 'cyberpunk' ? '#0a0a0a' : styles.bg.card,
                    borderColor: styles.border.color,
                    color: styles.text.primary,
                    willChange: 'transform'
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  aria-label="Cancelar"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                onClick={() => setIsAddingTask(true)}
                className={`w-full p-4 glass border-2 border-dashed ${borderRadiusClass} flex items-center justify-center gap-2 text-skin-text outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                style={{ 
                  willChange: 'transform, opacity',
                  borderColor: styles.border.color,
                  color: styles.text.primary
                }}
                whileHover={{ scale: 1.02, opacity: 0.9 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tasks.length * 0.1 }}
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Adicionar Tarefa Manualmente</span>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
