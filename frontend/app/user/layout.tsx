import Navigation from '@/components/layout/Navigation';
import ProfileAvatar from '@/components/layout/ProfileAvatar';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { 
      label: '活动报名',
      children: [
        { label: '活动报名', href: '/user/signup' },
        { label: '活动签到', href: '/user/checkin' },
        { label: '活动期待', href: '/user/expectations' },
      ]
    },
    { 
      label: '活动现场',
      children: [
        { label: '场地信息', href: '/user/venue' },
        { label: '话题生成', href: '/user/topics' },
        { label: '活动总结', href: '/user/summary' },
        { label: '小组信息', href: '/user/groups' },
        { label: '活动评分', href: '/user/rating' },
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
