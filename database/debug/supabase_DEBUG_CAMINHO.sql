-- ============================================
-- DEBUG: Verificar Caminho do Arquivo
-- ============================================
-- Execute este script para ver como o Supabase armazena o caminho
-- Isso ajuda a entender qual função usar nas políticas
-- ============================================

-- 1. Ver arquivos existentes no bucket avatars (se houver)
SELECT 
    name as caminho_completo,
    storage.foldername(name) as array_pastas,
    (storage.foldername(name))[1] as primeira_pasta,
    split_part(name, '/', 1) as split_part_1,
    split_part(name, '/', 2) as split_part_2,
    bucket_id
FROM storage.objects
WHERE bucket_id = 'avatars'
LIMIT 10;

-- 2. Ver seu user_id atual (execute enquanto estiver logado)
SELECT 
    auth.uid() as seu_user_id,
    auth.uid()::text as seu_user_id_texto,
    (select auth.uid())::text as seu_user_id_select;

-- 3. Testar comparação (ajuste o caminho manualmente se necessário)
-- Substitua 'SEU_USER_ID_AQUI' pelo seu user_id real
SELECT 
    'avatars/SEU_USER_ID_AQUI/avatar.png' as caminho_teste,
    storage.foldername('avatars/SEU_USER_ID_AQUI/avatar.png') as array_pastas,
    (storage.foldername('avatars/SEU_USER_ID_AQUI/avatar.png'))[1] as primeira_pasta,
    split_part('avatars/SEU_USER_ID_AQUI/avatar.png', '/', 1) as split_1,
    split_part('avatars/SEU_USER_ID_AQUI/avatar.png', '/', 2) as split_2,
    split_part('avatars/SEU_USER_ID_AQUI/avatar.png', '/', 3) as split_3;

-- 4. Testar com caminho relativo ao bucket (sem prefixo avatars/)
-- O name no storage.objects geralmente NÃO inclui o nome do bucket
SELECT 
    'SEU_USER_ID_AQUI/avatar.png' as caminho_relativo,
    storage.foldername('SEU_USER_ID_AQUI/avatar.png') as array_pastas,
    (storage.foldername('SEU_USER_ID_AQUI/avatar.png'))[1] as primeira_pasta,
    split_part('SEU_USER_ID_AQUI/avatar.png', '/', 1) as split_1,
    split_part('SEU_USER_ID_AQUI/avatar.png', '/', 2) as split_2;
