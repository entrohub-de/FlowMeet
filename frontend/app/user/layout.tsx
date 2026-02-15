'use client';

import Navigation from '@/components/layout/Navigation';
import ProfileAvatar from '@/components/layout/ProfileAvatar';
import RoleRouteGuard from '@/components/auth/RoleRouteGuard';
import ProfileCompletionGuard from '@/components/auth/ProfileCompletionGuard';
import { useTranslation } from '@/lib/i18n/context';
import { useFlowRedirect } from '@/hooks/useFlowRedirect';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  // Auto-redirect to /user/flow when host starts the event flow
  useFlowRedirect();

  const navItems = [
    {
      label: t('nav.user.eventSignup'),
      children: [
        { label: t('nav.user.signup'), href: '/user/event' },
      ]
    },
    {
      label: t('nav.user.eventLive'),
      children: [
        { label: t('nav.user.flow'), href: '/user/flow' },
      ]
    },
    {
      label: t('nav.user.myEvents'),
      href: '/user/my-events',
    },
    {
      label: t('nav.user.onlineConnect'),
      children: [
        { label: t('nav.user.connections'), href: '/user/connections' },
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
