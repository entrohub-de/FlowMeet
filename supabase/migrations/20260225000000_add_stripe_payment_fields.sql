-- evt_events: 添加价格字段
ALTER TABLE evt_events
  ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'eur';

-- evt_signups: 添加支付字段
ALTER TABLE evt_signups
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT DEFAULT NULL;

ALTER TABLE evt_signups
  ADD CONSTRAINT evt_signups_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'refunded') OR payment_status IS NULL);

CREATE INDEX IF NOT EXISTS idx_evt_signups_stripe_session
  ON evt_signups(stripe_checkout_session_id);

NOTIFY pgrst, 'reload schema';
