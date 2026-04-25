// Standalone runner for the lock-expiry cron, suitable for invocation by
// Railway cron without going through the HTTP layer.
//
// Run with: tsx --env-file=.env scripts/expire-locks.ts

import { expireStaleLocks } from '../lib/locking';

async function main(): Promise<void> {
  const result = await expireStaleLocks();
  console.log(`[cron:expire-locks] cleared=${result.cleared}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
