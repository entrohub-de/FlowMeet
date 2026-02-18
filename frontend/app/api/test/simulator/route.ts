import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Three-layer protection for test simulator:
// 1. NODE_ENV must be 'development'
// 2. TEST_SIMULATOR_SECRET env var must be set
// 3. Request must include matching X-Test-Secret header
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TEST_SECRET = process.env.TEST_SIMULATOR_SECRET || '';

function guardRequest(req: NextRequest): NextResponse | null {
  // Layer 1: environment check
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test simulator is only available in development mode' },
      { status: 403 },
    );
  }

  // Layer 2: server-side secret must be configured
  if (!TEST_SECRET) {
    return NextResponse.json(
      { error: 'TEST_SIMULATOR_SECRET is not configured' },
      { status: 503 },
    );
  }

  // Layer 3: request must carry the matching secret
  const clientSecret = req.headers.get('x-test-secret');
  if (clientSecret !== TEST_SECRET) {
    return NextResponse.json(
      { error: 'Invalid or missing X-Test-Secret header' },
      { status: 401 },
    );
  }

  return null; // all checks passed
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NICKNAMES = [
  '张晓', 'Alex', '李明', 'Sophie', '王芳', 'Tom', '赵静', 'Emily',
  '陈强', 'Michael', '刘洋', 'Hannah', '周军', 'David', '吴婷', 'Sarah',
  '孙鹏', 'James', '黄丽', 'Linda', '马超', 'Chris', '朱莉', 'Kate',
  '徐磊', 'Ryan', '罗琳', 'Jessica', '丁伟', 'Brian',
];
const GENDERS = ['男', '女'];
const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54'];
const PROFESSIONAL_BACKGROUNDS = ['engineer', 'marketing_sales', 'student_research', 'founder', 'product_manager', 'designer', 'finance_legal'];
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const MAX_BATCH_SIZE = 100;

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req);
  if (blocked) return blocked;

  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case 'setup': {
        const count = Math.min(Math.max(body.count || 20, 1), MAX_BATCH_SIZE);
        const users: Array<{ email: string; userId: string; nickname: string }> = [];

        for (let i = 1; i <= count; i++) {
          const email = `test-user-${String(i).padStart(2, '0')}@flowmeet.test`;
          const nickname = NICKNAMES[(i - 1) % NICKNAMES.length] + (i > NICKNAMES.length ? ` ${i}` : '');

          let userId: string;
          const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password: 'testpass123',
            email_confirm: true,
          });

          if (authError) {
            if (authError.message?.includes('already been registered')) {
              const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
              const existing = listData?.users?.find((u) => u.email === email);
              if (existing) {
                userId = existing.id;
                const { data: profile } = await adminClient
                  .from('usr_profiles')
                  .select('nickname')
                  .eq('user_id', userId)
                  .maybeSingle();
                users.push({ email, userId, nickname: profile?.nickname || nickname });
                continue;
              }
              continue;
            }
            continue;
          }

          userId = authData.user.id;

          await adminClient.from('usr_profiles').upsert({
            user_id: userId,
            nickname,
            gender: pick(GENDERS),
            age_group: pick(AGE_GROUPS),
            profile_completed_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

          const INTEREST_POOL = ['startup', 'tech_ai', 'career', 'cross_cultural', 'investment', 'product', 'design', 'marketing'];
          const interests = [pick(INTEREST_POOL), pick(INTEREST_POOL)].filter((v, i, a) => a.indexOf(v) === i).join(',');
          await adminClient.from('usr_preferences').upsert({
            user_id: userId,
            industry_background: pick(PROFESSIONAL_BACKGROUNDS),
            startup_stage: pick(['not_started', 'idea', 'seed', 'growth', 'mature', 'not_entrepreneur']),
            languages: 'chinese,english',
            interests,
          }, { onConflict: 'user_id' });

          users.push({ email, userId, nickname });
        }

        return NextResponse.json({ users });
      }

      case 'signup': {
        const { eventId, userIds } = body as { eventId: string; userIds: string[] };
        let ok = 0;
        for (const uid of userIds.slice(0, MAX_BATCH_SIZE)) {
          const { error } = await adminClient.from('evt_signups').upsert({
            event_id: eventId,
            user_id: uid,
            status: 'active',
          }, { onConflict: 'event_id,user_id' });
          if (!error) ok++;
        }
        return NextResponse.json({ success: ok, total: userIds.length });
      }

      case 'checkin': {
        const { eventId, userIds } = body as { eventId: string; userIds: string[] };
        let ok = 0;
        for (const uid of userIds.slice(0, MAX_BATCH_SIZE)) {
          const { error } = await adminClient.from('evt_signups').update({
            checked_in: true,
            checked_in_at: new Date().toISOString(),
          }).eq('event_id', eventId).eq('user_id', uid);
          if (!error) ok++;
        }
        return NextResponse.json({ success: ok, total: userIds.length });
      }

      case 'get-flow': {
        const { eventId } = body as { eventId: string };
        const { data } = await adminClient
          .from('session_active_flows')
          .select('steps, flow_status, active_step_id')
          .eq('event_id', eventId)
          .maybeSingle();
        return NextResponse.json({ flow: data });
      }

      case 'get-events': {
        const { data } = await adminClient
          .from('evt_events')
          .select('event_id, name')
          .order('created_at', { ascending: false })
          .limit(20);
        return NextResponse.json({ events: data || [] });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
