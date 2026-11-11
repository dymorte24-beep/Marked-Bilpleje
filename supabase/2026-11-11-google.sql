-- Google Search Console-tal til Statistik-fanen. Fyldes af en daglig planlagt opgave (Windsor.ai -> Supabase).
create table if not exists public.google_dag (
  dato date primary key,
  klik int, visninger int, position numeric,
  opdateret timestamptz not null default now()
);
alter table public.google_dag enable row level security;
create policy "Admin kan laese google_dag" on public.google_dag for select to authenticated using (is_admin());

-- Øjebliksbillede af søgeordene de sidste 30 dage (erstattes ved hver opdatering).
create table if not exists public.google_soegeord (
  soegeord text primary key,
  klik int, visninger int, position numeric,
  opdateret timestamptz not null default now()
);
alter table public.google_soegeord enable row level security;
create policy "Admin kan laese google_soegeord" on public.google_soegeord for select to authenticated using (is_admin());
