import { NextRequest, NextResponse } from 'next/server';
import { sendSignupConfirmationEmail } from '@/lib/email/signup-confirmation';

export async function POST(request: NextRequest) {
  try {
    const { eventId, userId } = await request.json();

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'eventId and userId are required' },
        { status: 400 }
      );
    }

    const result = await sendSignupConfirmationEmail(eventId, userId);

    if (!result.success) {
      console.error('Signup confirmation email failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('Signup confirmation email error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
