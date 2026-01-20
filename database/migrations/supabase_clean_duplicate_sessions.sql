-- ============================================
-- LIMPEZA: Remover sessões duplicadas
-- ============================================
-- Este script remove sessões duplicadas da tabela sessions,
-- mantendo apenas a mais recente de cada grupo de duplicatas
-- baseado em user_id, mode, duration, completed_at (arredondado para o minuto)
--
-- IMPORTANTE: 
-- 1. Execute este script apenas UMA VEZ após corrigir o código
-- 2. O código agora tem proteção (isSavingRef) que previne novas duplicatas
-- 3. Este script limpa apenas as duplicatas existentes

-- Método 1: Remove duplicatas baseado em user_id, mode, duration e completed_at (arredondado)
-- Mantém apenas a sessão mais recente de cada grupo de duplicatas
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    mode,
    duration,
    -- Arredonda completed_at para o minuto mais próximo para agrupar duplicatas próximas
    DATE_TRUNC('minute', completed_at) as completed_minute,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY 
        user_id, 
        mode, 
        duration, 
        DATE_TRUNC('minute', completed_at),
        status
      ORDER BY completed_at DESC
    ) as rn
  FROM public.sessions
)
DELETE FROM public.sessions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Método 2 (Alternativo - mais agressivo): Remove duplicatas exatas
-- Se o método 1 não funcionar bem, use este (comente o método 1 e descomente este)
/*
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        user_id, 
        mode, 
        duration, 
        completed_at,
        status
      ORDER BY id DESC
    ) as rn
  FROM public.sessions
)
DELETE FROM public.sessions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
*/

-- Verifica quantas sessões restaram
SELECT 
  COUNT(*) as total_sessions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE mode = 'FOCUS') as focus_sessions,
  COUNT(*) FILTER (WHERE mode = 'SHORT_BREAK') as short_break_sessions,
  COUNT(*) FILTER (WHERE mode = 'LONG_BREAK') as long_break_sessions
FROM public.sessions;

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Este script remove duplicatas baseado em:
-- - user_id
-- - mode (FOCUS, SHORT_BREAK, LONG_BREAK)
-- - duration (duração em segundos)
-- - completed_at (arredondado para o minuto)
-- - status (COMPLETED, ABANDONED)
--
-- Mantém apenas a sessão mais recente de cada grupo de duplicatas.
--
-- Execute este script UMA VEZ após corrigir o código para evitar novas duplicatas.
-- O código agora tem proteção (isSavingRef) que previne gravações duplicadas.
