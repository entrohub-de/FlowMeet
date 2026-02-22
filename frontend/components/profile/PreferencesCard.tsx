'use client';

import { useTranslation } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';
import { Heart, Globe, Briefcase, Rocket, Pencil, Check } from 'lucide-react';
import {
  LANGUAGE_OPTIONS,
  INTEREST_OPTIONS,
  PROFESSIONAL_BACKGROUND_OPTIONS,
  STARTUP_STAGE_OPTIONS,
} from '@/lib/preference-options';
import ChipGroup from './ChipGroup';

interface PreferencesCardProps {
  selectedLanguages: string[];
  selectedInterests: string[];
  selectedIndustries: string[];
  selectedStartupStage: string;
  isEditing: boolean;
  saving: boolean;
  onLanguagesChange: (v: string[]) => void;
  onInterestsChange: (v: string[]) => void;
  onIndustriesChange: (v: string[]) => void;
  onStartupStageChange: (v: string) => void;
  onEditToggle: () => void;
  onSave: () => void;
}

export default function PreferencesCard({
  selectedLanguages,
  selectedInterests,
  selectedIndustries,
  selectedStartupStage,
  isEditing,
  saving,
  onLanguagesChange,
  onInterestsChange,
  onIndustriesChange,
  onStartupStageChange,
  onEditToggle,
  onSave,
}: PreferencesCardProps) {
  const { t } = useTranslation();

  const hasAnyPrefs = selectedLanguages.length > 0 || selectedInterests.length > 0 ||
    selectedIndustries.length > 0 || !!selectedStartupStage;

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" />
          {t('profile.preferences')}
        </h2>
        <button
          type="button"
          onClick={onEditToggle}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          {isEditing ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Pencil className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {!hasAnyPrefs && !isEditing ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">{t('profile.prefsEmptyHint')}</p>
          <button
            type="button"
            onClick={onEditToggle}
            className="px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            {t('profile.prefsGoSet')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(isEditing || selectedLanguages.length > 0) && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {t('profile.languages')}
              </label>
              <ChipGroup options={LANGUAGE_OPTIONS} selected={selectedLanguages} i18nPrefix="languages" onChange={(v) => onLanguagesChange(v as string[])} editing={isEditing} />
            </div>
          )}

          {(isEditing || selectedInterests.length > 0) && (
            <div className={cn('space-y-1.5', isEditing && 'border-t border-border pt-3')}>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                {t('profile.interests')}
              </label>
              <ChipGroup options={INTEREST_OPTIONS} selected={selectedInterests} i18nPrefix="interests" onChange={(v) => onInterestsChange(v as string[])} editing={isEditing} />
            </div>
          )}

          {(isEditing || selectedIndustries.length > 0) && (
            <div className={cn('space-y-1.5', isEditing && 'border-t border-border pt-3')}>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {t('profile.professionalBackground')}
              </label>
              <ChipGroup options={PROFESSIONAL_BACKGROUND_OPTIONS} selected={selectedIndustries} i18nPrefix="professionalBackground" onChange={(v) => onIndustriesChange(v as string[])} editing={isEditing} />
            </div>
          )}

          {(isEditing || !!selectedStartupStage) && (
            <div className={cn('space-y-1.5', isEditing && 'border-t border-border pt-3')}>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Rocket className="w-3.5 h-3.5" />
                {t('profile.startupStage')}
              </label>
              <ChipGroup options={STARTUP_STAGE_OPTIONS} selected={selectedStartupStage} i18nPrefix="startupStages" onChange={(v) => onStartupStageChange(v as string)} editing={isEditing} multi={false} />
            </div>
          )}

          {isEditing && (
            <button
              onClick={onSave}
              disabled={saving}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-feedback text-sm mt-2"
            >
              <Check className="w-4 h-4" />
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
