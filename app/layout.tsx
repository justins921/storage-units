import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: process.env.ORG_NAME ?? 'Storage',
  description: 'Self-storage rentals',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
