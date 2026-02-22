-- Migration: Tredjeparter + navigasjonsfelt pa biler
-- Kjor denne direkte i Supabase SQL Editor.

create table if not exists public.third_parties (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company_name text,
  email text not null,
  phone text not null,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

alter table public.cars
  add column if not exists has_navigation boolean not null default true;

alter table public.cars
  add column if not exists owned_by_third_party boolean not null default false;

alter table public.cars
  add column if not exists third_party_id uuid references public.third_parties(id);

update public.cars
set has_navigation = true
where has_navigation is distinct from true;

alter table public.third_parties enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'third_parties'
      and policyname = 'Service role only third parties'
  ) then
    create policy "Service role only third parties" on public.third_parties
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end $$;
