'use client';

import Navigation from '@/components/layout/Navigation';
import ProfileAvatar from '@/components/layout/ProfileAvatar';
import { useTranslation } from '@/lib/i18n/context';

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  const navItems = [
    {
      label: t('nav.host.eventLive'),
      children: [
        { label: t('nav.host.eventLiveCheckin'), href: '/host/live/checkin' },
        { label: t('nav.host.eventLiveFlow'), href: '/host/live/flow' },
      ],
    },
    {
      label: t('nav.host.eventManagement'),
      children: [
        { label: t('nav.host.eventManagement'), href: '/host/event' },
        { label: t('nav.host.venueManagement'), href: '/host/venues' },
        { label: t('nav.host.workflowSettings'), href: '/host/workflows' },
      ],
    },
    { label: t('pages.rating.title'), href: '/host/rating' },
  ];

  return (
    <div>
      <Navigation items={navItems} rightSlot={<ProfileAvatar />} />
      {children}
    </div>
  );
}
