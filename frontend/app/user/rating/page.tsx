'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useRatings } from '@/hooks/useRatings';
import { EventSelector } from '@/components/expectations/EventSelector';
import { EventRatingCard } from '@/components/ratings/EventRatingCard';
import { MatchQualityRatingCard } from '@/components/ratings/MatchQualityRatingCard';
import { MatchPartnerRatingCard } from '@/components/ratings/MatchPartnerRatingCard';
import { TopicRatingCard } from '@/components/ratings/TopicRatingCard';
import { Star, Users, MessageSquare } from 'lucide-react';

type Tab = 'event' | 'matching' | 'topics';

export default function RatingPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('event');

  const {
    events,
    selectedEventId,
    setSelectedEventId,
    eventRating,
    submitEventRating,
    matchQualityRating,
    submitMatchQualityRating,
    matches,
    matchRatings,
    submitMatchRating,
    loading,
    submitting,
    error,
    successMessage,
    userId,
  } = useRatings();

  const tabs = [
    { id: 'event' as Tab, label: t('ratingPage.tabs.event'), icon: Star },
    { id: 'matching' as Tab, label: t('ratingPage.tabs.matching'), icon: Users },
    { id: 'topics' as Tab, label: t('ratingPage.tabs.topics'), icon: MessageSquare },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('ratingPage.title')}</h1>
        <p className="text-muted-foreground">{t('ratingPage.description')}</p>
      </div>

      {/* Event Selector */}
      <div className="mb-6">
        <EventSelector
          events={events}
          selectedEventId={selectedEventId}
          onEventChange={setSelectedEventId}
        />
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-border">
        <nav className="flex space-x-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-button h-button border-b-2 font-medium transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground mt-4">{t('common.loading')}</p>
        </div>
      ) : !selectedEventId ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('user.selectEvent')}
        </div>
      ) : (
        <>
          {/* Event Tab */}
          {activeTab === 'event' && (
            <EventRatingCard
              eventRating={eventRating}
              onSubmit={submitEventRating}
              submitting={submitting}
            />
          )}

          {/* Matching Tab */}
          {activeTab === 'matching' && (
            <div className="max-w-2xl space-y-6">
              <MatchQualityRatingCard
                matchQualityRating={matchQualityRating}
                onSubmit={submitMatchQualityRating}
                submitting={submitting}
              />

              <MatchPartnerRatingCard
                matches={matches}
                matchRatings={matchRatings}
                userId={userId}
                onSubmit={submitMatchRating}
                submitting={submitting}
              />
            </div>
          )}

          {/* Topics Tab */}
          {activeTab === 'topics' && <TopicRatingCard />}
        </>
      )}
    </div>
  );
}
