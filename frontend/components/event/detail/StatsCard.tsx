'use client';

import { Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface StatsCardProps {
  totalSignups: number;
  withExpectations: number;
}

export default function StatsCard({ totalSignups, withExpectations }: StatsCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {t('host.events.signupStats')}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {t('host.events.totalSignups')}
          </div>
          <div className="text-3xl font-bold text-primary">
            {totalSignups}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-4 border border-green-500/20">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {t('host.events.withExpectations')}
          </div>
          <div className="text-3xl font-bold text-green-600">
            {withExpectations}
          </div>
        </div>
      </div>
    </div>
  );
}
