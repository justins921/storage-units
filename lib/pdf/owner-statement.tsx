import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import React from 'react';
import type { StatementSnapshot } from '../statements';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  h1: { fontSize: 18, marginBottom: 4, fontWeight: 'bold' },
  h2: { fontSize: 12, marginTop: 16, marginBottom: 6, fontWeight: 'bold' },
  meta: { color: '#666', fontSize: 9, marginBottom: 16 },
  headline: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#111',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  row: { flexDirection: 'row', borderBottom: '1pt solid #eee', paddingVertical: 4 },
  label: { width: '60%' },
  value: { width: '40%', textAlign: 'right' },
  th: { fontWeight: 'bold', borderBottom: '1pt solid #000' },
  td: {},
  unitRow: { flexDirection: 'row', paddingVertical: 3, borderBottom: '1pt solid #f0f0f0' },
  c1: { width: '15%' },
  c2: { width: '25%' },
  c3: { width: '25%' },
  c4: { width: '15%', textAlign: 'right' },
  c5: { width: '20%', textAlign: 'right' },
});

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function StatementDoc({ s }: { s: StatementSnapshot }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>{s.facility.name} — Owner statement</Text>
        <Text style={styles.meta}>
          {s.period_start} to {s.period_end}
        </Text>

        <View style={styles.headline}>
          <Text>Net payout: {dollars(s.totals.net_payout_cents)}</Text>
        </View>

        <Text style={styles.h2}>Totals</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Gross revenue</Text>
          <Text style={styles.value}>{dollars(s.totals.gross_cents)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Refunds</Text>
          <Text style={styles.value}>-{dollars(s.totals.refunds_cents)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Credits</Text>
          <Text style={styles.value}>-{dollars(s.totals.credits_cents)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Waives</Text>
          <Text style={styles.value}>-{dollars(s.totals.waives_cents)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Net payout</Text>
          <Text style={styles.value}>{dollars(s.totals.net_payout_cents)}</Text>
        </View>

        <Text style={styles.h2}>Outstanding</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Current platform</Text>
          <Text style={styles.value}>{dollars(s.totals.outstanding_current_cents)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Legacy (pre-platform)</Text>
          <Text style={styles.value}>{dollars(s.totals.outstanding_legacy_cents)}</Text>
        </View>

        <Text style={styles.h2}>Occupancy</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total units</Text>
          <Text style={styles.value}>{s.units.unit_count}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Occupied</Text>
          <Text style={styles.value}>{s.units.occupied_count}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Vacant</Text>
          <Text style={styles.value}>{s.units.vacant_count}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Occupancy %</Text>
          <Text style={styles.value}>{s.units.occupancy_percent}%</Text>
        </View>

        <Text style={styles.h2}>Unit-level breakdown</Text>
        <View style={[styles.unitRow, styles.th]}>
          <Text style={styles.c1}>Unit</Text>
          <Text style={styles.c2}>Type</Text>
          <Text style={styles.c3}>Tenant</Text>
          <Text style={styles.c4}>Status</Text>
          <Text style={styles.c5}>Paid</Text>
        </View>
        {s.breakdown.map((b) => (
          <View key={b.unit_id} style={styles.unitRow}>
            <Text style={styles.c1}>{b.label}</Text>
            <Text style={styles.c2}>{b.unit_type ?? '—'}</Text>
            <Text style={styles.c3}>{b.tenant_email ?? '—'}</Text>
            <Text style={styles.c4}>{b.status}</Text>
            <Text style={styles.c5}>{dollars(b.paid_in_period_cents)}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function renderStatementPdf(s: StatementSnapshot): Promise<Buffer> {
  return renderToBuffer(<StatementDoc s={s} />);
}
