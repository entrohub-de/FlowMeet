'use client';

import Navigation from '@/components/layout/Navigation';
import ProfileAvatar from '@/components/layout/ProfileAvatar';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import ProfileCompletionGuard from '@/components/auth/ProfileCompletionGuard';
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
      ]
    },
    {
      label: t('nav.user.eventLive'),
      children: [
        { label: t('nav.user.flow'), href: '/user/flow' },
        { label: t('nav.user.rating'), href: '/user/rating' },
      ]
    },
  ];

  return (
    <RoleRouteGuard area="user">
      <ProfileCompletionGuard>
        <div>
          <Navigation items={navItems} rightSlot={<ProfileAvatar />} logoHref="/user" />
          {children}
        </div>
      </ProfileCompletionGuard>
    </RoleRouteGuard>
  );
}
