create extension if not exists "uuid-ossp";

create table if not exists locations (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  delivery_fee numeric not null default 0,
  pickup_fee numeric not null default 0
);

create table if not exists third_parties (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company_name text,
  email text not null,
  phone text not null,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

create table if not exists cars (
  id uuid primary key default uuid_generate_v4(),
  reg_number text not null unique,
  model text not null,
  image_url text,
  seats integer not null,
  transmission text not null,
  fuel text not null,
  daily_price numeric not null,
  monthly_price_cap numeric not null,
  current_location_id uuid references locations(id),
  has_navigation boolean not null default true,
  owned_by_third_party boolean not null default false,
  third_party_id uuid references third_parties(id),
  current_km numeric not null default 0,
  active boolean not null default true
);

alter table if exists cars
  add column if not exists has_navigation boolean not null default true;

alter table if exists cars
  add column if not exists owned_by_third_party boolean not null default false;

alter table if exists cars
  add column if not exists third_party_id uuid references third_parties(id);

create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('private', 'company')),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  address_line_1 text,
  address_line_2 text,
  postal_code text,
  region text,
  org_number text,
  invoice_method text,
  invoice_email text
);

alter table if exists customers
  add column if not exists address_line_1 text;

alter table if exists customers
  add column if not exists address_line_2 text;

alter table if exists customers
  add column if not exists postal_code text;

alter table if exists customers
  add column if not exists region text;

create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  car_id uuid not null references cars(id),
  customer_id uuid not null references customers(id),
  pickup_location_id uuid not null references locations(id),
  delivery_location_id uuid not null references locations(id),
  start_date date not null,
  start_time time,
  end_date date not null,
  end_time time,
  days integer not null,
  included_km integer not null,
  start_km numeric,
  end_km numeric,
  delivery_fee numeric not null,
  pickup_fee numeric not null,
  discount_code_id uuid references discount_codes(id),
  discount_code text,
  discount_amount numeric not null default 0,
  customer_comment text,
  child_seat_required boolean not null default false,
  child_seat_fee numeric not null default 0,
  deductible_reduction_selected boolean not null default false,
  deductible_reduction_fee numeric not null default 0,
  admin_note_1 text,
  admin_note_2 text,
  calculated_price numeric not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  terms_accepted boolean not null default false
);

alter table if exists bookings
  add column if not exists deductible_reduction_selected boolean not null default false;

alter table if exists bookings
  add column if not exists deductible_reduction_fee numeric not null default 0;

create table if not exists discount_codes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  type text not null check (type in ('percent', 'amount', 'monthly_fixed')),
  value numeric not null,
  minimum_days integer not null default 0,
  active boolean not null default true,
  starts_at date,
  ends_at date,
  usage_limit integer,
  used_count integer not null default 0,
  created_at timestamp with time zone default now()
);

alter table if exists discount_codes
  add column if not exists minimum_days integer not null default 0;

alter table if exists discount_codes
  drop constraint if exists discount_codes_type_check;

alter table if exists discount_codes
  add constraint discount_codes_type_check check (type in ('percent', 'amount', 'monthly_fixed'));

create table if not exists add_ons (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  name text not null,
  fee numeric not null default 0,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

create table if not exists mileage_logs (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id),
  car_id uuid not null references cars(id),
  km_start numeric,
  km_end numeric,
  driven_km numeric,
  extra_km numeric,
  extra_cost numeric,
  reason text
);

create table if not exists admins (
  id uuid primary key default uuid_generate_v4(),
  username text not null unique,
  password_hash text not null,
  email text not null unique
);

create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_dates_idx on bookings (start_date, end_date);
