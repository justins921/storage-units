import { NextResponse } from 'next/server';
import { currentManager } from '@/lib/auth';
import { serviceDb } from '@/lib/db';
import { renderStatementPdf } from '@/lib/pdf/owner-statement';
import type { StatementSnapshot } from '@/lib/statements';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const manager = await currentManager();

  const { data } = await serviceDb()
    .from('owner_statements')
    .select('id, facility_id, snapshot_json')
    .eq('id', id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!manager.facility_access.includes(data.facility_id as string)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const snapshot = data.snapshot_json as StatementSnapshot;
  const pdf = await renderStatementPdf(snapshot);
  return new Response(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="statement-${snapshot.facility.slug}-${snapshot.period_start}.pdf"`,
    },
  });
}
