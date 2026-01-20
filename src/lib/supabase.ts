import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  // Validação de segurança: garante que não estamos usando a chave secreta (service_role)
  const isSecretKey = 
    supabaseAnonKey.includes('service_role') || 
    supabaseAnonKey.includes('service-role') ||
    supabaseAnonKey.length > 250 ||
    supabaseAnonKey.startsWith('sb_') && supabaseAnonKey.includes('secret')

  if (isSecretKey) {
    console.error('ERRO DE SEGURANCA DETECTADO!')
    console.error('Chave detectada:', supabaseAnonKey.substring(0, 50) + '...')
    console.error(
      'ERRO DE SEGURANCA: Voce esta usando a chave SECRETA (service_role) em vez da chave ANONIMA (anon).\n\n' +
      'A chave secreta NUNCA deve ser usada no navegador!\n\n' +
      'SOLUCAO:\n' +
      '1. Abra o Dashboard do Supabase\n' +
      '2. Va em Settings > API\n' +
      '3. Copie a chave "anon public" (nao a "service_role")\n' +
      '4. Cole no arquivo .env.local como VITE_SUPABASE_ANON_KEY\n\n' +
      'A chave anon public e segura para usar no navegador e geralmente comeca com "eyJ..."'
    )
    // Não cria o cliente se a chave for inválida
  } else {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase.auth.token',
      },
    })
  }
} else {
  console.warn(
    'Variaveis de ambiente do Supabase nao configuradas.\n' +
    'A aplicacao funcionara em modo offline.\n' +
    'Para habilitar funcionalidades online, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local'
  )
}

// Exporta o cliente ou null se não estiver configurado
export { supabase }

// Helper para verificar se o Supabase está disponível
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null
}
