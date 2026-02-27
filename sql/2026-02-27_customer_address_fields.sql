-- Add customer address fields used in booking form and contracts.
alter table if exists public.customers
  add column if not exists address_line_1 text;

alter table if exists public.customers
  add column if not exists address_line_2 text;

alter table if exists public.customers
  add column if not exists postal_code text;

alter table if exists public.customers
  add column if not exists region text;
