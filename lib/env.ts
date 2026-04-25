import { z } from 'zod';

const ProviderMode = z.enum(['mock', 'stripe', 'twilio', 'resend']);

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Org / branding
  ROOT_DOMAIN: z.string().default('localhost:3000'),
  ORG_NAME: z.string().default('Storage Co'),
  ORG_SLUG: z.string().default('storage'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Provider selection
  PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
  SMS_PROVIDER: z.enum(['mock', 'twilio']).default('mock'),
  EMAIL_PROVIDER: z.enum(['mock', 'resend']).default('mock'),

  // Stripe (optional unless PAYMENT_PROVIDER=stripe)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Twilio (optional unless SMS_PROVIDER=twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // Resend (optional unless EMAIL_PROVIDER=resend)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  // Booking
  UNIT_LOCK_DURATION_MINUTES: z
    .string()
    .default('15')
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().positive()),

  // Cron auth
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof Schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = Schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const ProviderModeEnum = ProviderMode;
