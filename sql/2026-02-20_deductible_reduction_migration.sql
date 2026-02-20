-- Migration: Egenandelsreduksjon i booking
-- Kjor denne direkte i Supabase SQL Editor.

alter table public.bookings
  add column if not exists deductible_reduction_selected boolean not null default false;

alter table public.bookings
  add column if not exists deductible_reduction_fee numeric not null default 0;

insert into public.add_ons (key, name, fee, active)
values ('deductible_reduction', 'Egenandelsreduksjon ved skade', 200, true)
on conflict (key) do update
set
  name = excluded.name,
  fee = excluded.fee,
  active = excluded.active;
