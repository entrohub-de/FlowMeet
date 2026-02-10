'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useMatching } from '@/hooks/useMatching';
import { EventSelector } from '@/components/expectations/EventSelector';
import { MatchCard, RecommendationCard } from '@/components/matching';
import type { Match, Profile } from '@/types/domain';
import { Users, UserPlus, Sparkles } from 'lucide-react';

export default function MatchingPage() {
  const { t } = useTranslation();
  const {
    events,
    selectedEventId,
    setSelectedEventId,
    matches,
    recommendedUsers,
    userId,
    loading,
    error,
    requestMatch,
    acceptMatch,
    declineMatch,
    completeMatch,
  } = useMatching();

  const [activeTab, setActiveTab] = useState<'matches' | 'available'>('matches');

  const getMatchPartner = (match: Match): Profile | undefined => {
    return match.user1_id === userId ? match.user2_profile : match.user1_profile;
  };

  const isPendingReceived = (match: Match): boolean => {
    return match.status === 'pending' && match.user2_id === userId;
  };

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
        <h1 className="text-3xl font-bold mb-2">{t('user.matching')}</h1>
        <p className="text-muted-foreground">{t('user.matchingPage')}</p>
      </div>

      {/* Event Selector */}
      <EventSelector
        events={events}
        selectedEventId={selectedEventId}
        onEventChange={setSelectedEventId}
      />

      {selectedEventId && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-button h-button font-medium transition-colors ${
                activeTab === 'matches'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{t('user.myMatches')}</span>
                {matches.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {matches.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-button h-button font-medium transition-colors ${
                activeTab === 'available'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>{t('user.findPartners')}</span>
              </div>
            </button>
          </div>

          {/* Content */}
          {activeTab === 'matches' ? (
            <div className="space-y-4">
              {matches.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('user.noMatches')}</p>
                </div>
              ) : (
                matches.map((match) => {
                  const partner = getMatchPartner(match);
                  const isPending = isPendingReceived(match);

                  return (
                    <MatchCard
                      key={match.match_id}
                      match={match}
                      partner={partner}
                      isPending={isPending}
                      onAccept={acceptMatch}
                      onDecline={declineMatch}
                      onComplete={completeMatch}
                    />
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recommendedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('user.noAvailableUsers')}</p>
                </div>
              ) : (
                <>
                  {/* 推荐提示 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-blue-900 mb-1">{t('user.smartRecommendation')}</h3>
                      <p className="text-sm text-blue-700">
                        {t('user.smartRecommendationDesc')}
                      </p>
                    </div>
                  </div>

                  {/* 推荐列表 */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {recommendedUsers.map((recommendation) => (
                      <RecommendationCard
                        key={recommendation.userId}
                        recommendation={recommendation}
                        onRequestMatch={requestMatch}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
