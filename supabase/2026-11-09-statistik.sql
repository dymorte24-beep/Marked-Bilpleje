-- Statistik-app (/admin/statistik/). Allerede kørt på databasen 2026-11-09.
alter table public.butik_klik add column if not exists metode text; -- phone/email/website/instagram/facebook

create table if not exists public.soegninger (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  by text, ydelse text, antal_resultater int
);
alter table public.soegninger enable row level security;
create policy "Alle kan logge en soegning" on public.soegninger for insert to anon, authenticated with check (true);
create policy "Admin kan laese soegninger" on public.soegninger for select to authenticated using (is_admin());
create policy "Admin kan slette soegninger" on public.soegninger for delete to authenticated using (is_admin());

-- Udfyldes af den daglige planlagte opgave, der henter TikTok-tal fra Metricool (brand 7988347).
create table if not exists public.tiktok_dag (
  dato date primary key,
  visninger int, foelgere int, likes int, profilvisninger int, videoer int,
  opdateret timestamptz not null default now()
);
alter table public.tiktok_dag enable row level security;
create policy "Admin kan laese tiktok_dag" on public.tiktok_dag for select to authenticated using (is_admin());

create table if not exists public.tiktok_videoer (
  url text primary key, beskrivelse text, udgivet timestamptz,
  visninger int, likes int, kommentarer int, delinger int,
  opdateret timestamptz not null default now()
);
alter table public.tiktok_videoer enable row level security;
create policy "Admin kan laese tiktok_videoer" on public.tiktok_videoer for select to authenticated using (is_admin());
