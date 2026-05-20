// Standalone runner for the monthly owner-statements cron.
//
// Run with: tsx --env-file=.env scripts/owner-statements.ts

import { serviceDb } from '../lib/db';
import {
  generateStatement,
  previousMonthPeriod,
  saveStatement,
  type StatementSnapshot,
} from '../lib/statements';
import { renderStatementPdf } from '../lib/pdf/owner-statement';
import { emailProvider } from '../lib/providers';

async function main(): Promise<void> {
  const period = previousMonthPeriod();
  const db = serviceDb();
  const { data: facilities, error } = await db.from('facilities').select('id, slug, name');
  if (error) throw error;
  const out = { generated: 0, emailed: 0, errors: [] as string[] };

  for (const f of (facilities ?? []) as { id: string; slug: string; name: string }[]) {
    try {
      const snapshot = await generateStatement(f.id, period.start, period.end);
      const { id } = await saveStatement(snapshot);
      out.generated++;
      await emailToManagers(snapshot, id, out);
    } catch (err) {
      out.errors.push(`${f.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log('[cron:owner-statements]', out);
}

async function emailToManagers(
  snapshot: StatementSnapshot,
  statementId: string,
  out: { emailed: number; errors: string[] },
): Promise<void> {
  const db = serviceDb();
  const { data: managers } = await db
    .from('managers')
    .select('email')
    .contains('facility_access', [snapshot.facility.id]);
  if (!managers || managers.length === 0) return;

  const pdf = await renderStatementPdf(snapshot);
  const pdfBase64 = pdf.toString('base64');
  const subject = `${snapshot.facility.name} — Owner statement ${snapshot.period_start} to ${snapshot.period_end}`;
  for (const m of managers as { email: string }[]) {
    try {
      await emailProvider().send({
        to: m.email,
        subject,
        text: `Net payout: $${(snapshot.totals.net_payout_cents / 100).toFixed(2)}.`,
        html: `<p>Net payout: $${(snapshot.totals.net_payout_cents / 100).toFixed(2)}. See attached.</p>`,
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
      out.errors.push(`email ${m.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  await db
    .from('owner_statements')
    .update({ emailed_at: new Date().toISOString() })
    .eq('id', statementId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
