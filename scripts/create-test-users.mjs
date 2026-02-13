#!/usr/bin/env node

/**
 * Create test users for FlowMeet testing.
 *
 * Usage:
 *   node scripts/create-test-users.mjs --count 10 --event <eventId>
 *
 * Environment variables required:
 *   SUPABASE_URL          - Supabase project URL
 *   SUPABASE_SERVICE_KEY  - Supabase Service Role Key (not the anon key!)
 *
 * You can set them in frontend/.env.local or pass inline:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/create-test-users.mjs --count 5
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local if exists
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
    // .env.local not found, rely on env vars
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  console.error('Set SUPABASE_SERVICE_KEY in env or frontend/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

const count = parseInt(getArg('--count') || '10');
const eventId = getArg('--event');

const NICKNAMES = [
  '张晓', 'Alex', '李明', 'Sophie', '王芳', 'Tom', '赵静', 'Emily',
  '陈强', 'Michael', '刘洋', 'Hannah', '周军', 'David', '吴婷', 'Sarah',
  '孙鹏', 'James', '黄丽', 'Linda',
];
const GENDERS = ['男', '女'];
const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54'];
const INDUSTRIES = ['科技', '金融', '教育', '医疗', '设计', '咨询'];
const PURPOSES = ['networking', 'learning', 'collaboration', 'fun'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log(`Creating ${count} test users...`);
  const created = [];

  for (let i = 1; i <= count; i++) {
    const email = `test-user-${String(i).padStart(2, '0')}@flowmeet.test`;
    const password = 'testpass123';

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes('already been registered')) {
        // User already exists, look up their ID
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u) => u.email === email);
        if (existing) {
          console.log(`  [${i}] ${email} already exists (${existing.id})`);
          created.push({ email, password, userId: existing.id });
          continue;
        }
      }
      console.error(`  [${i}] Failed to create ${email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;
    const nickname = NICKNAMES[(i - 1) % NICKNAMES.length] + (i > NICKNAMES.length ? ` ${i}` : '');

    // Create profile
    await supabase.from('usr_profiles').upsert({
      user_id: userId,
      nickname,
      gender: pick(GENDERS),
      age_group: pick(AGE_GROUPS),
      profile_completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Create preferences
    await supabase.from('usr_preferences').upsert({
      user_id: userId,
      industry: pick(INDUSTRIES),
      purpose: pick(PURPOSES),
      languages: 'zh,en',
      interests: '社交,学习,创业',
    }, { onConflict: 'user_id' });

    console.log(`  [${i}] Created: ${email} / ${nickname} (${userId})`);
    created.push({ email, password, userId });
  }

  // If event ID provided, sign up all users to the event
  if (eventId) {
    console.log(`\nSigning up ${created.length} users to event ${eventId}...`);

    // Get session_id for this event
    const { data: sessions } = await supabase
      .from('session_flows')
      .select('session_id')
      .eq('event_id', eventId)
      .limit(1);

    const sessionId = sessions?.[0]?.session_id;

    for (const user of created) {
      // evt_signups
      await supabase.from('evt_signups').upsert({
        event_id: eventId,
        user_id: user.userId,
        signed_up_at: new Date().toISOString(),
      }, { onConflict: 'event_id,user_id' });

      // evt_assignments (checked in)
      if (sessionId) {
        await supabase.from('evt_assignments').upsert({
          session_id: sessionId,
          user_id: user.userId,
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        }, { onConflict: 'session_id,user_id' });
      }
    }
    console.log('All users signed up and checked in.');
  }

  console.log('\n=== Test User Credentials ===');
  console.log('Password for all users: testpass123');
  console.log('Emails:');
  created.forEach((u) => console.log(`  ${u.email}`));
}

main().catch(console.error);
