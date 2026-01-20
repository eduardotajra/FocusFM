import { useMemo, useState, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, startOfWeek, addDays, parseISO } from 'date-fns'
import type { FocusHistoryEntry } from '../../hooks/usePomodoro'
import { useTheme } from '../../hooks/useTheme'

interface HistoryChartProps {
  data: FocusHistoryEntry[]
}

interface ChartDataPoint {
  day: string
  minutes: number
  date: Date
  entries: FocusHistoryEntry[]
}

// Componente de Tooltip customizado
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value?: number
    payload?: ChartDataPoint
  }>
}

const CustomTooltip = (props: CustomTooltipProps) => {
  const { active, payload } = props
  const { theme } = useTheme()
  
  // Usa variáveis CSS do tema em vez de cores hardcoded
  const colors = useMemo(() => {
    return {
      background: 'var(--color-surface)',
      text: 'var(--color-text)',
      border: 'var(--color-border)',
    }
  }, [theme])

  if (!active || !payload || !payload.length) {
    return null
  }

  try {
    const data = payload[0].payload as ChartDataPoint
    const totalMinutes = payload[0].value as number
    
    if (!data || !data.date) {
      return null
    }
    
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    const dayName = dayNames[data.date.getDay()]
    const day = data.date.getDate()
    const month = monthNames[data.date.getMonth()]
    
    return (
      <div
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '12px',
          color: colors.text,
          boxShadow: '0 4px 6px var(--color-shadow-dark)',
        }}
      >
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          {`${dayName}, ${day} de ${month}`}
        </p>
        <p style={{ marginBottom: '4px' }}>
          <strong>Total:</strong> {totalMinutes} minutos ({Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m)
        </p>
        {data.entries && data.entries.length > 0 && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>Sessões:</p>
            {data.entries.map((entry) => (
              <p key={entry.id} style={{ fontSize: '12px', marginBottom: '2px' }}>
                • {format(parseISO(entry.date), 'HH:mm')} - {entry.durationInMinutes}min
              </p>
            ))}
          </div>
        )}
      </div>
    )
  } catch {
    return null
  }
}

export const HistoryChart = ({ data }: HistoryChartProps) => {
  const { theme } = useTheme()
  const [isAnimated, setIsAnimated] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Usa variáveis CSS do tema em vez de cores hardcoded
  const colors = useMemo(() => {
    return {
      bar: 'var(--color-primary)',
      text: 'var(--color-text)',
      grid: 'var(--color-shadow)',
      background: 'var(--color-surface)',
    }
  }, [theme])

  // Agrupa dados dos últimos 7 dias
  const chartData = useMemo(() => {
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Segunda-feira
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    // Nomes dos dias da semana começando na segunda
    const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

    return days.map((day, index) => {
      // Cria nova data para o dia (sem mutar o original)
      const dayDate = new Date(day)
      const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0)

      // Filtra entradas deste dia
      const dayEntries = data.filter((entry) => {
        const entryDate = parseISO(entry.date)
        const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate())
        const currentDay = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate())
        
        // Compara apenas ano, mês e dia (ignora hora)
        return entryDay.getTime() === currentDay.getTime()
      })

      // Soma os minutos focados neste dia
      const totalMinutes = dayEntries.reduce((sum, entry) => sum + entry.durationInMinutes, 0)
      
      return {
        day: dayNames[index],
        minutes: totalMinutes,
        date: new Date(day),
        entries: dayEntries,
      } as ChartDataPoint
    })
  }, [data])

  // Garante que o container tenha dimensões antes de renderizar
  useEffect(() => {
    const checkDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          setIsReady(true)
        }
      }
    }

    // Verifica imediatamente
    checkDimensions()
    
    // Verifica após um pequeno delay para garantir que o DOM está pronto
    const timer = setTimeout(checkDimensions, 100)
    
    // Verifica quando a janela redimensiona
    window.addEventListener('resize', checkDimensions)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', checkDimensions)
    }
  }, [])

  // Trigger da animação quando o componente monta
  useEffect(() => {
    if (isReady) {
      setIsAnimated(false)
      const timer = setTimeout(() => {
        setIsAnimated(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [data, isReady])

  // Se não há dados, mostra mensagem encorajadora
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div 
          className="p-6 rounded-button border-2 text-center max-w-md"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <p 
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--color-primary)' }}
          >
            Nenhum dado ainda
          </p>
          <p 
            className="text-base mb-4"
            style={{ color: 'var(--color-text)', opacity: 0.8 }}
          >
            Complete sua primeira sessão Pomodoro para começar a ver suas estatísticas de produtividade!
          </p>
          <p 
            className="text-sm"
            style={{ color: 'var(--color-text)', opacity: 0.6 }}
          >
            Dica: Inicie uma sessão de foco e complete-a para registrar seu progresso.
          </p>
        </div>
      </div>
    )
  }

  try {
    // Não renderiza o gráfico até ter dimensões válidas
    if (!isReady) {
      return (
        <div 
          ref={containerRef}
          className="w-full"
          style={{ 
            height: '400px',
            minHeight: '400px',
            width: '100%',
            minWidth: '300px',
            position: 'relative',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: 'var(--color-text)', opacity: 0.7 }}>Carregando gráfico...</p>
        </div>
      )
    }

    return (
      <div 
        ref={containerRef}
        className="w-full"
        style={{ 
          height: '400px',
          minHeight: '400px',
          width: '100%',
          minWidth: '300px',
          position: 'relative',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            minWidth: '300px',
            minHeight: '300px',
            position: 'relative',
          }}
        >
          <ResponsiveContainer 
            width="100%" 
            height="100%"
            minHeight={300}
            minWidth={300}
            debounce={1}
          >
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis 
              dataKey="day" 
              tick={{ fill: colors.text }}
              style={{ fontSize: '14px' }}
            />
            <YAxis 
              tick={{ fill: colors.text }}
              style={{ fontSize: '14px' }}
              label={{ 
                value: 'Minutos', 
                angle: -90, 
                position: 'insideLeft',
                fill: colors.text,
                style: { fontSize: '14px' }
              }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--color-shadow-dark)' }}
            />
            <Bar 
              dataKey="minutes" 
              fill={colors.bar}
              radius={[8, 8, 0, 0]}
              isAnimationActive={isAnimated}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    )
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <p 
          className="text-lg text-center"
          style={{ color: 'var(--color-text)', opacity: 0.7 }}
        >
          Erro ao carregar gráfico.
        </p>
      </div>
    )
  }
}
