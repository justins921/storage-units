import { NextResponse } from 'next/server';
import { runDunningOnce } from '@/lib/dunning';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

// Daily cron. Idempotent: dunning_log has a unique (lease_id, template_key)
// constraint that prevents double-sends across retries.
export async function POST(req: Request): Promise<Response> {
  const expected = env().CRON_SECRET;
  if (expected) {
    const got = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (got !== expected) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  const result = await runDunningOnce();
  return NextResponse.json(result);
}

export async function GET(req: Request): Promise<Response> {
  return POST(req);
}
