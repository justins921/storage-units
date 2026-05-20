import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { env } from './env';

// Per-request authed Supabase client. Honors RLS via the caller's session
// cookie, which means a server component using this client only sees rows
// the calling manager's facility_access[] allows.

export async function authedDb() {
  const cookieStore = await cookies();
  const e = env();
  return createServerClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          for (const c of cookiesToSet) {
            cookieStore.set(c.name, c.value, c.options);
          }
        } catch {
          // Server Components cannot set cookies; ignore. Refresh tokens
          // are still handled by the middleware on the next request.
        }
      },
    },
  });
}
