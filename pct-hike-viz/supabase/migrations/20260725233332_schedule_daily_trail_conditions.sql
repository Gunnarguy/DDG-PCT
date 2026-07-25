create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- The project URL and legacy anon JWT are provisioned separately in Vault.
-- The JWT only gets the scheduled request through Edge gateway verification;
-- the function accepts it solely with `scheduled: true` and rate-limits writes.
select cron.schedule(
  'refresh-ddg-trail-conditions-daily',
  '15 12 * * *',
  $cron$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'project_url'
      ) || '/functions/v1/trail-conditions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'trail_conditions_anon_key'
        ),
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'trail_conditions_anon_key'
        )
      ),
      body := jsonb_build_object('scheduled', true, 'requestedAt', now()),
      timeout_milliseconds := 30000
    ) as request_id;
  $cron$
);
