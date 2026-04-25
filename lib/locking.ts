import { serviceDb } from './db';
import { env } from './env';

// Unit locking is the heart of the booking flow. The invariant we protect:
// at any moment, an "available" unit can be locked by at most one checkout
// session. The DB enforces this via the units_lock_pair_chk constraint and
// the conditional UPDATE below.
//
// Lock lifecycle:
//   1. acquire(): atomically claim the unit if available + unlocked-or-expired
//   2. either checkout completes  -> lease is created with status='active',
//      the partial unique index on leases(unit_id) prevents double-booking,
//      release() is called to drop the lock
//   3. or checkout expires        -> release() drops the lock, expire-locks
//      cron also clears stale locks as a safety net.

export interface LockResult {
  acquired: boolean;
  expiresAt: Date | null;
}

export async function acquireUnitLock(params: {
  unitId: string;
  sessionId: string;
}): Promise<LockResult> {
  const db = serviceDb();
  const durationMs = env().UNIT_LOCK_DURATION_MINUTES * 60 * 1000;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMs);

  // Single-statement conditional update: succeeds only if the unit is
  // available AND (unlocked OR lock expired OR lock is already ours).
  const { data, error } = await db
    .from('units')
    .update({
      locked_until: expiresAt.toISOString(),
      locked_by_session_id: params.sessionId,
      updated_at: now.toISOString(),
    })
    .eq('id', params.unitId)
    .eq('status', 'available')
    .or(
      `locked_until.is.null,locked_until.lt.${now.toISOString()},locked_by_session_id.eq.${params.sessionId}`,
    )
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) return { acquired: false, expiresAt: null };
  return { acquired: true, expiresAt };
}

export async function releaseUnitLock(params: {
  unitId: string;
  sessionId: string;
}): Promise<void> {
  const db = serviceDb();
  // Only the holder can release. Webhook handlers pass the same session_id
  // we put on the unit during acquire().
  const { error } = await db
    .from('units')
    .update({
      locked_until: null,
      locked_by_session_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.unitId)
    .eq('locked_by_session_id', params.sessionId);
  if (error) throw error;
}

export async function expireStaleLocks(): Promise<{ cleared: number }> {
  const db = serviceDb();
  const { data, error } = await db
    .from('units')
    .update({
      locked_until: null,
      locked_by_session_id: null,
      updated_at: new Date().toISOString(),
    })
    .lt('locked_until', new Date().toISOString())
    .select('id');
  if (error) throw error;
  return { cleared: data?.length ?? 0 };
}
