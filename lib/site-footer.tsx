import Link from 'next/link';

export function SiteFooter({ orgName }: { orgName?: string }) {
  const name = orgName ?? process.env.ORG_NAME ?? 'Storage Co';
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 px-6 py-8 text-xs text-slate-500 sm:flex-row sm:items-center">
        <p>
          © {new Date().getFullYear()} {name}. All rights reserved.
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-900">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-900">
            Terms
          </Link>
          <Link
            href="/admin/login"
            className="text-slate-400 hover:text-slate-900"
            aria-label="Manager sign in"
          >
            Manager sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
