-- 2026-11-16: markering af bilplejere der KUN tager erhvervskunder (fx MN Auto Care).
-- Vises som badge "Kun erhverv" på søgekort, byside og profil + en kort forklaring på profilen.
alter table public.shops add column if not exists kun_erhverv boolean not null default false;
comment on column public.shops.kun_erhverv is 'Butikken tager kun erhvervskunder (vises som badge "Kun erhverv" på søgekort og profil).';
