import { serviceDb } from './db';

// Append-only audit trail for every manual admin action. Every server
// action that mutates lease/payment state must call this.

export interface AuditInput {
  facilityId: string | null;
  actorManagerId: string | null;
  action: string;
  targetTable?: string;
  targetId?: string | null;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  const { error } = await serviceDb().from('audit_log').insert({
    facility_id: input.facilityId,
    actor_manager_id: input.actorManagerId,
    action: input.action,
    target_table: input.targetTable ?? null,
    target_id: input.targetId ?? null,
    notes: input.notes ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}
