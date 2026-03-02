-- Migration: Felles km-system + forsikringsvarsling
-- Kjør denne direkte i Supabase SQL Editor.

alter table if exists public.cars
  add column if not exists insurance_annual_km_limit integer;

alter table if exists public.cars
  add column if not exists insurance_tracking_year integer;

alter table if exists public.cars
  add column if not exists insurance_year_start_km numeric;

alter table if exists public.cars
  add column if not exists insurance_alert_sent_year integer;

alter table if exists public.cars
  drop constraint if exists cars_insurance_annual_km_limit_check;

alter table if exists public.cars
  add constraint cars_insurance_annual_km_limit_check
  check (insurance_annual_km_limit is null or insurance_annual_km_limit > 0);

alter table if exists public.mileage_logs
  add column if not exists source text not null default 'manual';

alter table if exists public.mileage_logs
  add column if not exists override_reason text;

alter table if exists public.mileage_logs
  add column if not exists created_at timestamp with time zone not null default now();

alter table if exists public.mileage_logs
  add column if not exists updated_at timestamp with time zone not null default now();

update public.mileage_logs
set source = 'legacy'
where source is null
   or source not in ('manual', 'booking', 'car_adjustment', 'legacy');

alter table if exists public.mileage_logs
  drop constraint if exists mileage_logs_source_check;

alter table if exists public.mileage_logs
  add constraint mileage_logs_source_check
  check (source in ('manual', 'booking', 'car_adjustment', 'legacy'));

with ranked as (
  select
    id,
    row_number() over (partition by booking_id order by updated_at desc, id desc) as rn
  from public.mileage_logs
  where booking_id is not null
)
delete from public.mileage_logs m
using ranked r
where m.id = r.id
  and r.rn > 1;

create unique index if not exists mileage_logs_booking_uidx
  on public.mileage_logs (booking_id)
  where booking_id is not null;
