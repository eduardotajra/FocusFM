import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { BADGES } from '../constants/badges'
import type { BadgeStats } from '../constants/badges'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

export async function checkAndAwardBadges(
  userId: string,
  stats: BadgeStats
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    // Supabase não configurado, não faz nada
    return
  }
  
  try {
    // Busca badges que o usuário já possui
    // IMPORTANTE: Sempre busca do Supabase para garantir sincronização entre dispositivos
    const { data: existingBadges, error: fetchError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId)

    // Se a tabela não existe ou há erro de permissão, apenas retorna silenciosamente
    if (fetchError) {
      // Ignora erros de tabela não encontrada ou permissão (códigos comuns: 42P01, PGRST116)
      if (fetchError.code === '42P01' || fetchError.code === 'PGRST116' || fetchError.message?.includes('does not exist')) {
        return
      }
      return
    }

    const ownedBadgeIds = new Set(existingBadges?.map((b) => b.badge_id) || [])

    // Verifica cada badge
    for (const badge of BADGES) {
      // Se já possui, pula
      if (ownedBadgeIds.has(badge.id)) {
        continue
      }

      // Verifica se a condição foi atendida
      if (badge.condition(stats)) {
        
        // Tenta inserir a badge
        // IMPORTANTE: Usa INSERT com ON CONFLICT DO NOTHING no banco para evitar race conditions
        // Se dois dispositivos tentarem conceder a mesma badge simultaneamente, apenas um sucederá
        const { error: insertError } = await supabase
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: badge.id,
          })

        // Ignora erros de duplicate key (já tem a badge) ou tabela não existe
        if (insertError) {
          if (insertError.code === '23505') {
            // Duplicate key - badge já existe (provavelmente concedida em outro dispositivo)
            continue
          }
          if (insertError.code === '42P01' || insertError.code === 'PGRST116' || insertError.message?.includes('does not exist')) {
            return
          }
          continue
        }

        // Badge NOVA concedida! Dispara confete e toast
        triggerConfetti()
        // Adiciona um pequeno delay para evitar sobreposição com outras notificações
        setTimeout(() => {
          toast.success(`Nova Conquista: ${badge.name}!`, {
            description: badge.description,
            duration: 5000,
            id: `badge-${badge.id}`, // ID único para evitar duplicatas
          })
        }, 500)
      }
    }
  } catch (error) {
  }
}

function triggerConfetti() {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    })
  }, 250)
}
