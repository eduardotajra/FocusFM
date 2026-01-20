-- ============================================
-- TABELA USER_BADGES
-- ============================================
-- Armazena as conquistas (badges) que cada usuário ganhou

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT user_badges_unique UNIQUE (user_id, badge_id)
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON public.user_badges(earned_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Policy 1: Usuário pode ler suas próprias badges
CREATE POLICY "Usuário pode ler próprias badges"
  ON public.user_badges
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Usuário pode inserir suas próprias badges
CREATE POLICY "Usuário pode inserir próprias badges"
  ON public.user_badges
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Qualquer pessoa pode ler badges de outros usuários (para gamificação)
CREATE POLICY "Badges públicas - leitura permitida para todos"
  ON public.user_badges
  FOR SELECT
  USING (true);
