'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import { useTranslation } from '@/lib/i18n/context';
import { getUserRole } from '@/lib/api/role';
import { Globe } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, locale, setLocale } = useTranslation();

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (authLoading || !user) return;

    getUserRole(user.id).then((role) => {
      if (role === 'admin') {
        router.push('/admin/test/simulator');
      } else if (role === 'host') {
        router.push('/host');
      } else {
        router.push('/user');
      }
    });
  }, [authLoading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative">
      {/* Language Switcher */}
      <button
        onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium text-muted-foreground"
      >
        <Globe className="w-4 h-4" />
        <span>{locale === 'zh' ? 'EN' : '中文'}</span>
      </button>

      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/entrohub-full-logo.png"
            alt="FlowMeet Logo"
            width={400}
            height={120}
            priority
            className="w-auto h-24 sm:h-32"
          />
        </div>
        <p className="text-2xl sm:text-3xl font-medium text-foreground">
          {t('home.slogan')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/auth/signup"
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto"
          >
            {t('home.createAccount')}
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors w-full sm:w-auto"
          >
            {t('home.login')}
          </Link>
          <Link
            href="/events"
            className="px-8 py-3 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors w-full sm:w-auto border border-border"
          >
            {t('home.browseEvents')}
          </Link>
        </div>
      </div>
    </div>
  );
}
