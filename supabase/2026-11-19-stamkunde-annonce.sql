-- Stamkunde-appen: bilplejerens egne annoncer til "ja tak"-kunder. 19. nov 2026 (Daniel godkendte i tråden)
alter table public.sk_beskeder drop constraint if exists sk_beskeder_type_check;
alter table public.sk_beskeder add constraint sk_beskeder_type_check check (type in ('tak','paamindelse','annonce','test'));
