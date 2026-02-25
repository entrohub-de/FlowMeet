'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Code, Briefcase } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { upsertProfile, upsertPreferences, getProfile, getPreferences } from '@/lib/api/profile';
import { cn } from '@/lib/utils';
import { parsePreferenceString } from '@/lib/preference-options';
import AvatarUpload from '@/components/profile/AvatarUpload';

type IdentityType = 'engineering' | 'non_engineering';

function inferIdentity(industryBackground: string | null): IdentityType | null {
  if (!industryBackground) return null;
  return industryBackground.includes('engineer') ? 'engineering' : 'non_engineering';
}

export default function ProfileCompletePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [identity, setIdentity] = useState<IdentityType | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const [profile, prefs] = await Promise.all([
          getProfile(user.id),
          getPreferences(user.id),
        ]);
        if (profile) {
          setNickname(profile.nickname ?? '');
          setAvatarUrl(profile.avatar_url ?? null);
        }
        if (prefs) {
          const existing = parsePreferenceString(prefs.industry_background);
          const inferred = inferIdentity(prefs.industry_background);
          if (inferred) setIdentity(inferred);
          else if (existing.length > 0) setIdentity('non_engineering');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const canComplete = nickname.trim().length > 0 && identity !== null;

  const handleComplete = async () => {
    if (!user?.id || !canComplete) return;
    setSaving(true);
    try {
      await upsertProfile(user.id, {
        nickname: nickname.trim(),
        gender: null,
        age_group: null,
      });

      // 将身份映射为 industry_background 值
      const bgValue = identity === 'engineering' ? 'engineer' : 'other';
      await upsertPreferences(user.id, {
        industry_background: bgValue,
      });

      router.replace('/user');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  const identityCards: { type: IdentityType; label: string; icon: typeof Code; color: string; selectedBg: string; selectedBorder: string }[] = [
    {
      type: 'engineering',
      label: t('groupIdentity.engineering'),
      icon: Code,
      color: 'text-blue-600 dark:text-blue-400',
      selectedBg: 'bg-blue-500/10',
      selectedBorder: 'border-blue-500',
    },
    {
      type: 'non_engineering',
      label: t('groupIdentity.nonEngineering'),
      icon: Briefcase,
      color: 'text-emerald-600 dark:text-emerald-400',
      selectedBg: 'bg-emerald-500/10',
      selectedBorder: 'border-emerald-500',
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-60px)] flex items-center justify-center p-4 bg-muted/30 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/[0.12] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-accent/[0.08] blur-[100px]" />

      <div className="relative w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">
            {t('profileCompletion.title')}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {t('profileCompletion.subtitle')}
        </p>

        <div className="bg-card/80 border border-border rounded-2xl shadow-lg backdrop-blur-sm p-6 space-y-6">
          {/* 头像 */}
          {user?.id && (
            <div className="flex justify-center">
              <AvatarUpload
                userId={user.id}
                avatarUrl={avatarUrl}
                nickname={nickname}
                size="lg"
                onAvatarChange={setAvatarUrl}
              />
            </div>
          )}

          {/* 昵称 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="nickname">
              {t('profile.nickname')} <span className="text-destructive">*</span>
            </label>
            <input
              id="nickname"
              className="w-full h-12 px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('profile.nicknamePlaceholder')}
              autoFocus
            />
          </div>

          {/* 身份选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('groupIdentity.title')} <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {identityCards.map(({ type, label, icon: Icon, color, selectedBg, selectedBorder }) => {
                const selected = identity === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setIdentity(type)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all',
                      selected
                        ? `${selectedBg} ${selectedBorder} shadow-sm`
                        : 'border-border bg-muted/30 hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      selected ? selectedBg : 'bg-muted'
                    )}>
                      <Icon className={cn('w-6 h-6', selected ? color : 'text-muted-foreground')} />
                    </div>
                    <span className={cn('text-sm font-medium', selected ? color : 'text-muted-foreground')}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 完成按钮 */}
          <button
            onClick={handleComplete}
            disabled={saving || !canComplete}
            className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? t('profile.saving') : t('profileCompletion.complete')}
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
