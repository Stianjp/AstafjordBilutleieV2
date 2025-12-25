alter table locations enable row level security;
alter table cars enable row level security;
alter table bookings enable row level security;
alter table customers enable row level security;
alter table mileage_logs enable row level security;
alter table admins enable row level security;

create policy "Public can read active cars" on cars
  for select using (active = true);

create policy "Public can read locations" on locations
  for select using (true);

create policy "Service role only" on bookings
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Service role only customers" on customers
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Service role only mileage logs" on mileage_logs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Service role only admins" on admins
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
