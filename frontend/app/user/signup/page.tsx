'use client';

import { useTranslation } from '@/lib/i18n/context';

export default function SignupPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{t('user.signup')}</h1>
      <p className="text-muted-foreground">
        {t('user.signupPage')}
      </p>
    </div>
  );
}
