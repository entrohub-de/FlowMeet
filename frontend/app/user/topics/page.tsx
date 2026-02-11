'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useMatching } from '@/hooks/useMatching';
import { EventSelector } from '@/components/expectations/EventSelector';
import { TopicCard } from '@/components/topics/TopicCard';
import { Sparkles, Users } from 'lucide-react';
import type { Match } from '@/types/domain';

// Demo data for demonstration purposes
const DEMO_MATCHES: Match[] = [
  {
    match_id: 'demo-match-1',
    event_id: 'demo-event-1',
    user1_id: 'current-user',
    user2_id: 'demo-user-1',
    status: 'accepted',
    user1_location: null,
    user2_location: null,
    location_updated_by_user1_at: null,
    location_updated_by_user2_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user1_profile: {
      id: 1,
      created_at: new Date().toISOString(),
      user_id: 'current-user',
      nickname: '你',
      gender: '男',
      age_group: '25-34',
    },
    user2_profile: {
      id: 2,
      created_at: new Date().toISOString(),
      user_id: 'demo-user-1',
      nickname: '张晓',
      gender: '女',
      age_group: '25-34',
    },
  },
  {
    match_id: 'demo-match-2',
    event_id: 'demo-event-1',
    user1_id: 'current-user',
    user2_id: 'demo-user-2',
    status: 'accepted',
    user1_location: null,
    user2_location: null,
    location_updated_by_user1_at: null,
    location_updated_by_user2_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user1_profile: {
      id: 1,
      created_at: new Date().toISOString(),
      user_id: 'current-user',
      nickname: '你',
      gender: '男',
      age_group: '25-34',
    },
    user2_profile: {
      id: 3,
      created_at: new Date().toISOString(),
      user_id: 'demo-user-2',
      nickname: 'Alex Chen',
      gender: '男',
      age_group: '25-34',
    },
  },
  {
    match_id: 'demo-match-3',
    event_id: 'demo-event-1',
    user1_id: 'current-user',
    user2_id: 'demo-user-3',
    status: 'accepted',
    user1_location: null,
    user2_location: null,
    location_updated_by_user1_at: null,
    location_updated_by_user2_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user1_profile: {
      id: 1,
      created_at: new Date().toISOString(),
      user_id: 'current-user',
      nickname: '你',
      gender: '男',
      age_group: '25-34',
    },
    user2_profile: {
      id: 4,
      created_at: new Date().toISOString(),
      user_id: 'demo-user-3',
      nickname: '李明',
      gender: '男',
      age_group: '35-44',
    },
  },
];

export default function TopicsPage() {
  const { t } = useTranslation();
  const [demoMode, setDemoMode] = useState(false);
  const {
    events,
    selectedEventId,
    setSelectedEventId,
    matches,
    userId,
    loading,
    error,
  } = useMatching();

  // Filter only accepted matches
  const acceptedMatches = matches.filter((match) => match.status === 'accepted');

  // Use demo data if demo mode is enabled or no real matches exist
  const displayMatches = demoMode || acceptedMatches.length === 0 ? DEMO_MATCHES : acceptedMatches;
  const displayUserId = demoMode ? 'current-user' : userId;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">{t('topicsPage.title')}</h1>
            </div>
            <p className="text-muted-foreground">{t('topicsPage.description')}</p>
          </div>
          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`px-button h-button rounded-button font-medium text-sm transition-colors ${
              demoMode
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {demoMode ? '🎭 演示模式' : '启用演示'}
          </button>
        </div>
      </div>

      {/* Event Selector - Hidden in demo mode */}
      {!demoMode && (
        <div className="mb-6">
          <EventSelector
            events={events}
            selectedEventId={selectedEventId}
            onEventChange={setSelectedEventId}
          />
        </div>
      )}

      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="mb-6 bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <h3 className="font-semibold text-foreground">演示模式已启用</h3>
              <p className="text-sm text-muted-foreground">
                正在显示模拟配对数据。点击「生成话题」按钮需要配置 OpenAI API 密钥。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground mt-4">{t('common.loading')}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.message || String(error)}
        </div>
      )}

      {/* No Event Selected */}
      {!demoMode && !loading && !selectedEventId && (
        <div className="text-center py-12 bg-muted/30 rounded-xl">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t('topicsPage.selectMatch')}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t('event.selectToStart')}
          </p>
        </div>
      )}

      {/* Matches List */}
      {(demoMode || (!loading && selectedEventId && displayUserId)) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {t('matching.yourMatches')} ({displayMatches.length})
            </h2>
          </div>

          <div className="grid gap-4">
            {displayMatches.map((match) => (
              <TopicCard
                key={match.match_id}
                match={match}
                currentUserId={displayUserId || 'current-user'}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
