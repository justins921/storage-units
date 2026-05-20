import { NextResponse } from 'next/server';
import { authedDb } from '@/lib/server-supabase';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  const supabase = await authedDb();
  await supabase.auth.signOut();
  const url = new URL('/admin/login', req.url);
  return NextResponse.redirect(url, { status: 303 });
}
