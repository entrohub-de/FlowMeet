import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createServerClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServerClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const eventId = session.metadata?.event_id;
    const userId = session.metadata?.user_id;

    if (eventId && userId) {
      await supabase
        .from('evt_signups')
        .update({
          status: 'active',
          payment_status: 'paid',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('payment_status', 'pending');
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const eventId = session.metadata?.event_id;
    const userId = session.metadata?.user_id;

    if (eventId && userId) {
      await supabase
        .from('evt_signups')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('payment_status', 'pending');
    }
  }

  return NextResponse.json({ received: true });
}
