-- ============================================
-- SCHEMA DO BANCO DE DADOS - FOCUSFM
-- Sistema de Gamificação com Supabase
-- ============================================

-- ============================================
-- 1. TABELA PROFILES
-- ============================================
-- Vinculada à tabela auth.users do Supabase
-- Armazena informações do perfil do usuário e estatísticas

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT, -- Permite NULL para usuários que ainda não definiram nickname
  avatar_url TEXT,
  avatar_bg_color TEXT DEFAULT '#c084fc', -- Cor de fundo do avatar (hex)
  total_minutes INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT profiles_username_unique UNIQUE NULLS NOT DISTINCT (username)
);

-- Índice para otimizar consultas de ranking
CREATE INDEX IF NOT EXISTS idx_profiles_total_minutes ON public.profiles(total_minutes DESC);

-- Índice para busca por username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ============================================
-- 2. TABELA FOCUS_SESSIONS
-- ============================================
-- Registra cada sessão de foco completada

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL CHECK (duration > 0), -- Duração em minutos
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_completed_at ON public.focus_sessions(completed_at DESC);

-- ============================================
-- 3. FUNCTION: Atualizar total_minutes automaticamente
-- ============================================
-- Esta função será chamada por uma trigger sempre que uma nova sessão for inserida

CREATE OR REPLACE FUNCTION public.update_user_total_minutes()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza o total_minutes do usuário somando a duração da nova sessão
  UPDATE public.profiles
  SET 
    total_minutes = total_minutes + NEW.duration,
    updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. TRIGGER: Dispara a função de atualização
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_total_minutes ON public.focus_sessions;

CREATE TRIGGER trigger_update_total_minutes
  AFTER INSERT ON public.focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_total_minutes();

-- ============================================
-- 5. FUNCTION: Criar perfil automaticamente
-- ============================================
-- Cria um perfil automaticamente quando um usuário se registra

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  preferred_username TEXT;
  avatar_url_value TEXT;
BEGIN
  -- Tenta extrair o username dos metadados do OAuth
  preferred_username := COALESCE(
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  -- Extrai avatar URL se disponível
  avatar_url_value := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  
      INSERT INTO public.profiles (id, username, avatar_url, avatar_bg_color, total_minutes)
      VALUES (
        NEW.id,
        preferred_username,
        avatar_url_value,
        '#c084fc', -- Cor padrão
        0
      );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGER: Criar perfil ao registrar usuário
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Habilita RLS nas tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES PARA PROFILES
-- ============================================

-- Policy 1: Qualquer pessoa pode ler o ranking (SELECT público)
-- Isso permite que todos vejam o ranking de produtividade
CREATE POLICY "Ranking público - leitura permitida para todos"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Policy 2: Usuário pode atualizar apenas seu próprio perfil
CREATE POLICY "Usuário pode atualizar próprio perfil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy 3: Usuário pode inserir apenas seu próprio perfil (caso não seja criado pelo trigger)
CREATE POLICY "Usuário pode inserir próprio perfil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- POLICIES PARA FOCUS_SESSIONS
-- ============================================

-- Policy 1: Usuário pode inserir apenas suas próprias sessões
CREATE POLICY "Usuário pode inserir próprias sessões"
  ON public.focus_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Usuário pode ler apenas suas próprias sessões
CREATE POLICY "Usuário pode ler próprias sessões"
  ON public.focus_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Usuário pode deletar apenas suas próprias sessões
CREATE POLICY "Usuário pode deletar próprias sessões"
  ON public.focus_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 8. VIEWS ÚTEIS (OPCIONAL)
-- ============================================

-- View para ranking simplificado
CREATE OR REPLACE VIEW public.ranking AS
SELECT 
  id,
  username,
  avatar_url,
  total_minutes,
  RANK() OVER (ORDER BY total_minutes DESC) as rank_position
FROM public.profiles
ORDER BY total_minutes DESC;

-- Permite leitura pública da view de ranking
GRANT SELECT ON public.ranking TO anon, authenticated;

-- ============================================
-- FIM DO SCHEMA
-- ============================================
