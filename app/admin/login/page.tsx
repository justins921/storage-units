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
      <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Manager sign in</h1>
        <p className="mt-1 text-sm text-gray-500">
          {error === 'no_manager_row'
            ? 'Your auth account exists but is not linked to a manager record. Contact the admin.'
            : 'Use the credentials issued by your storage operator.'}
        </p>
        <LoginForm next={next ?? '/admin'} />
      </div>
    </main>
  );
}
