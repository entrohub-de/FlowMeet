ALTER TABLE evt_events ADD COLUMN IF NOT EXISTS price_cents INTEGER;
ALTER TABLE evt_events ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'eur';

ALTER TABLE evt_signups ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE evt_signups ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE evt_signups ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

ALTER TABLE evt_signups DROP CONSTRAINT IF EXISTS evt_signups_payment_status_check;
ALTER TABLE evt_signups ADD CONSTRAINT evt_signups_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'refunded'));
