import { createServerClient } from '@/lib/supabase/server';

async function getResend() {
  const { Resend } = await import('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

const emailContent = {
  zh: {
    subject: (eventName: string) => `报名成功 — ${eventName}`,
    heading: '报名成功！',
    greeting: (name: string) => `${name}，你好！`,
    body: (eventName: string) =>
      `你已成功报名 <strong>${eventName}</strong>。`,
    details_label: '活动详情',
    time_label: '时间',
    location_label: '地点',
    button: '查看我的活动',
    footer: 'Entrohub — 连接有缘人',
  },
  en: {
    subject: (eventName: string) => `Signup Confirmed — ${eventName}`,
    heading: 'Signup Confirmed!',
    greeting: (name: string) => `Hi ${name},`,
    body: (eventName: string) =>
      `You have successfully signed up for <strong>${eventName}</strong>.`,
    details_label: 'Event Details',
    time_label: 'Time',
    location_label: 'Location',
    button: 'View My Events',
    footer: 'Entrohub — Connect with people who matter',
  },
};

function formatDateTime(startTime: string, endTime: string, locale: 'zh' | 'en'): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const time = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (locale === 'zh') {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()} 周${weekdays[start.getDay()]} ${time(start)} – ${time(end)}`;
  }

  const dateStr = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${dateStr} ${time(start)} – ${time(end)}`;
}

function buildEmailHtml(
  locale: 'zh' | 'en',
  recipientName: string,
  eventName: string,
  dateTime: string,
  location: string
) {
  const t = emailContent[locale];
  return `
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff;">
      <div style="padding: 24px 24px 16px; text-align: center;">
        <img src="https://app.entrohub.io/images/entrohub-full-logo.png" alt="Entrohub" width="160" style="width: 160px; height: auto;" />
      </div>
      <div style="padding: 0 24px 24px;">
        <h2 style="color: #5272F7; margin: 0 0 16px;">${t.heading}</h2>
        <p style="color: #333; line-height: 1.6;">${t.greeting(recipientName)}</p>
        <p style="color: #333; line-height: 1.6;">${t.body(eventName)}</p>
        <div style="background: #f7f7f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #666; font-size: 13px; margin: 0 0 4px; font-weight: 600;">${t.details_label}</p>
          <p style="color: #333; margin: 4px 0;"><strong>${t.time_label}:</strong> ${dateTime}</p>
          <p style="color: #333; margin: 4px 0;"><strong>${t.location_label}:</strong> ${location}</p>
        </div>
        <div style="margin: 24px 0; text-align: center;">
          <a href="https://app.entrohub.io/user/my-events"
             style="display: inline-block; padding: 12px 32px; background: #5272F7; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            ${t.button}
          </a>
        </div>
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid #eee; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">${t.footer}</p>
      </div>
    </div>
  `;
}

/**
 * Send signup confirmation email to a user.
 * Uses service_role client — only call from server-side (API routes, webhooks).
 */
export async function sendSignupConfirmationEmail(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerClient();

    const [{ data: event }, { data: profile }, { data: emails }] = await Promise.all([
      supabase
        .from('evt_events')
        .select('name, start_time, end_time, venue:evt_venues(name)')
        .eq('event_id', eventId)
        .single(),
      supabase
        .from('usr_profiles')
        .select('nickname, preferred_locale')
        .eq('user_id', userId)
        .single(),
      supabase.rpc('get_user_emails', { user_ids: [userId] }),
    ]);

    if (!event || !profile) {
      return { success: false, error: 'Event or profile not found' };
    }

    const email = emails?.[0]?.email;
    if (!email) {
      return { success: false, error: 'User email not found' };
    }

    const locale: 'zh' | 'en' = profile.preferred_locale === 'en' ? 'en' : 'zh';
    const recipientName = profile.nickname || 'Entrohub User';
    const venue = event.venue as unknown as { name: string } | null;
    const venueName = venue?.name;
    const location = venueName || (locale === 'zh' ? '待定' : 'TBD');
    const dateTime = formatDateTime(event.start_time, event.end_time, locale);
    const t = emailContent[locale];

    const resend = await getResend();
    const result = await resend.emails.send({
      from: 'Entrohub <noreply@updates.entrohub.io>',
      to: email,
      subject: t.subject(event.name),
      html: buildEmailHtml(locale, recipientName, event.name, dateTime, location),
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to send signup confirmation email:', message);
    return { success: false, error: message };
  }
}
