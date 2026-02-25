import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { eventId, userId } = await request.json();

    if (!eventId || !userId) {
      return NextResponse.json({ error: 'Missing eventId or userId' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 查找该用户的 pending signup
    const { data: signup } = await supabase
      .from('evt_signups')
      .select('stripe_checkout_session_id, payment_status, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (!signup) {
      return NextResponse.json({ error: 'Signup not found' }, { status: 404 });
    }

    // 已经是 active+paid，无需再验证
    if (signup.status === 'active' && signup.payment_status === 'paid') {
      return NextResponse.json({ verified: true });
    }

    // 没有 session ID 无法验证
    if (!signup.stripe_checkout_session_id) {
      return NextResponse.json({ error: 'No checkout session' }, { status: 400 });
    }

    // 去 Stripe 查询 session 状态
    const session = await getStripe().checkout.sessions.retrieve(signup.stripe_checkout_session_id);

    if (session.payment_status === 'paid') {
      // 支付已完成，立即激活 signup
      await supabase
        .from('evt_signups')
        .update({
          status: 'active',
          payment_status: 'paid',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ verified: false, payment_status: session.payment_status });
  } catch (err) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
