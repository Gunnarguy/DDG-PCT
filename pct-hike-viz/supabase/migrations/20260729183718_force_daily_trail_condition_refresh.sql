-- A scheduled refresh must fetch upstream sources even when someone performed
-- an interactive refresh less than 20 hours earlier. Otherwise a successful
-- morning cron run can legitimately return yesterday's cached snapshot.
do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
    from cron.job
   where jobname = 'refresh-ddg-trail-conditions-daily';

  if existing_job_id is null then
    raise exception 'refresh-ddg-trail-conditions-daily cron job does not exist';
  end if;

  perform cron.alter_job(
    job_id := existing_job_id,
    schedule := '15 12 * * *',
    command := $cron$
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
        body := jsonb_build_object(
          'scheduled', true,
          'force', true,
          'requestedAt', now()
        ),
        timeout_milliseconds := 30000
      ) as request_id;
    $cron$,
    active := true
  );
end
$$;
