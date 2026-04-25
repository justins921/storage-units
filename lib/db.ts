import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// Service-role client. Bypasses RLS. Use ONLY in trusted server contexts:
// webhook handlers, cron jobs, seed scripts, admin server actions.
let serviceClient: SupabaseClient | null = null;

export function serviceDb(): SupabaseClient {
  if (serviceClient) return serviceClient;
  const e = env();
  serviceClient = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

// Anonymous client. Subject to RLS. Use for public, unauthenticated reads
// like the facility landing page (RLS allows this only via explicit policies
// — for now, public reads happen via service role through server components).
let anonClient: SupabaseClient | null = null;

export function anonDb(): SupabaseClient {
  if (anonClient) return anonClient;
  const e = env();
  anonClient = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anonClient;
}
