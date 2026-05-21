import { headers } from 'next/headers';
import { forbidden } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  // ⚡ Bolt Security Optimization: Shift from a fragile blacklist to a mathematically strict whitelist
  if (role !== 'admin') {
    forbidden();
  }

  return <>{children}</>;
}
