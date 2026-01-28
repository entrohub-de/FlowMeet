import Navigation from '@/components/layout/Navigation';

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { label: '活动管理', href: '/host' },
    { label: '活动现场', href: '/host/live' },
    { label: '场地管理', href: '/host/venues' },
    { label: '流程设置', href: '/host/workflows' },
  ];

  return (
    <div>
      <Navigation items={navItems} />
      {children}
    </div>
  );
}
