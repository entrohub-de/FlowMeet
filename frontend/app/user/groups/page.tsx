'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useGroups } from '@/hooks/useGroups';
import { EventSelector } from '@/components/expectations/EventSelector';
import { GroupCard } from '@/components/groups';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

export default function GroupsPage() {
  const { t } = useTranslation();
  const {
    events,
    selectedEventId,
    setSelectedEventId,
    groups,
    userGroup,
    userId,
    loading,
    error,
  } = useGroups();

  const [allGroupsExpanded, setAllGroupsExpanded] = useState(false);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">{t('common.error')}</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">{t('common.loginRequired')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('user.groups')}</h1>
        <p className="text-muted-foreground">{t('user.groupsPageDesc')}</p>
      </div>

      {/* Event Selector */}
      <EventSelector
        events={events}
        selectedEventId={selectedEventId}
        onEventChange={setSelectedEventId}
      />

      {selectedEventId && (
        <>
          {/* 我的小组 */}
          {userGroup && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('user.myGroup')}
              </h2>
              <GroupCard
                group={
                  groups.find((g) => g.group_id === userGroup.group_id) || {
                    ...userGroup,
                    currentSize: 0,
                    members: [],
                  }
                }
                isUserGroup={true}
              />
            </div>
          )}

          {/* 所有小组 */}
          <div>
            <button
              onClick={() => setAllGroupsExpanded(!allGroupsExpanded)}
              className="w-full flex items-center justify-between px-button h-button bg-muted/30 hover:bg-muted/50 rounded-button transition-colors mb-4"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <h2 className="text-xl font-semibold">
                  {t('user.allGroups')}
                </h2>
                {groups.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({groups.length} {t('user.groupsCount')})
                  </span>
                )}
              </div>
              {allGroupsExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {allGroupsExpanded && (
              <>
                {groups.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('user.noGroups')}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('user.noGroupsHint')}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                      <GroupCard
                        key={group.group_id}
                        group={group}
                        isUserGroup={userGroup?.group_id === group.group_id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

