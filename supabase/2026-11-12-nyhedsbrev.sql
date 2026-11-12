-- Nyhedsbrev til bilejere (lovlig opt-in, markedsføringslovens § 10 + GDPR art. 7).
-- Kørt på databasen 2026-11-12.
-- Gemmer bevis for samtykke: præcis den tekst personen sagde ja til, version, tidspunkt og hvor på siden.
create table if not exists public.nyhedsbrev (
  id bigint generated always as identity primary key,
  email text not null,
  postnummer text,
  interesser text[] not null default '{}', -- 'saesontips' og/eller 'tilbud'
  samtykke_tekst text not null,
  samtykke_version text not null,
  kilde text,
  tilmeldt_at timestamptz not null default now(),
  afmeldt_at timestamptz,
  afmeld_token uuid not null default gen_random_uuid(),
  sendt_til_brevo_at timestamptz,
  constraint nyhedsbrev_email_ok check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254)
);
create unique index if not exists nyhedsbrev_email_unik on public.nyhedsbrev (lower(email));
create unique index if not exists nyhedsbrev_token_unik on public.nyhedsbrev (afmeld_token);

alter table public.nyhedsbrev enable row level security;
-- Ingen kan læse/skrive tabellen direkte fra hjemmesiden. Kun admin kan læse og slette.
create policy "Admin kan laese nyhedsbrev" on public.nyhedsbrev for select to authenticated using (is_admin());
create policy "Admin kan slette nyhedsbrev" on public.nyhedsbrev for delete to authenticated using (is_admin());

-- Tilmelding sker via denne funktion, så ingen kan læse andres mails eller ændre samtykke-beviset.
-- To slags mails, hver med sit eget flueben: 'saesontips' og 'tilbud' (når en bilplejer i området kører tilbud).
-- Gen-tilmelding efter afmelding: nyt samtykke gemmes og afmeldingen ophæves.
create or replace function public.tilmeld_nyhedsbrev(p_email text, p_postnummer text, p_interesser text[], p_samtykke_tekst text, p_samtykke_version text, p_kilde text)
returns void language plpgsql security definer set search_path = public as $$
declare v_int text[];
begin
  select coalesce(array_agg(distinct i), '{}') into v_int from unnest(p_interesser) i where i in ('saesontips','tilbud');
  if cardinality(v_int) = 0 then raise exception 'Vaelg mindst en type mail'; end if;
  if p_samtykke_tekst is null or length(p_samtykke_tekst) < 20 then raise exception 'Samtykke mangler'; end if;
  insert into public.nyhedsbrev (email, postnummer, interesser, samtykke_tekst, samtykke_version, kilde)
  values (lower(trim(p_email)), left(nullif(trim(p_postnummer), ''), 10), v_int, left(p_samtykke_tekst, 1000), left(p_samtykke_version, 40), left(p_kilde, 80))
  on conflict ((lower(email))) do update
    set interesser = excluded.interesser,
        samtykke_tekst = excluded.samtykke_tekst,
        samtykke_version = excluded.samtykke_version,
        kilde = excluded.kilde,
        postnummer = coalesce(excluded.postnummer, nyhedsbrev.postnummer),
        tilmeldt_at = now(),
        afmeldt_at = null,
        sendt_til_brevo_at = null;
end $$;

-- Afmelding med ét klik via link med personligt token.
create or replace function public.afmeld_nyhedsbrev(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.nyhedsbrev set afmeldt_at = coalesce(afmeldt_at, now()) where afmeld_token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.tilmeld_nyhedsbrev(text, text, text[], text, text, text) from public;
revoke all on function public.afmeld_nyhedsbrev(uuid) from public;
grant execute on function public.tilmeld_nyhedsbrev(text, text, text[], text, text, text) to anon, authenticated;
grant execute on function public.afmeld_nyhedsbrev(uuid) to anon, authenticated;
