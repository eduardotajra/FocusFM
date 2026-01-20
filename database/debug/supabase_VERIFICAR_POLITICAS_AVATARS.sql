-- ============================================
-- SCRIPT DE DIAGNÓSTICO: Verificar Políticas de Avatares
-- ============================================
-- Execute este script para verificar se as políticas foram criadas corretamente
-- ============================================

-- 1. Verificar se o bucket existe
SELECT 
    name as bucket_name,
    public as is_public,
    created_at
FROM storage.buckets
WHERE name = 'avatars';

-- 2. Listar TODAS as políticas do storage.objects
SELECT 
    policyname as nome_politica,
    cmd as comando,
    roles as roles,
    qual as condicao_using,
    with_check as condicao_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 3. Verificar políticas específicas de avatars
SELECT 
    policyname as nome_politica,
    cmd as comando,
    CASE 
        WHEN cmd = 'INSERT' THEN 'Upload'
        WHEN cmd = 'SELECT' THEN 'Leitura'
        WHEN cmd = 'UPDATE' THEN 'Atualização'
        WHEN cmd = 'DELETE' THEN 'Exclusão'
    END as tipo_operacao,
    roles as roles
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (
    policyname LIKE '%avatar%' OR 
    policyname LIKE '%Avatar%'
)
ORDER BY cmd, policyname;

-- 4. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- 5. Testar se auth.uid() está funcionando (execute enquanto estiver logado)
SELECT 
    auth.uid() as user_id_atual,
    auth.uid()::text as user_id_texto,
    (SELECT auth.uid())::text as user_id_select;
