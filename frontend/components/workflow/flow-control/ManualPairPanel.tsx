'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users, X, Link2, Unlink } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import { manualPair, manualUnpair } from '@/lib/api/host-actions';
import { broadcastMatchAssignments } from '@/lib/realtime/matching-queue';
import type { Match, Profile } from '@/types/domain';

interface ManualPairPanelProps {
  eventId: string;
  stepId: string;
}

interface MatchWithProfiles extends Match {
  user1_profile?: Profile;
  user2_profile?: Profile;
}

export default function ManualPairPanel({ eventId, stepId }: ManualPairPanelProps) {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchWithProfiles[]>([]);
  const [unpairedUsers, setUnpairedUsers] = useState<{ user_id: string; nickname: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [selectedUser1, setSelectedUser1] = useState('');
  const [selectedUser2, setSelectedUser2] = useState('');
  const [pairing, setPairing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch active matches for this event
      const { data: matchData } = await supabase
        .from('evt_matches')
        .select('*, user1_profile:usr_profiles!evt_matches_user1_id_fkey(nickname), user2_profile:usr_profiles!evt_matches_user2_id_fkey(nickname)')
        .eq('event_id', eventId)
        .in('status', ['accepted', 'pending'])
        .order('created_at', { ascending: false });

      const activeMatches = (matchData ?? []) as MatchWithProfiles[];
      setMatches(activeMatches);

      // Get all checked-in users
      const { data: signups } = await supabase
        .from('evt_signups')
        .select('user_id, profile:usr_profiles(nickname)')
        .eq('event_id', eventId)
        .eq('checked_in', true);

      // Find users not in any active pair
      const pairedUserIds = new Set<string>();
      activeMatches.forEach((m) => {
        pairedUserIds.add(m.user1_id);
        pairedUserIds.add(m.user2_id);
      });

      const unpaired = (signups ?? [])
        .filter((s: any) => !pairedUserIds.has(s.user_id))
        .map((s: any) => ({
          user_id: s.user_id,
          nickname: s.profile?.nickname ?? null,
        }));

      setUnpairedUsers(unpaired);
    } catch (error) {
      console.error('Failed to fetch manual pair data:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBreakPair = async (match: MatchWithProfiles) => {
    try {
      await manualUnpair(match.match_id, eventId);
      // Broadcast updated state
      broadcastMatchAssignments(eventId, stepId, {
        pairs: [],
        unpaired: [match.user1_id, match.user2_id],
        timestamp: new Date().toISOString(),
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to break pair:', error);
    }
  };

  const handleManualPair = async () => {
    if (!selectedUser1 || !selectedUser2 || selectedUser1 === selectedUser2) return;
    setPairing(true);
    try {
      const matchId = await manualPair(eventId, selectedUser1, selectedUser2);
      // Broadcast the new match
      broadcastMatchAssignments(eventId, stepId, {
        pairs: [{ user1Id: selectedUser1, user2Id: selectedUser2, matchId }],
        timestamp: new Date().toISOString(),
      });
      setShowPairSelector(false);
      setSelectedUser1('');
      setSelectedUser2('');
      await fetchData();
    } catch (error) {
      console.error('Failed to create manual pair:', error);
    } finally {
      setPairing(false);
    }
  };

  const displayName = (userId: string, profile?: Profile | null) =>
    profile?.nickname || userId.slice(0, 8);

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Users className="w-4 h-4" />
          {t('hostActions.manualPair.title')}
        </div>
        <button
          type="button"
          onClick={() => setShowPairSelector((v) => !v)}
          className="px-3 py-1 text-xs rounded-button bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1"
        >
          <Link2 className="w-3 h-3" />
          {t('hostActions.manualPair.pairButton')}
        </button>
      </div>

      {/* Pair selector */}
      {showPairSelector && (
        <div className="mb-3 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t('hostActions.manualPair.selectUsers')}</span>
            <button type="button" onClick={() => setShowPairSelector(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <select
              value={selectedUser1}
              onChange={(e) => setSelectedUser1(e.target.value)}
              className="flex-1 min-w-[120px] px-2 py-1.5 text-sm rounded border border-border bg-background"
            >
              <option value="">{t('hostActions.manualPair.user1')}</option>
              {unpairedUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.nickname || u.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">&</span>
            <select
              value={selectedUser2}
              onChange={(e) => setSelectedUser2(e.target.value)}
              className="flex-1 min-w-[120px] px-2 py-1.5 text-sm rounded border border-border bg-background"
            >
              <option value="">{t('hostActions.manualPair.user2')}</option>
              {unpairedUsers
                .filter((u) => u.user_id !== selectedUser1)
                .map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.nickname || u.user_id.slice(0, 8)}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleManualPair}
              disabled={!selectedUser1 || !selectedUser2 || pairing}
              className="px-3 py-1.5 text-sm rounded-button bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pairing ? t('common.loading') : t('hostActions.manualPair.confirm')}
            </button>
          </div>
          {unpairedUsers.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">{t('hostActions.manualPair.noUnpaired')}</p>
          )}
        </div>
      )}

      {/* Current pairs */}
      {loading ? (
        <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
      ) : matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('hostActions.manualPair.noPairs')}</p>
      ) : (
        <div className="space-y-1.5">
          {matches.map((match) => (
            <div
              key={match.match_id}
              className="flex items-center justify-between px-3 py-2 rounded bg-background border border-border text-sm"
            >
              <span>
                {displayName(match.user1_id, match.user1_profile as Profile | undefined)}{' '}
                <span className="text-muted-foreground mx-1">&harr;</span>{' '}
                {displayName(match.user2_id, match.user2_profile as Profile | undefined)}
              </span>
              <button
                type="button"
                onClick={() => handleBreakPair(match)}
                className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 text-xs"
              >
                <Unlink className="w-3 h-3" />
                {t('hostActions.manualPair.breakPair')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Unpaired users summary */}
      {unpairedUsers.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {t('hostActions.manualPair.unpairedCount', { count: unpairedUsers.length })}
        </p>
      )}
    </div>
  );
}
