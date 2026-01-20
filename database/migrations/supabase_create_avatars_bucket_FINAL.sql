-- ============================================
-- CONFIGURAÇÃO FINAL DO BUCKET DE AVATARES
-- ============================================
-- Esta versão usa storage.foldername que é a função oficial do Supabase
-- e funciona melhor com a estrutura de pastas
-- ============================================

-- PASSO 1: Remover TODAS as políticas existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (
            policyname LIKE '%avatar%' OR 
            policyname LIKE '%Avatar%' OR
            policyname LIKE '%upload%' OR
            policyname LIKE '%Upload%' OR
            policyname LIKE '%temp%' OR
            policyname LIKE '%test%'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- PASSO 2: Criar políticas usando storage.foldername (função oficial do Supabase)
-- O caminho no código é: avatars/${user.id}/avatar.{ext}
-- storage.foldername(name) retorna um array com as pastas
-- [1] é a primeira pasta, que deve ser o user_id

-- Policy 1: INSERT - Usuários podem fazer upload em pastas com seu próprio ID
CREATE POLICY "avatars_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Policy 2: SELECT - Usuários podem ler seus próprios arquivos (necessário para upsert)
CREATE POLICY "avatars_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Policy 3: SELECT público - Qualquer pessoa pode ler avatares
CREATE POLICY "avatars_select_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy 4: UPDATE - Usuários podem atualizar seus próprios arquivos
CREATE POLICY "avatars_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (select auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Policy 5: DELETE - Usuários podem deletar seus próprios arquivos
CREATE POLICY "avatars_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (select auth.uid())::text
);

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute esta query para verificar se as políticas foram criadas:
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
-- AND tablename = 'objects'
-- AND policyname LIKE '%avatar%'
-- ORDER BY policyname;
