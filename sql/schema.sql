create extension if not exists "uuid-ossp";

create table if not exists locations (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  delivery_fee numeric not null default 0,
  pickup_fee numeric not null default 0
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
  current_km numeric not null default 0,
  active boolean not null default true
);

create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('private', 'company')),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  org_number text,
  invoice_method text,
  invoice_email text
);

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
  calculated_price numeric not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  terms_accepted boolean not null default false
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
