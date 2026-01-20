-- ============================================
-- TABELA SESSION_HISTORY
-- ============================================
-- Registra todas as sessões (foco, pausas) com detalhes completos
-- Permite retomar sessões interrompidas

CREATE TABLE IF NOT EXISTS public.session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('foco', 'pausa curta', 'pausa longa')),
  target_duration INTEGER NOT NULL CHECK (target_duration > 0), -- Duração planejada em segundos
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0), -- Duração real em segundos
  status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'MANUAL_STOP')), -- Status da sessão
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_session_history_user_id ON public.session_history(user_id);
CREATE INDEX IF NOT EXISTS idx_session_history_finished_at ON public.session_history(finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_history_status ON public.session_history(status);
CREATE INDEX IF NOT EXISTS idx_session_history_session_type ON public.session_history(session_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE public.session_history ENABLE ROW LEVEL SECURITY;

-- Policy 1: Usuário pode inserir apenas suas próprias sessões
CREATE POLICY "Usuário pode inserir próprias sessões de histórico"
  ON public.session_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Usuário pode ler apenas suas próprias sessões
CREATE POLICY "Usuário pode ler próprias sessões de histórico"
  ON public.session_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Usuário pode deletar apenas suas próprias sessões
CREATE POLICY "Usuário pode deletar próprias sessões de histórico"
  ON public.session_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy 4: Usuário pode atualizar apenas suas próprias sessões
CREATE POLICY "Usuário pode atualizar próprias sessões de histórico"
  ON public.session_history
  FOR UPDATE
  USING (auth.uid() = user_id);
