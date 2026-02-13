'use client';

import RoleRouteGuard from '@/components/auth/RoleRouteGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRouteGuard area="admin">
      <div>{children}</div>
    </RoleRouteGuard>
  );
}
