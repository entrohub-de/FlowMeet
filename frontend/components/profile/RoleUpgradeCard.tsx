'use client';

import { useTranslation } from '@/lib/i18n/context';
import { Crown, Star, Clock, XCircle } from 'lucide-react';
import type { UserRole } from '@/lib/api/role';

interface RoleUpgradeCardProps {
  userRole: UserRole;
  applicationStatus: string | null;
  applying: boolean;
  onApply: () => void;
  onReapply: () => void;
}

export default function RoleUpgradeCard({
  userRole,
  applicationStatus,
  applying,
  onApply,
  onReapply,
}: RoleUpgradeCardProps) {
  const { t } = useTranslation();

  // user -> organizer
  if (userRole === 'user' && !applicationStatus) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t('profile.roleUpgrade.organizerTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('profile.roleUpgrade.organizerDescription')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t('profile.roleUpgrade.organizerBenefits.smallEvents')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t('profile.roleUpgrade.organizerBenefits.inviteLink')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t('profile.roleUpgrade.organizerBenefits.badge')}
          </div>
        </div>

        <button
          onClick={onApply}
          disabled={applying}
          className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-feedback"
        >
          <Star className="w-4 h-4" />
          {applying ? t('profile.roleUpgrade.applying') : t('profile.roleUpgrade.applyOrganizer')}
        </button>
      </div>
    );
  }

  // organizer -> host
  if (userRole === 'organizer' && !applicationStatus) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t('profile.roleUpgrade.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('profile.roleUpgrade.upgradeDescription')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t('profile.roleUpgrade.benefits.createEvents')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t('profile.roleUpgrade.benefits.manageSignups')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t('profile.roleUpgrade.benefits.checkin')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t('profile.roleUpgrade.benefits.viewStats')}
          </div>
        </div>

        <button
          onClick={onApply}
          disabled={applying}
          className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-feedback"
        >
          <Crown className="w-4 h-4" />
          {applying ? t('profile.roleUpgrade.applying') : t('profile.roleUpgrade.applyToHost')}
        </button>
      </div>
    );
  }

  // Pending application
  if ((userRole === 'user' || userRole === 'organizer') && applicationStatus === 'pending') {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t('profile.roleUpgrade.pendingTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('profile.roleUpgrade.pendingDescription')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Rejected application
  if ((userRole === 'user' || userRole === 'organizer') && applicationStatus === 'rejected') {
    return (
      <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 space-y-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t('profile.roleUpgrade.rejectedTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('profile.roleUpgrade.rejectedDescription')}</p>
          </div>
        </div>
        <button
          onClick={onReapply}
          className="w-full h-12 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-2 touch-feedback text-sm"
        >
          {t('profile.roleUpgrade.reapply')}
        </button>
      </div>
    );
  }

  // Host/Admin current role display
  if (userRole === 'host' || userRole === 'admin') {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t('profile.roleUpgrade.currentRole')}</div>
            <div className="font-semibold text-foreground">{t(`profile.roleUpgrade.roles.${userRole}`)}</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
