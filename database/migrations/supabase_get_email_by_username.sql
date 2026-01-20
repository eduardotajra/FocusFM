-- ============================================
-- FUNÇÃO: Buscar email pelo username
-- ============================================
-- Esta função permite buscar o email de um usuário baseado no seu username
-- É necessária para permitir login com username ou email
-- IMPORTANTE: Esta função é pública (SECURITY DEFINER) para permitir que usuários
-- não autenticados possam buscar o email para fazer login
-- 
-- ATENÇÃO: Esta função precisa de permissões especiais para acessar auth.users
-- Se a função não funcionar, verifique as permissões no Supabase Dashboard

CREATE OR REPLACE FUNCTION public.get_email_by_username(username_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_email TEXT;
  user_id_val UUID;
BEGIN
  -- Primeiro, busca o id do profile baseado no username
  SELECT p.id INTO user_id_val
  FROM public.profiles p
  WHERE p.username = username_param
  LIMIT 1;
  
  -- Se não encontrou o username, retorna NULL
  IF user_id_val IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Busca o email na tabela auth.users usando o id
  SELECT au.email INTO user_email
  FROM auth.users au
  WHERE au.id = user_id_val
  LIMIT 1;
  
  RETURN user_email;
END;
$$;

-- Permite que usuários anônimos (não autenticados) possam executar esta função
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- Comentário explicativo
COMMENT ON FUNCTION public.get_email_by_username IS 
'Busca o email de um usuário baseado no seu username. Usada para permitir login com username ou email. Requer SECURITY DEFINER para acessar auth.users.';
