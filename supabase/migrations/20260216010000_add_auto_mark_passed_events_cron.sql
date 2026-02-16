-- Enable pg_cron extension (must be enabled in Supabase Dashboard first:
-- Database -> Extensions -> pg_cron -> Enable)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule a cron job to mark events as 'passed' when their end_time has elapsed.
-- Runs every 15 minutes.
SELECT cron.schedule(
  'mark-passed-events',
  '*/15 * * * *',
  $$
    UPDATE evt_events
    SET status = 'passed'
    WHERE status = 'active'
      AND end_time < now();
  $$
);
