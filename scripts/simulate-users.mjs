#!/usr/bin/env node

/**
 * FlowMeet 多用户模拟器
 *
 * 模拟多个用户同时参与活动流程（签到、加入匹配队列、设置准备状态）。
 * 每个用户使用独立的 Supabase 客户端（模拟独立浏览器会话）。
 *
 * 用法:
 *   node scripts/simulate-users.mjs --event <eventId> --step <stepId> [--count 20] [--mode 1v1]
 *
 * 交互命令:
 *   signup    - 报名所有用户到活动
 *   checkin   - 签到所有用户
 *   join      - 加入匹配队列
 *   ready     - 所有用户设为准备
 *   ready N   - 前 N 个用户设为准备
 *   unready   - 所有用户取消准备
 *   status    - 显示当前状态
 *   leave     - 离开匹配队列
 *   auto      - 自动执行全流程 (signup → checkin → join → ready)
 *   quit      - 退出
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve @supabase/supabase-js from frontend/node_modules
const require = createRequire(resolve(__dirname, '../frontend/package.json'));
const { createClient } = require('@supabase/supabase-js');

// ─── Load environment ─────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../frontend/.env.local');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not found
  }
}

loadEnv();

// Local Supabase URL (not the proxy)
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!ANON_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Admin client (for creating users, signup, checkin)
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

const USER_COUNT = parseInt(getArg('--count') || '20');
const EVENT_ID = getArg('--event');
const STEP_ID = getArg('--step');
const MODE = getArg('--mode') || '1v1';
const PASSWORD = 'testpass123';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NICKNAMES = [
  '张晓', 'Alex', '李明', 'Sophie', '王芳', 'Tom', '赵静', 'Emily',
  '陈强', 'Michael', '刘洋', 'Hannah', '周军', 'David', '吴婷', 'Sarah',
  '孙鹏', 'James', '黄丽', 'Linda', '马超', 'Chris', '朱莉', 'Kate',
];
const GENDERS = ['男', '女'];
const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54'];
const INDUSTRIES = ['科技', '金融', '教育', '医疗', '设计', '咨询'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function log(msg) {
  const ts = new Date().toLocaleTimeString('zh-CN');
  console.log(`[${ts}] ${msg}`);
}

function logTable(data) {
  if (data.length === 0) return;
  console.table(data);
}

// ─── User state ───────────────────────────────────────────────────────────────

/** @type {Array<{ idx: number, email: string, userId: string, nickname: string, client: any, channel: any, ready: boolean, matched: boolean, partnerId: string|null, groupId: string|null }>} */
const users = [];

// ─── Step 1: Create / Reuse Test Users ────────────────────────────────────────

async function ensureTestUsers() {
  log(`📦 准备 ${USER_COUNT} 个测试用户...`);

  for (let i = 1; i <= USER_COUNT; i++) {
    const email = `test-user-${String(i).padStart(2, '0')}@flowmeet.test`;
    const nickname = NICKNAMES[(i - 1) % NICKNAMES.length] + (i > NICKNAMES.length ? ` ${i}` : '');

    // Create auth user (or skip if exists)
    let userId;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes('already been registered')) {
        // Find existing user
        const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const existing = listData?.users?.find((u) => u.email === email);
        if (existing) {
          userId = existing.id;
        } else {
          console.error(`  ❌ [${i}] Cannot find existing user ${email}`);
          continue;
        }
      } else {
        console.error(`  ❌ [${i}] Failed: ${authError.message}`);
        continue;
      }
    } else {
      userId = authData.user.id;

      // Create profile
      await adminClient.from('usr_profiles').upsert({
        user_id: userId,
        nickname,
        gender: pick(GENDERS),
        age_group: pick(AGE_GROUPS),
        profile_completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      // Create preferences
      await adminClient.from('usr_preferences').upsert({
        user_id: userId,
        industry: pick(INDUSTRIES),
        purpose: pick(['networking', 'learning', 'collaboration', 'fun']),
        languages: 'zh,en',
        interests: '社交,学习,创业',
      }, { onConflict: 'user_id' });
    }

    // Create per-user Supabase client and authenticate
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: true, persistSession: false },
    });

    const { error: signInError } = await userClient.auth.signInWithPassword({
      email,
      password: PASSWORD,
    });

    if (signInError) {
      console.error(`  ❌ [${i}] Sign-in failed: ${signInError.message}`);
      continue;
    }

    users.push({
      idx: i,
      email,
      userId,
      nickname,
      client: userClient,
      channel: null,
      ready: false,
      matched: false,
      partnerId: null,
      groupId: null,
    });
  }

  log(`✅ ${users.length} 个用户已准备就绪`);
}

// ─── Step 2: Signup to Event ──────────────────────────────────────────────────

async function signupAll(eventId) {
  log(`📝 报名 ${users.length} 个用户到活动 ${eventId}...`);

  let ok = 0;
  for (const user of users) {
    const { error } = await adminClient.from('evt_signups').upsert({
      event_id: eventId,
      user_id: user.userId,
      status: 'active',
    }, { onConflict: 'event_id,user_id' });

    if (!error) ok++;
    else console.error(`  ❌ [${user.idx}] ${user.nickname}: ${error.message}`);
  }

  log(`✅ ${ok}/${users.length} 人已报名`);
}

// ─── Step 3: Check-in ─────────────────────────────────────────────────────────

async function checkinAll(eventId) {
  log(`🎫 签到 ${users.length} 个用户...`);

  let ok = 0;
  for (const user of users) {
    const { error } = await adminClient.from('evt_signups').update({
      checked_in: true,
      checked_in_at: new Date().toISOString(),
    }).eq('event_id', eventId).eq('user_id', user.userId);

    if (!error) ok++;
    else console.error(`  ❌ [${user.idx}] ${user.nickname}: ${error.message}`);
  }

  log(`✅ ${ok}/${users.length} 人已签到`);
}

// ─── Step 4: Join Matching Queue ──────────────────────────────────────────────

async function joinQueue(eventId, stepId) {
  log(`🔗 ${users.length} 个用户加入匹配队列 (step: ${stepId})...`);

  const channelName = `event:${eventId}:matching:${stepId}`;
  let joined = 0;

  for (const user of users) {
    // Skip if already in queue
    if (user.channel) {
      joined++;
      continue;
    }

    const channel = user.client.channel(channelName, {
      config: { presence: { key: user.userId } },
    });

    // Listen for match assignments
    channel
      .on('presence', { event: 'sync' }, () => {
        // Presence sync — silent
      })
      .on('broadcast', { event: 'match_assigned' }, ({ payload }) => {
        const myPair = payload.pairs?.find(
          (p) => p.user1Id === user.userId || p.user2Id === user.userId
        );
        if (myPair) {
          const partnerId = myPair.user1Id === user.userId ? myPair.user2Id : myPair.user1Id;
          const partnerUser = users.find((u) => u.userId === partnerId);
          user.matched = true;
          user.partnerId = partnerId;
          log(`🎉 [${user.idx}] ${user.nickname} ↔ ${partnerUser?.nickname || partnerId.slice(0, 8)} (match: ${myPair.matchId.slice(0, 8)})`);
        } else if (payload.unpaired?.includes(user.userId)) {
          log(`😢 [${user.idx}] ${user.nickname} 未配对 (单数剩余)`);
        }
      })
      .on('broadcast', { event: 'group_assigned' }, ({ payload }) => {
        const myGroup = payload.groups?.find((g) => g.memberIds?.includes(user.userId));
        if (myGroup) {
          const otherNames = myGroup.memberIds
            .filter((id) => id !== user.userId)
            .map((id) => {
              const u = users.find((u2) => u2.userId === id);
              return u?.nickname || id.slice(0, 8);
            });
          user.matched = true;
          user.groupId = myGroup.groupId;
          log(`🎉 [${user.idx}] ${user.nickname} → 分组 [${otherNames.join(', ')}]`);
        }
      });

    await new Promise((resolve, reject) => {
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const now = new Date().toISOString();
          await channel.track({
            userId: user.userId,
            ready: false,
            joinedAt: now,
            lastHeartbeat: now,
          });
          user.channel = channel;
          user.ready = false;
          joined++;
          resolve();
        } else if (status === 'CHANNEL_ERROR') {
          reject(new Error(`Channel error for ${user.nickname}`));
        }
      });
    });
  }

  log(`✅ ${joined}/${users.length} 人已加入匹配队列`);
}

// ─── Step 5: Set Ready ────────────────────────────────────────────────────────

async function setReady(count) {
  const targetCount = count ?? users.length;
  const targets = users.filter((u) => u.channel && !u.ready).slice(0, targetCount);

  if (targets.length === 0) {
    log('⚠️ 没有可以设为准备的用户');
    return;
  }

  log(`✋ 设置 ${targets.length} 个用户为准备状态...`);

  for (const user of targets) {
    const now = new Date().toISOString();
    await user.channel.track({
      userId: user.userId,
      ready: true,
      joinedAt: now,
      lastHeartbeat: now,
    });
    user.ready = true;
  }

  const totalReady = users.filter((u) => u.ready).length;
  log(`✅ ${totalReady}/${users.length} 人已准备`);
}

// ─── Unready ──────────────────────────────────────────────────────────────────

async function setUnready() {
  const targets = users.filter((u) => u.channel && u.ready);

  if (targets.length === 0) {
    log('⚠️ 没有准备状态的用户');
    return;
  }

  log(`🔄 取消 ${targets.length} 个用户的准备状态...`);

  for (const user of targets) {
    const now = new Date().toISOString();
    await user.channel.track({
      userId: user.userId,
      ready: false,
      joinedAt: now,
      lastHeartbeat: now,
    });
    user.ready = false;
  }

  log('✅ 所有用户已取消准备');
}

// ─── Leave Queue ──────────────────────────────────────────────────────────────

async function leaveQueue() {
  log(`👋 ${users.length} 个用户离开匹配队列...`);

  for (const user of users) {
    if (user.channel) {
      await user.channel.unsubscribe();
      user.channel = null;
      user.ready = false;
    }
  }

  log('✅ 所有用户已离开队列');
}

// ─── Status ───────────────────────────────────────────────────────────────────

function showStatus() {
  const summary = users.map((u) => ({
    '#': u.idx,
    昵称: u.nickname,
    队列: u.channel ? '✅' : '❌',
    准备: u.ready ? '✅' : '❌',
    配对: u.matched ? '✅' : '❌',
    伙伴: u.partnerId
      ? (users.find((u2) => u2.userId === u.partnerId)?.nickname || u.partnerId.slice(0, 8))
      : u.groupId
        ? `分组 ${u.groupId.slice(0, 8)}`
        : '-',
  }));

  logTable(summary);

  const inQueue = users.filter((u) => u.channel).length;
  const readyCount = users.filter((u) => u.ready).length;
  const matchedCount = users.filter((u) => u.matched).length;

  console.log(`\n📊 总计: ${users.length} 人 | 队列: ${inQueue} | 准备: ${readyCount} | 已配对: ${matchedCount}\n`);
}

// ─── Auto mode ────────────────────────────────────────────────────────────────

async function autoRun(eventId, stepId) {
  log('🚀 自动模式: signup → checkin → join → ready');

  await signupAll(eventId);
  await new Promise((r) => setTimeout(r, 500));

  await checkinAll(eventId);
  await new Promise((r) => setTimeout(r, 500));

  await joinQueue(eventId, stepId);
  await new Promise((r) => setTimeout(r, 1000));

  await setReady();

  log('');
  log('✅ 全部就绪！现在可以在主持人端触发匹配。');
  log('   输入 status 查看状态，输入 quit 退出。');
}

// ─── Interactive CLI ──────────────────────────────────────────────────────────

async function startCLI(eventId, stepId) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\n🎮 > ',
  });

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║      FlowMeet 多用户模拟器                   ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  用户数: ${String(users.length).padEnd(4)} 模式: ${MODE.padEnd(6)}              ║`);
  console.log(`║  活动: ${(eventId || '未指定').slice(0, 36).padEnd(36)}  ║`);
  console.log(`║  步骤: ${(stepId || '未指定').slice(0, 36).padEnd(36)}  ║`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  命令:                                       ║');
  console.log('║  signup    报名到活动                         ║');
  console.log('║  checkin   签到                               ║');
  console.log('║  join      加入匹配队列                       ║');
  console.log('║  ready     全部准备 / ready N (前N人)         ║');
  console.log('║  unready   取消准备                           ║');
  console.log('║  status    查看状态                           ║');
  console.log('║  leave     离开队列                           ║');
  console.log('║  auto      自动执行全流程                     ║');
  console.log('║  quit      退出                               ║');
  console.log('╚══════════════════════════════════════════════╝');

  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];

    try {
      switch (cmd) {
        case 'signup':
          if (!eventId) { log('❌ 需要 --event 参数'); break; }
          await signupAll(eventId);
          break;

        case 'checkin':
          if (!eventId) { log('❌ 需要 --event 参数'); break; }
          await checkinAll(eventId);
          break;

        case 'join':
          if (!eventId || !stepId) { log('❌ 需要 --event 和 --step 参数'); break; }
          await joinQueue(eventId, stepId);
          break;

        case 'ready': {
          const n = parts[1] ? parseInt(parts[1]) : undefined;
          await setReady(n);
          break;
        }

        case 'unready':
          await setUnready();
          break;

        case 'status':
          showStatus();
          break;

        case 'leave':
          await leaveQueue();
          break;

        case 'auto':
          if (!eventId || !stepId) { log('❌ auto 模式需要 --event 和 --step 参数'); break; }
          await autoRun(eventId, stepId);
          break;

        case 'quit':
        case 'exit':
        case 'q':
          log('👋 正在清理...');
          await leaveQueue();
          // Sign out all users
          for (const user of users) {
            await user.client.auth.signOut().catch(() => {});
          }
          log('👋 再见！');
          process.exit(0);

        case '':
          break;

        default:
          log(`❓ 未知命令: ${cmd}`);
      }
    } catch (err) {
      log(`❌ 错误: ${err.message}`);
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    await leaveQueue();
    process.exit(0);
  });
}

// ─── List events (if no --event specified) ────────────────────────────────────

async function listEvents() {
  const { data: events, error } = await adminClient
    .from('evt_events')
    .select('event_id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !events?.length) {
    log('❌ 无法获取活动列表');
    return null;
  }

  console.log('\n可用活动:');
  events.forEach((e, i) => {
    console.log(`  [${i + 1}] ${e.name} (${e.event_id})`);
  });

  return events;
}

// ─── List active flow steps (if no --step specified) ──────────────────────────

async function listFlowSteps(eventId) {
  const { data: flow, error } = await adminClient
    .from('session_active_flows')
    .select('steps, flow_status, active_step_id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error || !flow || !flow.steps) {
    log('⚠️ 该活动没有活跃的流程。请先在主持人端启动流程。');
    return null;
  }

  console.log(`\n流程状态: ${flow.flow_status}`);
  console.log('流程步骤:');
  const steps = flow.steps;
  steps.forEach((s, i) => {
    const active = s.id === flow.active_step_id ? ' 👈 当前' : '';
    const mode = s.pairingMode ? ` [${s.pairingMode}]` : '';
    console.log(`  [${i + 1}] ${s.title}${mode} — ${s.status}${active} (id: ${s.id})`);
  });

  return steps;
}

// ─── Interactive event/step selection ─────────────────────────────────────────

async function interactiveSelect() {
  let eventId = EVENT_ID;
  let stepId = STEP_ID;

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  if (!eventId) {
    const events = await listEvents();
    if (!events) { rl.close(); process.exit(1); }
    const choice = await ask('\n选择活动编号 (或直接输入 event_id): ');
    const num = parseInt(choice);
    if (num >= 1 && num <= events.length) {
      eventId = events[num - 1].event_id;
    } else {
      eventId = choice.trim();
    }
  }

  if (!stepId) {
    const steps = await listFlowSteps(eventId);
    if (steps && steps.length > 0) {
      const choice = await ask('\n选择步骤编号 (或直接输入 step_id, 回车跳过): ');
      if (choice.trim()) {
        const num = parseInt(choice);
        if (num >= 1 && num <= steps.length) {
          stepId = steps[num - 1].id;
        } else {
          stepId = choice.trim();
        }
      }
    }
  }

  rl.close();
  return { eventId, stepId };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  log(`🚀 FlowMeet 多用户模拟器启动 (${USER_COUNT} 用户, 模式: ${MODE})`);
  log(`📡 Supabase: ${SUPABASE_URL}`);

  // Ensure test users exist and are authenticated
  await ensureTestUsers();

  if (users.length === 0) {
    log('❌ 没有可用的测试用户');
    process.exit(1);
  }

  // Select event and step
  const { eventId, stepId } = await interactiveSelect();

  log(`📋 活动: ${eventId}`);
  if (stepId) log(`📋 步骤: ${stepId}`);

  // Start interactive CLI
  await startCLI(eventId, stepId);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
