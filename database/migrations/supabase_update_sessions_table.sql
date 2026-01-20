-- ============================================
-- ATUALIZAÇÃO: Tabela sessions para histórico completo
-- ============================================
-- Esta migração atualiza a tabela session_history para ter os campos
-- necessários para o sistema de histórico e estatísticas

-- Renomeia a tabela existente se necessário (backup)
-- ALTER TABLE IF EXISTS public.session_history RENAME TO session_history_backup;

-- Cria a nova tabela sessions (ou atualiza a existente)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('FOCUS', 'SHORT_BREAK', 'LONG_BREAK')),
  duration INTEGER NOT NULL CHECK (duration > 0), -- Duração em segundos
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'ABANDONED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON public.sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_mode ON public.sessions(mode);
CREATE INDEX IF NOT EXISTS idx_sessions_user_completed ON public.sessions(user_id, completed_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Usuário pode inserir apenas suas próprias sessões
DROP POLICY IF EXISTS "Usuário pode inserir próprias sessões" ON public.sessions;
CREATE POLICY "Usuário pode inserir próprias sessões"
  ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Usuário pode ler apenas suas próprias sessões
DROP POLICY IF EXISTS "Usuário pode ler próprias sessões" ON public.sessions;
CREATE POLICY "Usuário pode ler próprias sessões"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Usuário pode deletar apenas suas próprias sessões
DROP POLICY IF EXISTS "Usuário pode deletar próprias sessões" ON public.sessions;
CREATE POLICY "Usuário pode deletar próprias sessões"
  ON public.sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comentários explicativos
COMMENT ON TABLE public.sessions IS 'Registra todas as sessões do Pomodoro (foco e pausas) com status de conclusão';
COMMENT ON COLUMN public.sessions.mode IS 'Tipo de sessão: FOCUS, SHORT_BREAK, ou LONG_BREAK';
COMMENT ON COLUMN public.sessions.duration IS 'Duração planejada da sessão em segundos';
COMMENT ON COLUMN public.sessions.status IS 'Status: COMPLETED (completou) ou ABANDONED (parou antes)';
