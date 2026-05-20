import Link from 'next/link';
import { SiteFooter } from '@/lib/site-footer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPolicy() {
  const orgName = process.env.ORG_NAME ?? 'Storage Co';
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-xs text-slate-500 underline-offset-2 hover:underline">
          ← Home
        </Link>
        <header className="mt-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {today}</p>
        </header>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong>Template notice:</strong> Have your attorney review this document before
          publishing. It is provided as a starting point and does not constitute legal
          advice.
        </div>

        <Section title="Overview">
          <p>
            This policy explains how {orgName} (&quot;we&quot;, &quot;our&quot;) collects
            and uses information when you reserve a storage unit, manage an active lease,
            or otherwise interact with this website.
          </p>
        </Section>

        <Section title="1. Information we collect">
          <ul>
            <li>
              <strong>Identifiers:</strong> name, email address, phone number, and (if
              required for the lease) billing address.
            </li>
            <li>
              <strong>Payment information:</strong> processed and stored by our payment
              processor, Stripe. We never store full card numbers on our servers.
            </li>
            <li>
              <strong>Communications:</strong> copies of emails and SMS messages we send
              you in connection with your rental.
            </li>
            <li>
              <strong>Usage data:</strong> standard server logs (IP address, user agent,
              timestamps).
            </li>
          </ul>
        </Section>

        <Section title="2. How we use information">
          <ul>
            <li>To take reservations, manage leases, and process recurring rent.</li>
            <li>
              To send transactional emails (confirmations, receipts, owner statements) and
              SMS reminders about past-due balances.
            </li>
            <li>
              To comply with legal obligations and enforce lien rights on abandoned units
              under applicable state law.
            </li>
          </ul>
        </Section>

        <Section title="3. Service providers">
          <p>
            We share information with the providers that run our infrastructure. Each is
            bound by their own privacy and security practices.
          </p>
          <ul>
            <li>Stripe — payments and subscriptions</li>
            <li>Twilio — SMS</li>
            <li>Resend — transactional email</li>
            <li>Supabase — database and authentication</li>
            <li>Vercel — web hosting</li>
          </ul>
        </Section>

        <Section title="4. SMS and STOP keyword">
          <p>
            If you reply STOP to any SMS we send, we add your number to our opt-out list
            and will not contact you by SMS again. Standard message and data rates apply.
          </p>
        </Section>

        <Section title="5. Data retention">
          <p>
            We keep lease and payment records while you are an active tenant and for at
            least seven years after your lease ends, to meet tax and audit requirements.
          </p>
        </Section>

        <Section title="6. Your rights">
          <p>
            You may request a copy of your information, ask us to correct it, or ask us to
            delete it (subject to our retention obligations) by emailing the address below.
          </p>
        </Section>

        <Section title="7. Children">
          <p>
            This service is not directed at children under 13, and we do not knowingly
            collect their information.
          </p>
        </Section>

        <Section title="8. Changes">
          <p>
            We may update this policy. If we do, we will post the new version here and
            update the &quot;last updated&quot; date.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            {orgName}
            <br />
            [Mailing address — to be filled in]
            <br />
            [Contact email — to be filled in]
          </p>
        </Section>
      </div>
      <SiteFooter />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 text-sm leading-relaxed text-slate-700 [&_strong]:text-slate-900 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
