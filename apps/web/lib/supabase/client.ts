import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para el browser.
 * Solo usa la anon key. RLS protege los datos.
 * NUNCA incluir SERVICE_ROLE_KEY aquí.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
