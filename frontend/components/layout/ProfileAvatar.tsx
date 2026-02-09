'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase/client';

export default function ProfileAvatar() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  if (!user) return null;

  const initial = (user.email?.[0] ?? '?').toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div ref={menuRef} className="relative ml-auto">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-2 z-50 w-40">
          <button
            onClick={() => { setOpen(false); router.push('/user/profile'); }}
            className="block w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            个人资料
          </button>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary transition-colors cursor-pointer"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
