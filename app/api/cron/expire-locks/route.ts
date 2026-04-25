import { NextResponse } from 'next/server';
import { expireStaleLocks } from '@/lib/locking';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

// Periodic cleanup. Even though the lock-aware availability query already
// treats expired locks as free, this releases the columns so the units
// table reads cleanly in the admin UI.
//
// Auth: optional CRON_SECRET. Railway/cron scheduler sends it via
// Authorization: Bearer <secret>.
export async function POST(req: Request): Promise<Response> {
  const expected = env().CRON_SECRET;
  if (expected) {
    const got = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (got !== expected) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  const result = await expireStaleLocks();
  return NextResponse.json(result);
}

export async function GET(req: Request): Promise<Response> {
  return POST(req);
}
