-- Add support for monthly fixed-price discount codes with minimum booking days.
alter table if exists public.discount_codes
  add column if not exists minimum_days integer not null default 0;

alter table if exists public.discount_codes
  drop constraint if exists discount_codes_type_check;

alter table if exists public.discount_codes
  add constraint discount_codes_type_check check (type in ('percent', 'amount', 'monthly_fixed'));

update public.discount_codes
set minimum_days = 0
where minimum_days is null;
