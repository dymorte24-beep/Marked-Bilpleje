-- Stamkunde-appen (findbilplejere.dk/app/), første version. 17. nov 2026
-- Bilplejeren logger ind med samme konto som butik-panelet (shops.owner_id).
-- Admin (is_admin()) kan se og rette alt.

-- ---------- Tabeller ----------
create table if not exists public.sk_indstillinger (
  shop_id      uuid primary key references public.shops(id) on delete cascade,
  aktiv        boolean not null default false,          -- slår al SMS-afsendelse til/fra
  google_link  text,                                     -- direkte link til "skriv anmeldelse"
  afsender     text check (afsender ~ '^[A-Za-z0-9 ]{1,11}$'),  -- vises som afsender på SMS (max 11 tegn)
  tak_tid      text not null default 'naeste_dag_10' check (tak_tid in ('naeste_dag_10','samme_aften_1830')),
  testtilstand boolean not null default true,            -- alle SMS går til testnummer i stedet for kunden
  testnummer   text,
  opdateret_at timestamptz not null default now()
);

create table if not exists public.sk_kunder (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops(id) on delete cascade,
  navn         text not null,
  telefon      text not null,                            -- 8 cifre, uden +45
  ja_tak       boolean not null default false,           -- må få påmindelser/tilbud (markedsføring)
  ja_tak_at    timestamptz,                               -- dokumentation for samtykke
  stop         boolean not null default false,           -- ingen SMS overhovedet
  stop_at      timestamptz,
  afmeld_token uuid not null default gen_random_uuid(),
  oprettet_at  timestamptz not null default now(),
  unique (shop_id, telefon)
);

create table if not exists public.sk_job (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  kunde_id    uuid not null references public.sk_kunder(id) on delete cascade,
  behandling  text not null,
  udfoert_at  timestamptz not null default now(),
  kilde       text not null default 'app',
  oprettet_at timestamptz not null default now()
);

create table if not exists public.sk_paamindelser (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops(id) on delete cascade,
  behandling text not null,                               -- fx "coating" (matcher hvis jobbet indeholder ordet)
  maaneder   int  not null check (maaneder between 1 and 36),
  aktiv      boolean not null default true,
  oprettet_at timestamptz not null default now()
);

create table if not exists public.sk_beskeder (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops(id) on delete cascade,
  kunde_id     uuid references public.sk_kunder(id) on delete cascade,
  job_id       uuid references public.sk_job(id) on delete cascade,
  type         text not null check (type in ('tak','paamindelse','test')),
  tekst        text,                                      -- udfyldes ved afsendelse
  planlagt_til timestamptz not null,
  status       text not null default 'planlagt'
               check (status in ('planlagt','sender','sendt','test_sendt','simuleret','fejl','annulleret','sprunget_over')),
  sendt_til    text,
  sendt_at     timestamptz,
  fejl         text,
  gateway_ref  text,
  oprettet_at  timestamptz not null default now()
);

create index if not exists sk_beskeder_due on public.sk_beskeder (planlagt_til) where status = 'planlagt';
create index if not exists sk_beskeder_shop on public.sk_beskeder (shop_id, planlagt_til);
create index if not exists sk_beskeder_kunde on public.sk_beskeder (kunde_id);
create index if not exists sk_beskeder_job on public.sk_beskeder (job_id);
create index if not exists sk_job_shop on public.sk_job (shop_id, udfoert_at);
create index if not exists sk_job_kunde on public.sk_job (kunde_id);
create index if not exists sk_kunder_shop on public.sk_kunder (shop_id);
create index if not exists sk_paamindelser_shop on public.sk_paamindelser (shop_id);

-- ---------- Adgang (RLS) ----------
create or replace function public.sk_ejer(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.shops where id = p_shop and owner_id = auth.uid());
$$;

do $$
declare t text;
begin
  foreach t in array array['sk_indstillinger','sk_kunder','sk_job','sk_paamindelser','sk_beskeder'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "ejer_alt" on public.%I', t);
    execute format('create policy "ejer_alt" on public.%I for all to authenticated using (public.sk_ejer(shop_id)) with check (public.sk_ejer(shop_id))', t);
  end loop;
end $$;

-- Kunden ændres altid som tidsstempel på samtykke/stop
create or replace function public.sk_kunde_stempel() returns trigger
language plpgsql set search_path = public as $$
begin
  new.telefon := right(regexp_replace(new.telefon, '\D', '', 'g'), 8);
  if new.telefon !~ '^[2-9][0-9]{7}$' then
    raise exception 'Telefonnummeret skal være et dansk mobilnummer med 8 cifre';
  end if;
  if tg_op = 'INSERT' then
    new.ja_tak_at := case when new.ja_tak then now() end;
    new.stop_at := case when new.stop then now() end;
  else
    if new.ja_tak is distinct from old.ja_tak then new.ja_tak_at := case when new.ja_tak then now() end; end if;
    if new.stop is distinct from old.stop then new.stop_at := case when new.stop then now() end; end if;
  end if;
  return new;
end $$;
drop trigger if exists sk_kunde_stempel on public.sk_kunder;
create trigger sk_kunde_stempel before insert or update on public.sk_kunder
  for each row execute function public.sk_kunde_stempel();

-- ---------- Planlægning ----------
-- Tidspunkt for tak-SMS: næste dag kl. 10 (aldrig søndag) eller samme aften kl. 18:30
create or replace function public.sk_tak_tidspunkt(p_udfoert timestamptz, p_valg text) returns timestamptz
language plpgsql stable set search_path = public as $$
declare
  lokal timestamp := p_udfoert at time zone 'Europe/Copenhagen';
  t timestamp;
begin
  if p_valg = 'samme_aften_1830' and lokal::time < time '18:00' then
    t := lokal::date + time '18:30';
  else
    t := (lokal::date + 1) + time '10:00';
  end if;
  if extract(dow from t) = 0 then          -- søndag -> mandag kl. 10
    t := (t::date + 1) + time '10:00';
  end if;
  return t at time zone 'Europe/Copenhagen';
end $$;

-- Når et job gemmes: planlæg tak-SMS + evt. påmindelser
create or replace function public.sk_planlaeg_job() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ind public.sk_indstillinger;
  p   public.sk_paamindelser;
  t   timestamp;
begin
  select * into ind from public.sk_indstillinger where shop_id = new.shop_id;

  -- Højst én tak-SMS pr. kunde pr. 30 dage (Google kan lide det mådeholdent)
  if not exists (
    select 1 from public.sk_beskeder
    where kunde_id = new.kunde_id and type = 'tak'
      and status not in ('annulleret','sprunget_over')
      and planlagt_til > now() - interval '30 days'
  ) then
    insert into public.sk_beskeder (shop_id, kunde_id, job_id, type, planlagt_til)
    values (new.shop_id, new.kunde_id, new.id, 'tak',
            public.sk_tak_tidspunkt(new.udfoert_at, coalesce(ind.tak_tid, 'naeste_dag_10')));
  end if;

  -- Påmindelser for behandlinger der matcher (kun relevant hvis kunden har sagt ja tak; tjekkes igen ved afsendelse)
  for p in select * from public.sk_paamindelser
           where shop_id = new.shop_id and aktiv
             and lower(new.behandling) like '%' || lower(behandling) || '%' loop
    t := ((new.udfoert_at at time zone 'Europe/Copenhagen')::date + make_interval(months => p.maaneder)) + time '10:00';
    if extract(dow from t) = 0 then t := t + interval '1 day'; end if;
    insert into public.sk_beskeder (shop_id, kunde_id, job_id, type, planlagt_til)
    values (new.shop_id, new.kunde_id, new.id, 'paamindelse', t at time zone 'Europe/Copenhagen');
  end loop;
  return new;
end $$;
drop trigger if exists sk_planlaeg_job on public.sk_job;
create trigger sk_planlaeg_job after insert on public.sk_job
  for each row execute function public.sk_planlaeg_job();

-- Ny påmindelse eller "Stop" annullerer/rydder op i ventende beskeder
create or replace function public.sk_kunde_stop() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stop and not old.stop then
    update public.sk_beskeder set status = 'annulleret', fejl = 'Kunden er stoppet'
    where kunde_id = new.id and status = 'planlagt';
  end if;
  return new;
end $$;
drop trigger if exists sk_kunde_stop on public.sk_kunder;
create trigger sk_kunde_stop after update on public.sk_kunder
  for each row execute function public.sk_kunde_stop();

-- ---------- Afmelding uden login (link i påmindelses-SMS) ----------
create or replace function public.sk_afmeld(p_token uuid) returns text
language plpgsql security definer set search_path = public as $$
declare k public.sk_kunder; s text;
begin
  select * into k from public.sk_kunder where afmeld_token = p_token;
  if not found then return null; end if;
  update public.sk_kunder set ja_tak = false where id = k.id;
  update public.sk_beskeder set status = 'annulleret', fejl = 'Kunden afmeldte'
    where kunde_id = k.id and status = 'planlagt' and type = 'paamindelse';
  select name into s from public.shops where id = k.shop_id;
  return s;
end $$;
revoke all on function public.sk_afmeld(uuid) from public;
grant execute on function public.sk_afmeld(uuid) to anon, authenticated;
revoke all on function public.sk_planlaeg_job() from public, anon, authenticated;
revoke all on function public.sk_kunde_stop() from public, anon, authenticated;

-- Bruges kun af edge-funktionen stamkunde-send (service role): tager forfaldne beskeder og låser dem
create or replace function public.sk_tag_forfaldne(p_max int default 50)
returns setof public.sk_beskeder
language sql security definer set search_path = public as $$
  update public.sk_beskeder b set status = 'sender'
  where b.id in (
    select id from public.sk_beskeder
    where status = 'planlagt' and planlagt_til <= now()
    order by planlagt_til
    limit p_max
    for update skip locked
  )
  returning b.*;
$$;
revoke all on function public.sk_tag_forfaldne(int) from public, anon, authenticated;
grant execute on function public.sk_tag_forfaldne(int) to service_role;
