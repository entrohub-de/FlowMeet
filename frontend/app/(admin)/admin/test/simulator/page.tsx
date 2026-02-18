'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Gamepad2, Users, UserCheck, Radio, Hand, Play, Square,
  Zap, ChevronDown, RotateCcw, Loader2,
} from 'lucide-react';
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimUser {
  idx: number;
  email: string;
  userId: string;
  nickname: string;
  signedUp: boolean;
  checkedIn: boolean;
  signedIn: boolean;
  inQueue: boolean;
  ready: boolean;
  matched: boolean;
  partnerName: string | null;
  groupMembers: string[] | null;
}

interface FlowStep {
  id: string;
  title: string;
  status: string;
  pairingMode?: string;
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'match';
}

// ─── API helper ───────────────────────────────────────────────────────────────

const TEST_SECRET = process.env.NEXT_PUBLIC_TEST_SIMULATOR_SECRET || '';

async function simApi(body: Record<string, unknown>) {
  const res = await fetch('/api/test/simulator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Secret': TEST_SECRET,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Supabase URL for browser clients ─────────────────────────────────────────

function getBrowserSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (envUrl.startsWith('/')) {
    return `${window.location.origin}${envUrl}`;
  }
  return envUrl;
}

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const PASSWORD = 'testpass123';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  // Events & steps
  const [events, setEvents] = useState<Array<{ event_id: string; name: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState('');

  // Users
  const [userCount, setUserCount] = useState(20);
  const [users, setUsers] = useState<SimUser[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Loading states
  const [setupLoading, setSetupLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Refs for Supabase clients and channels (not serializable in state)
  const clientsRef = useRef<Map<string, SupabaseClient>>(new Map());
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Ready count slider
  const [readySlider, setReadySlider] = useState(20);

  // ─── Logging ──────────────────────────────────────────────────────────

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('zh-CN');
    setLogs((prev) => [...prev.slice(-200), { time, message, type }]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ─── Load events ──────────────────────────────────────────────────────

  useEffect(() => {
    simApi({ action: 'get-events' }).then((data) => {
      setEvents(data.events || []);
      if (data.events?.length > 0) {
        setSelectedEventId(data.events[0].event_id);
      }
    });
  }, []);

  // ─── Load flow steps when event changes ───────────────────────────────

  useEffect(() => {
    if (!selectedEventId) return;
    simApi({ action: 'get-flow', eventId: selectedEventId }).then((data) => {
      const steps = (data.flow?.steps || []) as FlowStep[];
      setFlowSteps(steps);
      // Auto-select active step or first matching step
      const active = steps.find((s) => s.status === 'active');
      const matching = steps.find((s) => s.pairingMode);
      setSelectedStepId(active?.id || matching?.id || steps[0]?.id || '');
    });
  }, [selectedEventId]);

  // ─── Setup users ──────────────────────────────────────────────────────

  const handleSetup = useCallback(async () => {
    setSetupLoading(true);
    addLog(`创建 ${userCount} 个测试用户...`);

    try {
      const data = await simApi({ action: 'setup', count: userCount });
      const created: SimUser[] = (data.users || []).map((u: { email: string; userId: string; nickname: string }, i: number) => ({
        idx: i + 1,
        email: u.email,
        userId: u.userId,
        nickname: u.nickname,
        signedUp: false,
        checkedIn: false,
        signedIn: false,
        inQueue: false,
        ready: false,
        matched: false,
        partnerName: null,
        groupMembers: null,
      }));
      setUsers(created);
      setReadySlider(created.length);
      addLog(`✅ ${created.length} 个用户已创建`, 'success');
    } catch (err) {
      addLog(`❌ 创建失败: ${err}`, 'error');
    } finally {
      setSetupLoading(false);
    }
  }, [userCount, addLog]);

  // ─── Sign in all users (create browser Supabase clients) ─────────────

  const handleSignIn = useCallback(async () => {
    if (users.length === 0) return;
    setActionLoading('signin');
    addLog(`登录 ${users.length} 个用户...`);

    const url = getBrowserSupabaseUrl();
    let ok = 0;

    for (const user of users) {
      if (clientsRef.current.has(user.userId)) {
        ok++;
        continue;
      }

      try {
        const client = createClient(url, ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, storageKey: `sim-${user.userId}` },
          realtime: { params: { eventsPerSecond: 10 } },
        });

        const { error } = await client.auth.signInWithPassword({
          email: user.email,
          password: PASSWORD,
        });

        if (error) {
          addLog(`❌ [${user.idx}] ${user.nickname} 登录失败: ${error.message}`, 'error');
          continue;
        }

        clientsRef.current.set(user.userId, client);
        ok++;
      } catch (err) {
        addLog(`❌ [${user.idx}] ${user.nickname} 登录异常`, 'error');
      }
    }

    setUsers((prev) => prev.map((u) => ({
      ...u,
      signedIn: clientsRef.current.has(u.userId),
    })));

    addLog(`✅ ${ok}/${users.length} 人已登录`, 'success');
    setActionLoading(null);
  }, [users, addLog]);

  // ─── Signup all ───────────────────────────────────────────────────────

  const handleSignup = useCallback(async () => {
    if (!selectedEventId || users.length === 0) return;
    setActionLoading('signup');
    addLog(`报名 ${users.length} 个用户到活动...`);

    const data = await simApi({
      action: 'signup',
      eventId: selectedEventId,
      userIds: users.map((u) => u.userId),
    });

    setUsers((prev) => prev.map((u) => ({ ...u, signedUp: true })));
    addLog(`✅ ${data.success}/${data.total} 人已报名`, 'success');
    setActionLoading(null);
  }, [selectedEventId, users, addLog]);

  // ─── Checkin all ──────────────────────────────────────────────────────

  const handleCheckin = useCallback(async () => {
    if (!selectedEventId || users.length === 0) return;
    setActionLoading('checkin');
    addLog(`签到 ${users.length} 个用户...`);

    const data = await simApi({
      action: 'checkin',
      eventId: selectedEventId,
      userIds: users.map((u) => u.userId),
    });

    setUsers((prev) => prev.map((u) => ({ ...u, checkedIn: true })));
    addLog(`✅ ${data.success}/${data.total} 人已签到`, 'success');
    setActionLoading(null);
  }, [selectedEventId, users, addLog]);

  // ─── Join matching queue ──────────────────────────────────────────────

  const handleJoinQueue = useCallback(async () => {
    if (!selectedEventId || !selectedStepId) {
      addLog('❌ 请先选择活动和步骤', 'error');
      return;
    }
    setActionLoading('join');
    const channelName = `event:${selectedEventId}:matching:${selectedStepId}`;
    addLog(`加入匹配队列 channel: ${channelName}`);
    let joined = 0;

    for (const user of users) {
      if (channelsRef.current.has(user.userId)) {
        joined++;
        continue;
      }

      const client = clientsRef.current.get(user.userId);
      if (!client) {
        addLog(`⚠️ [${user.idx}] ${user.nickname} 未登录，跳过`, 'error');
        continue;
      }

      try {
        const channel = client.channel(channelName, {
          config: { presence: { key: user.userId } },
        });

        // Listen for match assignments
        channel
          .on('presence', { event: 'sync' }, () => { /* silent */ })
          .on('broadcast', { event: 'match_assigned' }, ({ payload }) => {
            const pairs = payload?.pairs || [];
            const myPair = pairs.find(
              (p: { user1Id: string; user2Id: string }) =>
                p.user1Id === user.userId || p.user2Id === user.userId
            );
            if (myPair) {
              const partnerId = myPair.user1Id === user.userId ? myPair.user2Id : myPair.user1Id;
              setUsers((prev) => {
                const partnerUser = prev.find((u) => u.userId === partnerId);
                return prev.map((u) =>
                  u.userId === user.userId
                    ? { ...u, matched: true, partnerName: partnerUser?.nickname || partnerId.slice(0, 8) }
                    : u
                );
              });
              const partnerNick = users.find((u) => u.userId === partnerId)?.nickname || partnerId.slice(0, 8);
              addLog(`🎉 ${user.nickname} ↔ ${partnerNick}`, 'match');
            } else if (payload?.unpaired?.includes(user.userId)) {
              addLog(`😢 ${user.nickname} 未配对 (奇数剩余)`, 'info');
            }
          })
          .on('broadcast', { event: 'group_assigned' }, ({ payload }) => {
            const myGroup = payload?.groups?.find(
              (g: { memberIds: string[] }) => g.memberIds?.includes(user.userId)
            );
            if (myGroup) {
              const otherNames = myGroup.memberIds
                .filter((id: string) => id !== user.userId)
                .map((id: string) => users.find((u) => u.userId === id)?.nickname || id.slice(0, 8));
              setUsers((prev) =>
                prev.map((u) =>
                  u.userId === user.userId
                    ? { ...u, matched: true, groupMembers: otherNames }
                    : u
                )
              );
              addLog(`🎉 ${user.nickname} → 分组 [${otherNames.join(', ')}]`, 'match');
            }
          });

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 10000);
          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              const now = new Date().toISOString();
              await channel.track({
                userId: user.userId,
                ready: false,
                joinedAt: now,
                lastHeartbeat: now,
              });
              channelsRef.current.set(user.userId, channel);
              joined++;
              resolve();
            } else if (status === 'CHANNEL_ERROR') {
              clearTimeout(timeout);
              reject(new Error('channel error'));
            }
          });
        });
      } catch (err) {
        addLog(`❌ [${user.idx}] ${user.nickname} 加入失败`, 'error');
      }
    }

    setUsers((prev) => prev.map((u) => ({
      ...u,
      inQueue: channelsRef.current.has(u.userId),
    })));

    addLog(`✅ ${joined}/${users.length} 人已加入队列`, 'success');
    setActionLoading(null);
  }, [selectedEventId, selectedStepId, users, addLog]);

  // ─── Set ready ────────────────────────────────────────────────────────

  const handleSetReady = useCallback(async (count?: number) => {
    const targetCount = count ?? users.length;
    const targets = users.filter((u) => channelsRef.current.has(u.userId) && !u.ready).slice(0, targetCount);

    if (targets.length === 0) {
      addLog('⚠️ 没有可设为准备的用户', 'info');
      return;
    }

    setActionLoading('ready');
    addLog(`设置 ${targets.length} 个用户为准备状态...`);

    for (const user of targets) {
      const channel = channelsRef.current.get(user.userId);
      if (!channel) continue;

      const now = new Date().toISOString();
      await channel.track({
        userId: user.userId,
        ready: true,
        joinedAt: now,
        lastHeartbeat: now,
      });
    }

    const readyIds = new Set(targets.map((u) => u.userId));
    setUsers((prev) => prev.map((u) =>
      readyIds.has(u.userId) ? { ...u, ready: true } : u
    ));

    const totalReady = users.filter((u) => u.ready).length + targets.length;
    addLog(`✅ ${totalReady}/${users.length} 人已准备`, 'success');
    setActionLoading(null);
  }, [users, addLog]);

  // ─── Unready all ──────────────────────────────────────────────────────

  const handleUnready = useCallback(async () => {
    const targets = users.filter((u) => u.ready);
    if (targets.length === 0) return;

    setActionLoading('unready');

    for (const user of targets) {
      const channel = channelsRef.current.get(user.userId);
      if (!channel) continue;

      const now = new Date().toISOString();
      await channel.track({
        userId: user.userId,
        ready: false,
        joinedAt: now,
        lastHeartbeat: now,
      });
    }

    setUsers((prev) => prev.map((u) => ({ ...u, ready: false })));
    addLog('✅ 所有用户已取消准备', 'success');
    setActionLoading(null);
  }, [users, addLog]);

  // ─── Leave queue ──────────────────────────────────────────────────────

  const handleLeaveQueue = useCallback(async () => {
    setActionLoading('leave');

    for (const [, channel] of channelsRef.current.entries()) {
      await channel.unsubscribe();
    }
    channelsRef.current.clear();

    setUsers((prev) => prev.map((u) => ({
      ...u,
      inQueue: false,
      ready: false,
      matched: false,
      partnerName: null,
      groupMembers: null,
    })));

    addLog('✅ 所有用户已离开队列', 'success');
    setActionLoading(null);
  }, [addLog]);

  // ─── Auto mode ────────────────────────────────────────────────────────

  const handleAuto = useCallback(async () => {
    if (!selectedEventId || !selectedStepId) {
      addLog('❌ 请先选择活动和步骤', 'error');
      return;
    }

    setActionLoading('auto');
    addLog('🚀 自动模式: 创建 → 登录 → 报名 → 签到 → 加入队列 → 准备');

    try {
      // Step 1: Setup
      if (users.length === 0) {
        addLog('📦 Step 1/6: 创建用户...');
        const data = await simApi({ action: 'setup', count: userCount });
        const created: SimUser[] = (data.users || []).map((u: { email: string; userId: string; nickname: string }, i: number) => ({
          idx: i + 1, email: u.email, userId: u.userId, nickname: u.nickname,
          signedUp: false, checkedIn: false, signedIn: false,
          inQueue: false, ready: false, matched: false,
          partnerName: null, groupMembers: null,
        }));
        setUsers(created);
        setReadySlider(created.length);
        addLog(`✅ ${created.length} 个用户已创建`, 'success');

        // Need to wait for state update
        await new Promise((r) => setTimeout(r, 100));

        // Step 2: Sign in
        addLog('🔑 Step 2/6: 登录...');
        const url = getBrowserSupabaseUrl();
        let signedIn = 0;
        for (const user of created) {
          try {
            const client = createClient(url, ANON_KEY, {
              auth: { persistSession: false, autoRefreshToken: false, storageKey: `sim-${user.userId}` },
              realtime: { params: { eventsPerSecond: 10 } },
            });
            const { error } = await client.auth.signInWithPassword({
              email: user.email, password: PASSWORD,
            });
            if (!error) {
              clientsRef.current.set(user.userId, client);
              signedIn++;
            }
          } catch { /* skip */ }
        }
        setUsers((prev) => prev.map((u) => ({ ...u, signedIn: clientsRef.current.has(u.userId) })));
        addLog(`✅ ${signedIn} 人已登录`, 'success');

        // Step 3: Signup
        addLog('📝 Step 3/6: 报名...');
        const signupData = await simApi({
          action: 'signup', eventId: selectedEventId,
          userIds: created.map((u) => u.userId),
        });
        setUsers((prev) => prev.map((u) => ({ ...u, signedUp: true })));
        addLog(`✅ ${signupData.success} 人已报名`, 'success');

        // Step 4: Checkin
        addLog('🎫 Step 4/6: 签到...');
        const checkinData = await simApi({
          action: 'checkin', eventId: selectedEventId,
          userIds: created.map((u) => u.userId),
        });
        setUsers((prev) => prev.map((u) => ({ ...u, checkedIn: true })));
        addLog(`✅ ${checkinData.success} 人已签到`, 'success');

        // Step 5: Join queue
        const channelName = `event:${selectedEventId}:matching:${selectedStepId}`;
        addLog(`🔗 Step 5/6: 加入队列 channel: ${channelName}`);
        let joined = 0;
        for (const user of created) {
          const client = clientsRef.current.get(user.userId);
          if (!client) continue;
          try {
            const channel = client.channel(channelName, {
              config: { presence: { key: user.userId } },
            });
            channel
              .on('presence', { event: 'sync' }, () => {})
              .on('broadcast', { event: 'match_assigned' }, ({ payload }) => {
                const myPair = payload?.pairs?.find(
                  (p: { user1Id: string; user2Id: string }) =>
                    p.user1Id === user.userId || p.user2Id === user.userId
                );
                if (myPair) {
                  const partnerId = myPair.user1Id === user.userId ? myPair.user2Id : myPair.user1Id;
                  setUsers((prev) => {
                    const partner = prev.find((u) => u.userId === partnerId);
                    return prev.map((u) =>
                      u.userId === user.userId
                        ? { ...u, matched: true, partnerName: partner?.nickname || partnerId.slice(0, 8) }
                        : u
                    );
                  });
                  addLog(`🎉 ${user.nickname} ↔ ${created.find((u) => u.userId === partnerId)?.nickname || '?'}`, 'match');
                }
              })
              .on('broadcast', { event: 'group_assigned' }, ({ payload }) => {
                const myGroup = payload?.groups?.find(
                  (g: { memberIds: string[] }) => g.memberIds?.includes(user.userId)
                );
                if (myGroup) {
                  const others = myGroup.memberIds
                    .filter((id: string) => id !== user.userId)
                    .map((id: string) => created.find((u) => u.userId === id)?.nickname || id.slice(0, 8));
                  setUsers((prev) =>
                    prev.map((u) =>
                      u.userId === user.userId
                        ? { ...u, matched: true, groupMembers: others }
                        : u
                    )
                  );
                  addLog(`🎉 ${user.nickname} → [${others.join(', ')}]`, 'match');
                }
              });

            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                addLog(`⚠️ [${user.idx}] ${user.nickname} channel 订阅超时`, 'error');
                reject(new Error('timeout'));
              }, 10000);
              channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                  clearTimeout(timeout);
                  const now = new Date().toISOString();
                  await channel.track({
                    userId: user.userId, ready: false,
                    joinedAt: now, lastHeartbeat: now,
                  });
                  channelsRef.current.set(user.userId, channel);
                  joined++;
                  if (joined === 1) addLog(`✅ 首个用户已成功订阅并 track presence`);
                  resolve();
                } else if (status === 'CHANNEL_ERROR') {
                  clearTimeout(timeout);
                  addLog(`❌ [${user.idx}] ${user.nickname} channel error`, 'error');
                  reject(new Error('channel error'));
                }
              });
            });
          } catch { /* skip */ }
        }
        setUsers((prev) => prev.map((u) => ({
          ...u, inQueue: channelsRef.current.has(u.userId),
        })));
        addLog(`✅ ${joined} 人已加入队列`, 'success');

        // Step 6: Ready
        addLog('✋ Step 6/6: 全部准备...');
        for (const user of created) {
          const channel = channelsRef.current.get(user.userId);
          if (!channel) continue;
          const now = new Date().toISOString();
          await channel.track({
            userId: user.userId, ready: true,
            joinedAt: now, lastHeartbeat: now,
          });
        }
        setUsers((prev) => prev.map((u) => ({
          ...u, ready: channelsRef.current.has(u.userId),
        })));
        addLog(`✅ 全部就绪！现在去主持人端触发匹配吧。`, 'success');
      } else {
        // Users already exist, just run the remaining steps
        if (!users[0].signedIn) await handleSignIn();
        if (!users[0].signedUp) await handleSignup();
        if (!users[0].checkedIn) await handleCheckin();
        if (!users[0].inQueue) await handleJoinQueue();
        await handleSetReady();
      }
    } catch (err) {
      addLog(`❌ 自动模式出错: ${err}`, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [selectedEventId, selectedStepId, userCount, users, addLog, handleSignIn, handleSignup, handleCheckin, handleJoinQueue, handleSetReady]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      for (const channel of channelsRef.current.values()) {
        channel.unsubscribe();
      }
      channelsRef.current.clear();
      for (const client of clientsRef.current.values()) {
        client.auth.signOut().catch(() => {});
      }
      clientsRef.current.clear();
    };
  }, []);

  // ─── Stats ────────────────────────────────────────────────────────────

  const stats = {
    total: users.length,
    signedIn: users.filter((u) => u.signedIn).length,
    signedUp: users.filter((u) => u.signedUp).length,
    checkedIn: users.filter((u) => u.checkedIn).length,
    inQueue: users.filter((u) => u.inQueue).length,
    ready: users.filter((u) => u.ready).length,
    matched: users.filter((u) => u.matched).length,
  };

  const selectedStep = flowSteps.find((s) => s.id === selectedStepId);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">多用户模拟器</h1>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            DEV ONLY
          </span>
        </div>

        {/* Config Panel */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Event selector */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">活动</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              >
                {events.map((e) => (
                  <option key={e.event_id} value={e.event_id}>{e.name}</option>
                ))}
              </select>
            </div>

            {/* Step selector */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                流程步骤
                {selectedStep?.pairingMode && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-xs">
                    {selectedStep.pairingMode}
                  </span>
                )}
              </label>
              <select
                value={selectedStepId}
                onChange={(e) => setSelectedStepId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              >
                {flowSteps.length === 0 && <option value="">无活跃流程</option>}
                {flowSteps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} [{s.status}]{s.pairingMode ? ` (${s.pairingMode})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* User count */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                用户数: {userCount}
              </label>
              <input
                type="range"
                min={2}
                max={100}
                value={userCount}
                onChange={(e) => setUserCount(parseInt(e.target.value))}
                className="w-full accent-primary"
                disabled={users.length > 0}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-wrap gap-2">
            {/* Auto button - prominent */}
            <button
              onClick={handleAuto}
              disabled={!!actionLoading || !selectedEventId || !selectedStepId}
              className="px-5 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-40"
            >
              {actionLoading === 'auto' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              一键自动
            </button>

            <div className="w-px h-8 bg-border self-center mx-1" />

            <button
              onClick={handleSetup}
              disabled={!!actionLoading || setupLoading}
              className="px-3 py-2 bg-muted border border-border rounded-lg text-sm font-medium hover:bg-muted/80 flex items-center gap-1.5 disabled:opacity-40"
            >
              {setupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
              创建用户
            </button>

            <button
              onClick={handleSignIn}
              disabled={!!actionLoading || users.length === 0}
              className="px-3 py-2 bg-muted border border-border rounded-lg text-sm font-medium hover:bg-muted/80 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Radio className="w-3.5 h-3.5" />
              登录
            </button>

            <button
              onClick={handleSignup}
              disabled={!!actionLoading || users.length === 0}
              className="px-3 py-2 bg-muted border border-border rounded-lg text-sm font-medium hover:bg-muted/80 flex items-center gap-1.5 disabled:opacity-40"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              报名
            </button>

            <button
              onClick={handleCheckin}
              disabled={!!actionLoading || users.length === 0}
              className="px-3 py-2 bg-muted border border-border rounded-lg text-sm font-medium hover:bg-muted/80 flex items-center gap-1.5 disabled:opacity-40"
            >
              <UserCheck className="w-3.5 h-3.5" />
              签到
            </button>

            <button
              onClick={handleJoinQueue}
              disabled={!!actionLoading || users.length === 0 || !selectedStepId}
              className="px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
              加入队列
            </button>

            <div className="w-px h-8 bg-border self-center mx-1" />

            {/* Ready with count */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSetReady(readySlider)}
                disabled={!!actionLoading || stats.inQueue === 0}
                className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1.5 disabled:opacity-40"
              >
                <Hand className="w-3.5 h-3.5" />
                准备 ({readySlider})
              </button>
              <input
                type="range"
                min={1}
                max={Math.max(users.length, 1)}
                value={readySlider}
                onChange={(e) => setReadySlider(parseInt(e.target.value))}
                className="w-20 accent-green-500"
              />
            </div>

            <button
              onClick={handleUnready}
              disabled={!!actionLoading || stats.ready === 0}
              className="px-3 py-2 bg-muted border border-border rounded-lg text-sm font-medium hover:bg-muted/80 flex items-center gap-1.5 disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              取消准备
            </button>

            <button
              onClick={handleLeaveQueue}
              disabled={!!actionLoading || stats.inQueue === 0}
              className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Square className="w-3.5 h-3.5" />
              离开队列
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {users.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {[
              { label: '总计', value: stats.total, color: 'bg-gray-100 text-gray-700' },
              { label: '已登录', value: stats.signedIn, color: 'bg-blue-50 text-blue-700' },
              { label: '已报名', value: stats.signedUp, color: 'bg-indigo-50 text-indigo-700' },
              { label: '已签到', value: stats.checkedIn, color: 'bg-cyan-50 text-cyan-700' },
              { label: '在队列', value: stats.inQueue, color: 'bg-purple-50 text-purple-700' },
              { label: '已准备', value: stats.ready, color: 'bg-green-50 text-green-700' },
              { label: '已配对', value: stats.matched, color: 'bg-pink-50 text-pink-700' },
            ].map((s) => (
              <div key={s.label} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${s.color}`}>
                {s.label}: {s.value}
              </div>
            ))}
          </div>
        )}

        {/* Main content: User table + Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* User Table (2/3) */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-3 border-b border-border bg-muted/50">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                用户状态 ({users.length})
              </h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {users.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  点击「创建用户」或「一键自动」开始
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">昵称</th>
                      <th className="px-3 py-2 font-medium text-center">登录</th>
                      <th className="px-3 py-2 font-medium text-center">报名</th>
                      <th className="px-3 py-2 font-medium text-center">签到</th>
                      <th className="px-3 py-2 font-medium text-center">队列</th>
                      <th className="px-3 py-2 font-medium text-center">准备</th>
                      <th className="px-3 py-2 font-medium">配对结果</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user) => (
                      <tr key={user.userId} className={user.matched ? 'bg-green-50/50' : ''}>
                        <td className="px-3 py-2 text-muted-foreground">{user.idx}</td>
                        <td className="px-3 py-2 font-medium">{user.nickname}</td>
                        <td className="px-3 py-2 text-center">{user.signedIn ? '✅' : '—'}</td>
                        <td className="px-3 py-2 text-center">{user.signedUp ? '✅' : '—'}</td>
                        <td className="px-3 py-2 text-center">{user.checkedIn ? '✅' : '—'}</td>
                        <td className="px-3 py-2 text-center">{user.inQueue ? '🔵' : '—'}</td>
                        <td className="px-3 py-2 text-center">{user.ready ? '🟢' : '—'}</td>
                        <td className="px-3 py-2">
                          {user.matched ? (
                            <span className="text-green-600 font-medium">
                              {user.partnerName
                                ? `↔ ${user.partnerName}`
                                : user.groupMembers
                                  ? `[${user.groupMembers.join(', ')}]`
                                  : '✅'}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Logs (1/3) */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">实时日志</h2>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                清除
              </button>
            </div>
            <div className="max-h-[500px] overflow-y-auto p-3 space-y-1 text-xs font-mono">
              {logs.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">等待操作...</div>
              ) : (
                logs.map((entry, i) => (
                  <div
                    key={i}
                    className={`${
                      entry.type === 'error'
                        ? 'text-red-600'
                        : entry.type === 'success'
                          ? 'text-green-600'
                          : entry.type === 'match'
                            ? 'text-pink-600 font-semibold'
                            : 'text-muted-foreground'
                    }`}
                  >
                    <span className="text-muted-foreground/60">[{entry.time}]</span> {entry.message}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Usage hint */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
          <p><strong>使用方法:</strong></p>
          <p>1. 选择活动和流程步骤 (需要先在主持人端启动流程)</p>
          <p>2. 点击「一键自动」自动完成: 创建用户 → 登录 → 报名 → 签到 → 加入队列 → 全部准备</p>
          <p>3. 切换到主持人流程控制页面，触发匹配</p>
          <p>4. 回到本页面查看配对结果（实时更新）</p>
          <p>也可以分步操作：调整「准备」滑块控制准备人数，测试奇数配对等场景。</p>
        </div>
      </div>
    </div>
  );
}
