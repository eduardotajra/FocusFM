-- Adiciona colunas de configurações do Pomodoro na tabela profiles
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pomodoro_settings JSONB DEFAULT '{
  "focusMinutes": 25,
  "shortBreakMinutes": 5,
  "longBreakMinutes": 15,
  "autoStartBreaks": false,
  "autoStartPomodoros": false
}'::jsonb;

-- Cria índice para melhorar performance (opcional)
CREATE INDEX IF NOT EXISTS idx_profiles_pomodoro_settings ON profiles USING gin (pomodoro_settings);

-- Comentário explicativo
COMMENT ON COLUMN profiles.pomodoro_settings IS 'Configurações personalizadas do Pomodoro Timer por usuário';
