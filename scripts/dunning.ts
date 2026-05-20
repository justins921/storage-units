// Standalone runner for the daily dunning cron.
//
// Run with: tsx --env-file=.env scripts/dunning.ts

import { runDunningOnce } from '../lib/dunning';

async function main(): Promise<void> {
  const result = await runDunningOnce();
  console.log('[cron:dunning]', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
