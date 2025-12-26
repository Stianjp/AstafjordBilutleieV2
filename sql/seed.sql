insert into locations (name, delivery_fee, pickup_fee)
values
  ('Lavangen', 0, 0),
  ('Salangen', 0, 0),
  ('Gratangen', 0, 0),
  ('Dyrøy', 0, 0),
  ('Ibestad', 0, 0),
  ('Setermoen', 0, 0),
  ('Evenes Airport', 0, 0),
  ('Narvik', 0, 0),
  ('Bjerkvik', 0, 0),
  ('Bardufoss Airport', 0, 0)
on conflict (name) do nothing;

insert into cars (reg_number, model, image_url, seats, transmission, fuel, daily_price, monthly_price_cap, current_location_id, current_km, active)
select
  reg_number,
  model,
  image_url,
  seats,
  transmission,
  fuel,
  daily_price,
  monthly_price_cap,
  (select id from locations where name = 'Lavangen'),
  current_km,
  true
from (values
  ('FK13455', 'Volvo V50', '/V50.png', 5, 'Manual', 'Diesel', 700, 11000, 120000),
  ('YZ99894', 'Volvo S40', '/S40.png', 5, 'Manual', 'Diesel', 800, 12000, 98000),
  ('YU44954', 'Volvo V70', '/V70.png', 5, 'Automatic', 'Diesel', 1000, 13000, 140000),
  ('ZH32390', 'Renault Grand Scenic', '/Scenic.png', 7, 'Manual', 'Diesel', 800, 11000, 110000),
  ('AY21371', 'Opel Mokka', '/Mokka.png', 5, 'Manual', 'Petrol', 800, 12000, 76000)
) as seed(reg_number, model, image_url, seats, transmission, fuel, daily_price, monthly_price_cap, current_km)
on conflict (reg_number) do nothing;
