import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Cliente administrativo de Supabase (Service Role).
 * REGLA ESTRICTA DE SEGURIDAD (Sección 14):
 * - Protegido con `import 'server-only'` para impedir su inclusión en el bundle del navegador.
 * - Solo debe utilizarse en lógica de servidor verificada (procesamiento de webhooks,
 *   transacciones atómicas de stock, carritos de invitado y generación de Signed URLs de facturación).
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL en el servidor.'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
