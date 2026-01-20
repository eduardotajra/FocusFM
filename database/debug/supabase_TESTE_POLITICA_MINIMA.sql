-- ============================================
-- TESTE: Política Mínima para Diagnóstico
-- ============================================
-- Execute este script para testar se o problema é com a verificação do caminho
-- ou com algo mais fundamental (autenticação, RLS, etc.)
-- ============================================

-- Remove políticas de teste anteriores
DROP POLICY IF EXISTS "avatars_temp_test" ON storage.objects;

-- Cria uma política MUITO simples que permite qualquer upload autenticado
-- Se esta funcionar, o problema está na verificação do caminho do arquivo
-- Se não funcionar, o problema é mais fundamental
CREATE POLICY "avatars_temp_test"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- ============================================
-- INSTRUÇÕES:
-- ============================================
-- 1. Execute este script
-- 2. Tente fazer upload de um avatar no app
-- 3. Se funcionar: O problema está na verificação do caminho (foldername/regexp)
-- 4. Se não funcionar: O problema é mais fundamental:
--    - RLS não está habilitado corretamente
--    - Usuário não está autenticado
--    - Bucket não existe ou não está público
--    - Permissões do Supabase
--
-- 5. APÓS O TESTE, REMOVA ESTA POLÍTICA:
--    DROP POLICY IF EXISTS "avatars_temp_test" ON storage.objects;
-- ============================================
