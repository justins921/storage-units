import { NextResponse } from 'next/server';
import { serviceDb } from '@/lib/db';
import {
  generateStatement,
  previousMonthPeriod,
  saveStatement,
  type StatementSnapshot,
} from '@/lib/statements';
import { renderStatementPdf } from '@/lib/pdf/owner-statement';
import { emailProvider } from '@/lib/providers';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

// Monthly cron, intended to run on the 8th. Generates last month's
// statement per facility and emails it to managers with facility access.

interface RunResult {
  generated: number;
  emailed: number;
  errors: { facility: string; message: string }[];
}

export async function POST(req: Request): Promise<Response> {
  const expected = env().CRON_SECRET;
  if (expected) {
    const got = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (got !== expected) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const period = previousMonthPeriod();
  const db = serviceDb();
  const { data: facilities, error } = await db.from('facilities').select('id, slug, name');
  if (error) throw error;

  const out: RunResult = { generated: 0, emailed: 0, errors: [] };

  for (const f of (facilities ?? []) as { id: string; slug: string; name: string }[]) {
    try {
      const snapshot = await generateStatement(f.id, period.start, period.end);
      const { id } = await saveStatement(snapshot);
      out.generated++;
      await emailStatement(snapshot, id, out);
    } catch (err) {
      out.errors.push({
        facility: f.slug,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json(out);
}

export async function GET(req: Request): Promise<Response> {
  return POST(req);
}

async function emailStatement(
  snapshot: StatementSnapshot,
  statementId: string,
  out: RunResult,
): Promise<void> {
  const db = serviceDb();
  const { data: managers } = await db
    .from('managers')
    .select('email, facility_access')
    .contains('facility_access', [snapshot.facility.id]);

  if (!managers || managers.length === 0) return;

  const pdf = await renderStatementPdf(snapshot);
  const pdfBase64 = pdf.toString('base64');
  const subject = `${snapshot.facility.name} — Owner statement ${snapshot.period_start} to ${snapshot.period_end}`;
  const text = `Net payout: $${(snapshot.totals.net_payout_cents / 100).toFixed(2)}. See attached PDF.`;
  const html = `<p>${text}</p>`;

  for (const m of managers as { email: string }[]) {
    try {
      await emailProvider().send({
        to: m.email,
        subject,
        text,
        html,
        attachments: [
          {
            filename: `statement-${snapshot.facility.slug}-${snapshot.period_start}.pdf`,
            contentBase64: pdfBase64,
            contentType: 'application/pdf',
          },
        ],
      });
      out.emailed++;
    } catch (err) {
      out.errors.push({
        facility: snapshot.facility.slug,
        message: `email ${m.email}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  await db
    .from('owner_statements')
    .update({ emailed_at: new Date().toISOString() })
    .eq('id', statementId);
}
