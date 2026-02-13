import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Direct connection to local Supabase (not through proxy)
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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
const INDUSTRIES = ['科技', '金融', '教育', '医疗', '设计', '咨询'];
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case 'setup': {
        // Create test users and return their info
        const count: number = body.count || 20;
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
                // Ensure profile exists
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

          users.push({ email, userId, nickname });
        }

        return NextResponse.json({ users });
      }

      case 'signup': {
        const { eventId, userIds } = body as { eventId: string; userIds: string[] };
        let ok = 0;
        for (const uid of userIds) {
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
        for (const uid of userIds) {
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
      { status: 500 }
    );
  }
}
