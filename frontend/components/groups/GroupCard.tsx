import { Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface GroupCardProps {
  group: {
    group_id: string;
    name: string;
    description: string | null;
    max_size: number;
    currentSize: number;
    members: Array<{
      user_id: string;
      joined_at: string;
      profile?: {
        nickname: string | null;
        gender: string | null;
        age_group: string | null;
      };
    }>;
  };
  isUserGroup?: boolean;
}

export function GroupCard({ group, isUserGroup }: GroupCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`bg-card border rounded-xl p-5 hover:shadow-md transition-shadow ${
        isUserGroup ? 'border-primary border-2' : 'border-border'
      }`}
    >
      {/* 小组头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg text-foreground">
              {group.name}
            </h3>
            {isUserGroup && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {t('user.myGroup')}
              </span>
            )}
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">
            {group.currentSize}/{group.max_size}
          </span>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('user.groupMembers')}
        </p>
        <div className="grid gap-2">
          {group.members.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t('user.noGroupMembers')}
            </p>
          ) : (
            group.members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {member.profile?.nickname?.[0] || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.profile?.nickname || t('user.anonymous')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.profile?.gender || ''}{' '}
                    {member.profile?.age_group || ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
