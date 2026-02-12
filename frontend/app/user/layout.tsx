'use client';

import Navigation from '@/components/layout/Navigation';
import ProfileAvatar from '@/components/layout/ProfileAvatar';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import { useTranslation } from '@/lib/i18n/context';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  const navItems = [
    {
      label: t('nav.user.eventSignup'),
      children: [
        { label: t('nav.user.signup'), href: '/user/event' },
        { label: t('nav.user.checkin'), href: '/user/checkin' },
        { label: t('nav.user.expectations'), href: '/user/expectations' },
      ]
    },
    {
      label: t('nav.user.eventLive'),
      children: [
        { label: t('nav.user.matching'), href: '/user/matching' },
        { label: t('nav.user.groups'), href: '/user/groups' },
        { label: t('nav.user.topics'), href: '/user/topics' },
        { label: t('nav.user.rating'), href: '/user/rating' },
      ]
    },
  ];

  return (
    <RoleRouteGuard area="user">
      <div>
        <Navigation items={navItems} rightSlot={<ProfileAvatar />} logoHref="/user" />
        {children}
      </div>
    </RoleRouteGuard>
  );
}
