import { headers } from 'next/headers';
import { forbidden } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const role = headersList.get('x-user-role');

  if (role === 'member' || role === 'editor' || !role) {
    forbidden();
  }

  return <>{children}</>;
}
