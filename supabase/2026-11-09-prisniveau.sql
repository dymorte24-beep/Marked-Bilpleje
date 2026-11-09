-- Prisniveau i stedet for priser: 1 = Budget, 2 = Mellem, 3 = Premium (null = ikke sat).
-- Vi viser bevidst ingen konkrete priser på sitet. Kun admin kan ændre prisniveau.
alter table public.shops add column if not exists price_level smallint
  check (price_level between 1 and 3);

create or replace function public.protect_admin_only_shop_fields()
 returns trigger
 language plpgsql
 security definer
as $function$ begin if auth.jwt() is not null and coalesce(auth.jwt() ->> 'email', '') != 'dymorte24@gmail.com' then new.name := old.name; new.city := old.city; new.city_key := old.city_key; new.profile_url := old.profile_url; new.verificeret := old.verificeret; new.godkendt := old.godkendt; new.tier := old.tier; new.owner_id := old.owner_id; new.review_rating := old.review_rating; new.review_count := old.review_count; new.review_source := old.review_source; new.review_url := old.review_url; new.review_visible := old.review_visible; new.ad_active := old.ad_active; new.ad_cities := old.ad_cities; new.price_level := old.price_level; end if; return new; end; $function$;
