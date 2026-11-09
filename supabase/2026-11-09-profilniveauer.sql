-- Profilniveauer (basis/komplet) — kør i Supabase: SQL Editor → New query → indsæt → Run.
-- Skal køres FØR ændringerne på siden går live, ellers kan admin/butikspanel ikke gemme.

-- 1) Nyt felt til butikkens hjemmeside
alter table shops add column if not exists website text;

-- 2) Butikker må ikke selv kunne opgradere sig til komplet profil, sætte sig selv
--    som verificeret/godkendt eller ændre deres anmeldelsestal via butikspanelet.
--    Kun admin (is_admin()) kan ændre de felter. Alt andet kan butikken stadig selv rette.
create or replace function protect_admin_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    new.tier := old.tier;
    new.verificeret := old.verificeret;
    new.godkendt := old.godkendt;
    new.review_rating := old.review_rating;
    new.review_count := old.review_count;
    new.review_source := old.review_source;
    new.review_url := old.review_url;
    new.review_visible := old.review_visible;
    new.price_list_verified := old.price_list_verified;
  end if;
  return new;
end $$;

drop trigger if exists protect_admin_fields on shops;
create trigger protect_admin_fields before update on shops
  for each row execute function protect_admin_fields();

-- 3) (Anbefalet) Giv de nuværende butikker en gratis komplet profil som prøveperiode,
--    så deres billeder og beskrivelser ikke forsvinder, når ændringen går live.
--    Kan altid ændres pr. butik med "Gør til basis" i admin-panelet.
update shops set tier = 'betalt' where tier = 'gratis';
