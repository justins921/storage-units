import { Card } from '@/lib/ui';
import { LoginForm } from './form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center px-6">
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {process.env.ORG_NAME ?? 'Storage'}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Manager sign in
          </h1>
        </div>
        <Card>
          {error === 'no_manager_row' ? (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
              Your auth account exists but is not linked to a manager record. Contact the
              admin.
            </p>
          ) : null}
          <LoginForm next={next ?? '/admin'} />
        </Card>
      </div>
    </main>
  );
}
