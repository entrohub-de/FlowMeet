import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * GET /api/email/weekly-digest
 *
 * Sends email notifications to mutual-interest pairs.
 * Protected by CRON_SECRET header check.
 * Intended to be called by Vercel Cron or external scheduler weekly.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Find mutual interest pairs not yet notified
  const { data: pairs, error } = await supabase
    .from('usr_connections')
    .select('connection_id, user1_id, user2_id')
    .eq('status', 'accepted')
    .eq('user1_interested', true)
    .eq('user2_interested', true)
    .is('mutual_interest_notified_at', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pairs || pairs.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No new mutual interests' });
  }

  // Collect all user IDs
  const userIds = Array.from(new Set<string>(
    pairs.flatMap(p => [p.user1_id, p.user2_id])
  ));

  // Fetch nicknames from profiles, emails from auth.users via RPC
  const [{ data: profiles }, { data: emails }] = await Promise.all([
    supabase.from('usr_profiles').select('user_id, nickname').in('user_id', userIds),
    supabase.rpc('get_user_emails', { user_ids: userIds }),
  ]);

  const nameMap = new Map(
    (profiles ?? []).map((p: { user_id: string; nickname: string | null }) => [p.user_id, p.nickname ?? 'FlowMeet User'])
  );
  const emailMap = new Map(
    (emails ?? []).map((e: { user_id: string; email: string }) => [e.user_id, e.email])
  );

  let sentCount = 0;
  const notifiedIds: string[] = [];
  const errors: string[] = [];

  for (const pair of pairs) {
    const name1 = nameMap.get(pair.user1_id) ?? 'FlowMeet User';
    const name2 = nameMap.get(pair.user2_id) ?? 'FlowMeet User';
    const email1 = emailMap.get(pair.user1_id) as string | undefined;
    const email2 = emailMap.get(pair.user2_id) as string | undefined;

    const sendEmail = async (toEmail: string, recipientName: string, partnerName: string) => {
      try {
        const result = await resend.emails.send({
          from: 'Entrohub <noreply@updates.entrohub.io>',
          to: toEmail,
          subject: `${partnerName} is also interested in connecting with you!`,
          html: `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff;">
              <div style="padding: 24px 24px 16px; text-align: center;">
                <img src="https://app.entrohub.io/images/entrohub-full-logo.png" alt="Entrohub" style="height: 36px;" />
              </div>
              <div style="padding: 0 24px 24px;">
                <h2 style="color: #5272F7; margin: 0 0 16px;">Mutual Interest Match!</h2>
                <p style="color: #333; line-height: 1.6;">Hi ${recipientName},</p>
                <p style="color: #333; line-height: 1.6;">Great news! <strong>${partnerName}</strong> has also shown interest in getting to know you better.</p>
                <p style="color: #333; line-height: 1.6;">You both marked each other as "Interested" on Entrohub. This is a great opportunity to continue your conversation!</p>
                <div style="margin: 24px 0; text-align: center;">
                  <a href="https://app.entrohub.io/user/connections"
                     style="display: inline-block; padding: 12px 32px; background: #5272F7; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    View Connections
                  </a>
                </div>
              </div>
              <div style="padding: 16px 24px; border-top: 1px solid #eee; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">Entrohub &mdash; Connect with people who matter</p>
              </div>
            </div>
          `,
        });
        if (result.error) {
          errors.push(`${toEmail}: ${result.error.message}`);
          return false;
        }
        return true;
      } catch (err) {
        errors.push(`${toEmail}: ${err instanceof Error ? err.message : String(err)}`);
        return false;
      }
    };

    let sent = false;
    if (email1) sent = await sendEmail(email1, name1, name2) || sent;
    if (email2) sent = await sendEmail(email2, name2, name1) || sent;

    if (sent) {
      sentCount++;
      notifiedIds.push(pair.connection_id);
    }
  }

  // Mark as notified
  if (notifiedIds.length > 0) {
    await supabase
      .from('usr_connections')
      .update({ mutual_interest_notified_at: new Date().toISOString() })
      .in('connection_id', notifiedIds);
  }

  return NextResponse.json({ sent: sentCount, total: pairs.length, errors });
}
