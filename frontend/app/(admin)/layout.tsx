'use client';

import Navigation from '@/components/layout/Navigation';
import ProfileAvatar from '@/components/layout/ProfileAvatar';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import { useTranslation } from '@/lib/i18n/context';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  const navItems = [
    {
      label: t('nav.admin.eventOverview'),
      href: '/admin/events',
    },
    {
      label: t('nav.admin.userManagement'),
      children: [
        { label: t('nav.admin.allUsers'), href: '/admin/users' },
        { label: t('nav.admin.hostManagement'), href: '/admin/hosts' },
      ],
    },
    {
      label: t('nav.admin.adManagement'),
      href: '/admin/ads',
    },
    {
      label: t('nav.admin.test'),
      children: [
        { label: t('nav.admin.simulator'), href: '/admin/test/simulator' },
      ],
    },
  ];

  return (
    <RoleRouteGuard area="admin">
      <div>
        <Navigation items={navItems} rightSlot={<ProfileAvatar />} />
        {children}
      </div>
    </RoleRouteGuard>
  );
}
