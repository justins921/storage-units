import { NextResponse } from 'next/server';
import { serviceDb } from '@/lib/db';
import { smsProvider } from '@/lib/providers';

export const runtime = 'nodejs';

// Inbound SMS webhook. Twilio sends form-urlencoded; mock provider can
// hit this with JSON. We only care about STOP-class keywords.
const STOP_KEYWORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);

export async function POST(req: Request): Promise<Response> {
  const contentType = req.headers.get('content-type') ?? '';
  let from = '';
  let body = '';
  if (contentType.includes('application/json')) {
    const json = (await req.json()) as { from?: string; body?: string };
    from = json.from ?? '';
    body = json.body ?? '';
  } else {
    const form = await req.formData();
    from = String(form.get('From') ?? '');
    body = String(form.get('Body') ?? '');
  }

  const normalized = body.trim().toUpperCase();
  if (!STOP_KEYWORDS.has(normalized)) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (!from) {
    return NextResponse.json({ error: 'missing from' }, { status: 400 });
  }

  await serviceDb()
    .from('sms_opt_outs')
    .upsert({ phone: from, source: 'inbound_keyword' }, { onConflict: 'phone' });
  await smsProvider().recordStop(from);

  return NextResponse.json({ ok: true, recorded: true });
}
