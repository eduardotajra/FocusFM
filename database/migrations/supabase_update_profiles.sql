-- ============================================
-- ATUALIZAÇÃO: Garantir que profiles tenha username único (permite NULL)
-- ============================================

-- Garante que a coluna username existe (permite NULL)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Remove constraint NOT NULL se existir
DO $$ 
BEGIN
  ALTER TABLE public.profiles 
  ALTER COLUMN username DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Remove constraint única antiga se existir
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_username_unique;

-- Remove índice único antigo se existir
DROP INDEX IF EXISTS idx_profiles_username_unique;

-- Cria índice único apenas para valores não nulos
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique 
  ON public.profiles(username) 
  WHERE username IS NOT NULL;

-- Atualiza perfis existentes sem username (tenta usar metadados do OAuth)
UPDATE public.profiles
SET username = COALESCE(
  NULLIF(username, ''),
  (SELECT raw_user_meta_data->>'preferred_username' FROM auth.users WHERE id = profiles.id),
  (SELECT raw_user_meta_data->>'user_name' FROM auth.users WHERE id = profiles.id),
  (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = profiles.id),
  (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = profiles.id),
  (SELECT split_part(email, '@', 1) FROM auth.users WHERE id = profiles.id)
)
WHERE username IS NULL OR username = '' OR username LIKE 'user_%';
