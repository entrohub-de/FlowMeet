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

    // 查询活动
    const { data: event, error: eventError } = await supabase
      .from('evt_events')
      .select('event_id, name, price_cents, currency')
      .eq('event_id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!event.price_cents || event.price_cents <= 0) {
      return NextResponse.json({ error: 'Event is free' }, { status: 400 });
    }

    // 创建 pending signup
    await supabase
      .from('evt_signups')
      .upsert({
        event_id: eventId,
        user_id: userId,
        status: 'pending',
        payment_status: 'pending',
      }, { onConflict: 'event_id,user_id' });

    // 创建 Stripe Checkout Session
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: event.currency || 'eur',
          product_data: { name: event.name },
          unit_amount: event.price_cents,
        },
        quantity: 1,
      }],
      metadata: { event_id: eventId, user_id: userId },
      success_url: `${origin}/user/event?payment=success&event=${eventId}`,
      cancel_url: `${origin}/user/event?payment=cancelled&event=${eventId}`,
    });

    // 记录 session ID
    await supabase
      .from('evt_signups')
      .update({ stripe_checkout_session_id: session.id })
      .eq('event_id', eventId)
      .eq('user_id', userId);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
