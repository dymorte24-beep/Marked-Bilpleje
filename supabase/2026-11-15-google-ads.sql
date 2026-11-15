-- Google Ads-tal til Statistik-fanen. Fyldes af den daglige planlagte opgave (Windsor.ai -> Supabase).
create table if not exists public.google_ads_dag (
  dato date primary key,
  klik int, visninger int, forbrug numeric, konverteringer numeric,
  opdateret timestamptz not null default now()
);
alter table public.google_ads_dag enable row level security;
create policy "Admin kan laese google_ads_dag" on public.google_ads_dag for select to authenticated using (is_admin());

-- Hvad folk søgte på, da annoncen blev vist (de sidste 30 dage). Appen viser kun rækker fra seneste opdatering.
create table if not exists public.google_ads_soegeord (
  soegeord text primary key,
  klik int, visninger int, forbrug numeric,
  opdateret timestamptz not null default now()
);
alter table public.google_ads_soegeord enable row level security;
create policy "Admin kan laese google_ads_soegeord" on public.google_ads_soegeord for select to authenticated using (is_admin());

-- Hvor kom den besøgende fra? (google-annonce, google, tiktok, instagram, facebook, anden side, direkte)
alter table public.butik_klik add column if not exists kilde text;
alter table public.profil_visninger add column if not exists kilde text;
