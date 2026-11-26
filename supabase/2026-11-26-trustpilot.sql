-- Stamkunde-appen: bilplejeren vælger, om tak-SMS'en beder om en anmeldelse på Google eller Trustpilot.
-- Linket i SMS'en er stadig findbilplejere.dk/g/<kode>; funktionen "anmeld" sender videre til det valgte sted.
alter table public.sk_indstillinger
  add column if not exists anmeld_sted text not null default 'google' check (anmeld_sted in ('google','trustpilot')),
  add column if not exists trustpilot_link text;   -- fx https://dk.trustpilot.com/evaluate/ditdomæne.dk
