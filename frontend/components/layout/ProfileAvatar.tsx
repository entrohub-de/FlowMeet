'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/context';
import { getProfile } from '@/lib/api/profile';
import { getUserRole, type UserRole } from '@/lib/api/role';

export default function ProfileAvatar() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getProfile(user.id).then((p) => setAvatarUrl(p?.avatar_url ?? null)).catch(() => {});
    getUserRole(user.id).then(setUserRole).catch(() => {});
  }, [user?.id]);

  if (!user) return null;

  const initial = (user.email?.[0] ?? '?').toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const isAdminArea = pathname?.startsWith('/admin');
  const isHostArea = pathname?.startsWith('/host');
  const isUserArea = pathname?.startsWith('/user');
  const profileHref = isHostArea ? '/host/profile' : '/user/profile';
  const canSwitchView = userRole === 'host' || userRole === 'admin';

  return (
    <div ref={menuRef} className="relative ml-auto">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-gray-500 text-white flex items-center justify-center text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-2 z-50 flex flex-col gap-2 min-w-[180px]">
          <button
            onClick={() => { setOpen(false); router.push(profileHref); }}
            className="w-full px-button h-button text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer rounded-button text-left"
          >
            {t('profile.title')}
          </button>
          {canSwitchView && isUserArea && (
            <button
              onClick={() => { setOpen(false); router.push('/host'); }}
              className="w-full px-button h-button text-sm text-primary hover:bg-secondary transition-colors cursor-pointer rounded-button text-left"
            >
              {t('profile.switchToHost')}
            </button>
          )}
          <button
            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
            className="w-full px-button h-button text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer rounded-button flex items-center justify-between"
          >
            <span>{t('profile.language')}</span>
            <span className="text-xs font-medium text-primary">{locale === 'zh' ? 'EN' : '中文'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-button h-button text-sm text-destructive hover:bg-secondary transition-colors cursor-pointer rounded-button text-left"
          >
            {t('profile.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
