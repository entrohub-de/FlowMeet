'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { getProfile, upsertProfile } from '@/lib/api/profile';
import { getUserRole, type UserRole } from '@/lib/api/role';
import { Crown } from 'lucide-react';

export default function HostProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('user');

  const loadData = useCallback(async (userId: string) => {
    try {
      const [profile, role] = await Promise.all([
        getProfile(userId),
        getUserRole(userId),
      ]);
      if (profile) {
        setNickname(profile.nickname ?? '');
      }
      setUserRole(role);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) loadData(user.id);
  }, [user?.id, loadData]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      await upsertProfile(user.id, {
        nickname: nickname || null,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-6">
        {t('profile.title')}
      </h1>

      <div className="space-y-8">
        {/* Basic Info */}
        <section className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('profile.email')}</label>
            <input
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm text-muted-foreground cursor-not-allowed"
              value={user?.email ?? ''}
              disabled
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="nickname">
              {t('profile.nickname')}
            </label>
            <input
              id="nickname"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('profile.nicknamePlaceholder')}
            />
          </div>
        </section>

        {/* Current Role Display */}
        {(userRole === 'host' || userRole === 'admin') && (
          <section className="space-y-4 border-t border-border pt-8">
            <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
              {t('profile.roleUpgrade.title')}
            </h2>
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-primary" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t('profile.roleUpgrade.currentRole')}
                  </div>
                  <div className="text-lg font-medium text-foreground">
                    {t(`profile.roleUpgrade.roles.${userRole}`)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-button h-button bg-primary text-primary-foreground rounded-button font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('profile.saving') : saveStatus === 'saved' ? t('profile.saved') : t('profile.save')}
        </button>
      </div>
    </div>
  );
}
