-- Profilniveauer (basis/komplet). KØRT i Supabase 9. nov 2026 (via Claude).

-- 1) Nyt felt til butikkens hjemmeside
alter table shops add column if not exists website text;

-- 2) Alle nuværende butikker fik en gratis komplet profil som prøveperiode,
--    så deres billeder og beskrivelser ikke forsvandt, da basisprofilen kom.
--    Kan ændres pr. butik med "Gør til basis" i admin-panelet.
update shops set tier = 'betalt' where tier = 'gratis';

-- NB: Butikker kan IKKE selv ændre tier/verificeret/godkendt/anmeldelsestal m.m.
-- Det sikrer den eksisterende trigger `protect_admin_fields` (funktion
-- `protect_admin_only_shop_fields`), som kun lader dymorte24@gmail.com ændre de felter.
