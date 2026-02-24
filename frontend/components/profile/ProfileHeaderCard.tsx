'use client';

import { useTranslation } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';
import { Pencil, Check, Mail } from 'lucide-react';
import type { UserRole } from '@/lib/api/role';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;
const AGE_GROUP_OPTIONS = ['18-24', '25-34', '35-44', '45+'] as const;

const chipClass = (selected: boolean) =>
  cn(
    'px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer hover:bg-primary/5',
    selected
      ? 'bg-primary/10 text-primary border-primary/30'
      : 'bg-muted/50 text-muted-foreground border-transparent'
  );

interface ProfileHeaderCardProps {
  nickname: string;
  gender: string;
  ageGroup: string;
  avatarUrl: string | null;
  avatarUploading: boolean;
  userRole: UserRole;
  email: string | undefined;
  completeness: number;
  isEditing: boolean;
  saving: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  onNicknameChange: (v: string) => void;
  onGenderChange: (v: string) => void;
  onAgeGroupChange: (v: string) => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProfileHeaderCard({
  nickname,
  gender,
  ageGroup,
  avatarUrl,
  avatarUploading,
  userRole,
  email,
  completeness,
  isEditing,
  saving,
  onEditToggle,
  onSave,
  onNicknameChange,
  onGenderChange,
  onAgeGroupChange,
  onAvatarChange,
}: ProfileHeaderCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-sm">
      {/* Top row: info + edit button */}
      <div className="flex items-start gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {nickname || t('profile.unnamed')}
          </h1>
          <div className="flex items-center flex-wrap gap-1.5 mt-1">
            {gender && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                {t(`profile.genderOptions.${gender}`)}
              </span>
            )}
            {ageGroup && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                {ageGroup}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1 truncate">
            <Mail className="w-3 h-3 flex-shrink-0" />
            {email}
          </p>
        </div>

        {/* Edit toggle */}
        <button
          onClick={() => {
            if (isEditing) onSave();
            else onEditToggle();
          }}
          className="p-2 rounded-xl hover:bg-muted transition-colors touch-feedback flex-shrink-0"
        >
          {isEditing ? (
            <Check className="w-5 h-5 text-primary" />
          ) : (
            <Pencil className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="nickname">
              {t('profile.nickname')}
            </label>
            <input
              id="nickname"
              className="w-full h-12 px-4 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              value={nickname}
              onChange={(e) => onNicknameChange(e.target.value)}
              placeholder={t('profile.nicknamePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('profile.gender')}</label>
            <div className="flex flex-wrap gap-1.5">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onGenderChange(gender === g ? '' : g)}
                  className={chipClass(gender === g)}
                >
                  {t(`profile.genderOptions.${g}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('profile.ageGroup')}</label>
            <div className="flex flex-wrap gap-1.5">
              {AGE_GROUP_OPTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onAgeGroupChange(ageGroup === a ? '' : a)}
                  className={chipClass(ageGroup === a)}
                >
                  {t(`profile.ageGroupOptions.${a}`)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-feedback text-sm"
          >
            <Check className="w-4 h-4" />
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </div>
      )}
    </div>
  );
}
