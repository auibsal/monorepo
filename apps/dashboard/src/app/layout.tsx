import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SAL Dashboard',
  description: 'Internal Dashboard for the Society of Arts and Letters',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased flex h-screen bg-gray-50 text-gray-900">
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold tracking-tight">SAL Dashboard</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <Link href="/" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">Overview</Link>
            <Link href="/submissions" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">Submissions</Link>
            <Link href="/blog" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">Blog</Link>
            <Link href="/journal" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">Journal</Link>
            <Link href="/events" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">Events</Link>
            <Link href="/users" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">Users</Link>
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
