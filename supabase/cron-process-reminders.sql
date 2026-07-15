-- Schedule frequent reminder processing on Supabase Cron (Hobby-friendly).
-- Vercel Hobby only allows 1 daily cron; use this for multi-times-per-day reminders.
--
-- Replace:
--   https://YOUR_APP.vercel.app  -> your Vercel URL
--   YOUR_CRON_SECRET             -> same value as CRON_SECRET in Vercel env
--
-- Run once in the Supabase SQL editor after enabling the pg_net + pg_cron extensions
-- (Dashboard → Database → Extensions, or Integrations → Cron).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
from cron.job
where jobname = 'discipline-process-reminders';

select
  cron.schedule(
    'discipline-process-reminders',
    '*/10 * * * *',
    $$
    select
      net.http_post(
        url := 'https://YOUR_APP.vercel.app/api/cron/process-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer YOUR_CRON_SECRET'
        ),
        body := '{}'::jsonb
      ) as request_id;
    $$
  );
