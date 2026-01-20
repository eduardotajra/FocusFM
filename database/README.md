# Scripts SQL do Supabase

Esta pasta contém todos os scripts SQL necessários para configurar o banco de dados do FocusFM.

## Estrutura

```
database/
├── supabase_schema.sql          # Schema completo do banco de dados (execute primeiro)
├── migrations/                  # Scripts de migração (execute na ordem)
│   ├── supabase_create_user_badges.sql
│   ├── supabase_add_avatar_bg_color.sql
│   ├── supabase_add_pomodoro_settings.sql
│   ├── supabase_create_session_history.sql
│   ├── supabase_update_profiles.sql
│   └── supabase_create_avatars_bucket_FINAL.sql
└── debug/                       # Scripts de diagnóstico (opcional)
    ├── supabase_DEBUG_CAMINHO.sql
    ├── supabase_TESTE_POLITICA_MINIMA.sql
    └── supabase_VERIFICAR_POLITICAS_AVATARS.sql
```

## Ordem de Execução

### 1. Setup Inicial
Execute primeiro o schema completo:
```sql
-- Execute: database/supabase_schema.sql
```

### 2. Migrações
Execute as migrações na ordem (se necessário):
```sql
-- 1. Badges
database/migrations/supabase_create_user_badges.sql

-- 2. Avatar background color
database/migrations/supabase_add_avatar_bg_color.sql

-- 3. Pomodoro settings
database/migrations/supabase_add_pomodoro_settings.sql

-- 4. Session history
database/migrations/supabase_create_session_history.sql

-- 5. Profiles updates
database/migrations/supabase_update_profiles.sql

-- 6. Avatars bucket (Storage)
database/migrations/supabase_create_avatars_bucket_FINAL.sql
```

### 3. Debug (Opcional)
Se tiver problemas, use os scripts de debug:
```sql
-- Verificar políticas do bucket avatars
database/debug/supabase_VERIFICAR_POLITICAS_AVATARS.sql

-- Teste de política mínima
database/debug/supabase_TESTE_POLITICA_MINIMA.sql

-- Debug de caminhos
database/debug/supabase_DEBUG_CAMINHO.sql
```

## Notas

- Os scripts em `migrations/` são necessários para o funcionamento completo da aplicação
- Os scripts em `debug/` são apenas para diagnóstico e podem ser removidos após setup
- O `supabase_schema.sql` contém o schema completo e pode substituir as migrações individuais se você estiver começando do zero
