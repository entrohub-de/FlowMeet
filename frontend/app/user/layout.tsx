'use client';

import Navigation from '@/components/layout/Navigation';
import ProfileAvatar from '@/components/layout/ProfileAvatar';
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
        { label: t('user.signup'), href: '/user/signup' },
        { label: t('user.checkin'), href: '/user/checkin' },
        { label: t('user.expectations'), href: '/user/expectations' },
      ]
    },
    {
      label: t('nav.user.eventLive'),
      children: [
        { label: t('user.matching'), href: '/user/matching' },
        { label: t('user.groups'), href: '/user/groups' },
        { label: t('user.topics'), href: '/user/topics' },
        { label: t('user.rating'), href: '/user/rating' },
      ]
    },
  ];

  return (
    <div>
      <Navigation items={navItems} rightSlot={<ProfileAvatar />} />
      {children}
    </div>
  );
}
