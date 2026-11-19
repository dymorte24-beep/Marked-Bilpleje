-- Stamkunde-appen: kør SMS-afsenderen hvert 5. minut.
-- Køres EFTER edge-funktionen stamkunde-send er deployet (verify_jwt = false; funktionen tjekker selv koden).
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Fælles hemmelig kode mellem pg_cron og funktionen. Laves i databasen og forlader den aldrig.
select vault.create_secret(encode(extensions.gen_random_bytes(24),'hex'), 'stamkunde_cron_secret',
  'Delt kode mellem pg_cron og edge-funktionen stamkunde-send')
where not exists (select 1 from vault.secrets where name = 'stamkunde_cron_secret');

create or replace function public.sk_cron_secret() returns text
language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'stamkunde_cron_secret';
$$;
revoke execute on function public.sk_cron_secret() from public, anon, authenticated;
grant execute on function public.sk_cron_secret() to service_role;

select cron.schedule('stamkunde-send', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://xeosltdpvkcaudiijtge.supabase.co/functions/v1/stamkunde-send',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.sk_cron_secret()),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$);
