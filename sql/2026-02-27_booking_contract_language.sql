-- Store which language the contract should use in outgoing emails.
alter table if exists public.bookings
  add column if not exists contract_language text not null default 'no';

alter table if exists public.bookings
  drop constraint if exists bookings_contract_language_check;

alter table if exists public.bookings
  add constraint bookings_contract_language_check check (contract_language in ('no', 'en'));
