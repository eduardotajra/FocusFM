import { 
  Trophy, 
  Moon, 
  Sparkles, 
  Flame, 
  Clock, 
  Target, 
  Zap, 
  Star,
  Award,
  Crown
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { SVGProps } from 'react'

export interface Badge {
  id: string
  name: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  color: string
  condition: (stats: BadgeStats) => boolean
}

export interface BadgeStats {
  totalSessions: number
  currentHour: number
  consecutiveDays: number
  totalMinutes: number
}

export const BADGES: Badge[] = [
  {
    id: 'first_focus',
    name: 'Iniciado',
    description: 'Completou a 1ª sessão de foco',
    icon: Trophy,
    color: 'text-yellow-400',
    condition: (stats) => stats.totalSessions >= 1
  },
  {
    id: 'night_owl',
    name: 'Coruja Noturna',
    description: 'Completou uma sessão entre 22h e 04h',
    icon: Moon,
    color: 'text-indigo-400',
    condition: (stats) => stats.currentHour >= 22 || stats.currentHour < 4
  },
  {
    id: 'zen_master',
    name: 'Zen Master',
    description: 'Completou 5 sessões no total',
    icon: Sparkles,
    color: 'text-purple-400',
    condition: (stats) => stats.totalSessions >= 5
  },
  {
    id: 'fire_starter',
    name: 'Fire Starter',
    description: 'Completou 10 sessões no total',
    icon: Flame,
    color: 'text-orange-400',
    condition: (stats) => stats.totalSessions >= 10
  },
  {
    id: 'time_master',
    name: 'Mestre do Tempo',
    description: 'Acumulou 100 minutos de foco',
    icon: Clock,
    color: 'text-blue-400',
    condition: (stats) => stats.totalMinutes >= 100
  },
  {
    id: 'focused',
    name: 'Focado',
    description: 'Manteve foco por 3 dias consecutivos',
    icon: Target,
    color: 'text-green-400',
    condition: (stats) => stats.consecutiveDays >= 3
  },
  {
    id: 'speed_demon',
    name: 'Demônio da Velocidade',
    description: 'Completou 3 sessões em menos de 2 horas',
    icon: Zap,
    color: 'text-yellow-500',
    condition: () => false // Implementar lógica específica se necessário
  },
  {
    id: 'rising_star',
    name: 'Estrela em Ascensão',
    description: 'Acumulou 500 minutos de foco',
    icon: Star,
    color: 'text-pink-400',
    condition: (stats) => stats.totalMinutes >= 500
  },
  {
    id: 'champion',
    name: 'Campeão',
    description: 'Completou 25 sessões no total',
    icon: Award,
    color: 'text-red-400',
    condition: (stats) => stats.totalSessions >= 25
  },
  {
    id: 'legend',
    name: 'Lenda',
    description: 'Completou 50 sessões no total',
    icon: Crown,
    color: 'text-amber-500',
    condition: (stats) => stats.totalSessions >= 50
  }
]
