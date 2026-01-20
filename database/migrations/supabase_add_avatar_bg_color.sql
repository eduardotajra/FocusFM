-- ============================================
-- MIGRAÇÃO: Adicionar coluna avatar_bg_color
-- ============================================
-- Adiciona a coluna avatar_bg_color à tabela profiles
-- para permitir personalização da cor de fundo do avatar

-- Adiciona a coluna se não existir
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_bg_color TEXT DEFAULT '#c084fc';

-- Atualiza perfis existentes sem cor de fundo para usar a cor padrão
UPDATE public.profiles
SET avatar_bg_color = '#c084fc'
WHERE avatar_bg_color IS NULL;
