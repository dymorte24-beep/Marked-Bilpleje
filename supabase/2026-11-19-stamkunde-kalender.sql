-- Stamkunde-appen: kobl bilplejerens kalender på (iCal/ICS-link). 19. nov 2026
-- Edge-funktionen stamkunde-send henter kalenderen ca. hvert 10. minut, gemmer aftalerne i sk_aftaler
-- og opretter selv et job (= tak-SMS planlægges) når en aftale med mobilnummer er slut.

alter table public.sk_indstillinger
  add column if not exists kalender_url       text,          -- hemmeligt iCal-link (https/webcal)
  add column if not exists kalender_type      text,          -- google | icloud | outlook | andet
  add column if not exists kalender_koblet_at timestamptz,   -- kun aftaler der slutter efter dette tidspunkt bliver til job
  add column if not exists kalender_sidst     timestamptz,   -- sidst hentet
  add column if not exists kalender_fejl      text,          -- sidste fejl ved hentning
  add column if not exists kalender_spring    boolean not null default false;  -- valgte "spring over" i opstarten

create table if not exists public.sk_aftaler (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops(id) on delete cascade,
  uid          text not null,                 -- UID fra kalenderen (+ starttid)
  start_at     timestamptz not null,
  slut_at      timestamptz not null,
  titel        text,
  navn         text,
  telefon      text,                          -- 8 cifre hvis fundet
  behandling   text,
  status       text not null default 'venter'
               check (status in ('venter','job','mangler_nummer','sprunget_over','aflyst')),
  rettet       boolean not null default false, -- bilplejeren har rettet navn/nummer/behandling i appen
  job_id       uuid references public.sk_job(id) on delete set null,
  opdateret_at timestamptz not null default now(),
  unique (shop_id, uid)
);
create index if not exists sk_aftaler_shop_start on public.sk_aftaler (shop_id, start_at);
create index if not exists sk_aftaler_venter on public.sk_aftaler (slut_at) where status = 'venter';

alter table public.sk_aftaler enable row level security;
create policy "ejer_alt" on public.sk_aftaler for all to authenticated
  using (public.sk_ejer(shop_id)) with check (public.sk_ejer(shop_id));

alter table public.sk_job add column if not exists aftale_id uuid references public.sk_aftaler(id) on delete set null;
