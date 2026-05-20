import Link from 'next/link';
import { SiteFooter } from '@/lib/site-footer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Terms of Service' };

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {today}</p>
        </header>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong>Template notice:</strong> Have your attorney review this document
          before publishing. State-specific self-storage statutes (lien procedures, late
          fees, notice periods) vary and must be reflected here.
        </div>

        <Section title="1. The service">
          <p>
            {orgName} (&quot;we&quot;, &quot;our&quot;) rents self-storage units on a
            month-to-month basis. By reserving a unit you agree to these Terms. Your
            rental begins when your first payment is received and continues until you
            give notice or we terminate it under these Terms.
          </p>
        </Section>

        <Section title="2. Account responsibilities">
          <p>
            You are responsible for the information you provide and for keeping your
            contact details current. You may not share your gate access code or unit keys
            with anyone you have not authorized.
          </p>
        </Section>

        <Section title="3. Payment">
          <ul>
            <li>Rent is billed monthly, in advance, to the payment method you provided.</li>
            <li>We charge automatically on the anniversary of your reservation.</li>
            <li>Rates may change with at least 30 days&apos; notice.</li>
          </ul>
        </Section>

        <Section title="4. Late payments and lien">
          <p>
            A grace period applies as posted at the facility. After the grace period we
            may charge a late fee, contact you by SMS or email, and ultimately begin lien
            proceedings as permitted by applicable state law. The specific procedure and
            timeline are governed by the self-storage statute of the state in which the
            facility is located.
          </p>
        </Section>

        <Section title="5. SMS communications">
          <p>
            By providing your phone number, you consent to receive transactional and
            dunning SMS messages from us. You can opt out at any time by replying STOP.
            Standard message and data rates apply.
          </p>
        </Section>

        <Section title="6. Move-out">
          <p>
            You may move out at any time. Pro-rata refunds, if any, are issued at our
            discretion as posted at the facility. The unit must be left empty and swept;
            you remain responsible for any damage beyond normal wear.
          </p>
        </Section>

        <Section title="7. Prohibited items">
          <p>
            You may not store hazardous materials, perishables, living things, illegal
            items, or anything else listed in the posted facility rules. We may, with
            reasonable notice, refuse to rent to anyone who intends to store prohibited
            items.
          </p>
        </Section>

        <Section title="8. Liability and insurance">
          <p>
            <strong>
              You store your property at your own risk. {orgName} does not insure your
              property and is not responsible for its damage, loss, or theft.
            </strong>{' '}
            You should carry your own renters or contents insurance. To the maximum
            extent permitted by law, our total liability under these Terms is limited to
            the amount you paid us in the prior 12 months.
          </p>
        </Section>

        <Section title="9. Governing law">
          <p>
            These Terms are governed by the laws of [state placeholder]. Disputes will be
            resolved in the courts located in [county placeholder], [state placeholder].
          </p>
        </Section>

        <Section title="10. Changes to these Terms">
          <p>
            We may update these Terms. Material changes will be communicated by email at
            least 30 days before they take effect, and continued use of the service after
            the effective date constitutes acceptance.
          </p>
        </Section>

        <Section title="11. Contact">
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
