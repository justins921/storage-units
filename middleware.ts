import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Gate /admin behind a signed-in Supabase user. Manager-row validation
// (and facility scoping) happens in lib/auth.ts on every page request.

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  if (!path.startsWith('/admin')) return res;
  if (path.startsWith('/admin/login') || path.startsWith('/admin/auth')) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          for (const c of cookies) {
            res.cookies.set(c.name, c.value, c.options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
