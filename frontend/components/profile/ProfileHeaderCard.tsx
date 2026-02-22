'use client';

import { useRef } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';
import { Crown, User, Pencil, Check, Mail, Camera, Loader2, CalendarCheck, Users } from 'lucide-react';
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
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const circumference = 2 * Math.PI * 24;
  const strokeDashoffset = circumference - (completeness / 100) * circumference;

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-sm">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onAvatarChange}
      />

      {/* Top row: avatar + info + edit button */}
      <div className="flex items-start gap-4">
        {/* Avatar with completeness ring */}
        <button
          type="button"
          disabled={avatarUploading || !isEditing}
          onClick={() => isEditing && avatarInputRef.current?.click()}
          className={cn(
            'relative flex-shrink-0',
            isEditing && 'cursor-pointer',
            !isEditing && 'cursor-default'
          )}
        >
          <svg className="w-[60px] h-[60px] -rotate-90" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="24" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <circle
              cx="30" cy="30" r="24" fill="none"
              stroke={completeness === 100 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.6)'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-[6px] rounded-full overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
            )}
          </div>
          {isEditing && !avatarUploading && (
            <div className="absolute inset-[6px] rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          )}
          {avatarUploading && (
            <div className="absolute inset-[6px] rounded-full bg-black/40 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
          )}
          {completeness === 100 && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-card">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {nickname || t('profile.unnamed')}
          </h1>
          <div className="flex items-center flex-wrap gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <Crown className="w-3 h-3" />
              {t(`profile.roleUpgrade.roles.${userRole}`)}
            </span>
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

      {/* Completeness hint */}
      {completeness < 100 && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl">
          <div className="text-xs font-medium text-primary">{completeness}%</div>
          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{t('profile.completenessHint')}</span>
        </div>
      )}

      {/* Activity stats */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarCheck className="w-3.5 h-3.5" />
          {t('profile.stats.eventsJoined', { count: 0 })}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {t('profile.stats.matchesMade', { count: 0 })}
        </span>
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
