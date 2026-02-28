-- Contract template settings editable from admin.
create table if not exists public.contract_settings (
  id uuid primary key default uuid_generate_v4(),
  language text not null,
  intro text not null,
  responsibility text not null,
  obligations_title text not null,
  obligations_lines text not null,
  deductible_reduction_title text not null,
  deductible_reduction_exceptions_intro text not null,
  deductible_reduction_exception_lines text not null,
  cancellation_policy_title text not null,
  cancellation_policy_text text not null,
  terms_title text not null,
  terms_lines text not null,
  updated_at timestamp with time zone not null default now(),
  updated_by text
);

alter table if exists public.contract_settings
  add column if not exists language text;

alter table if exists public.contract_settings
  add column if not exists intro text;

alter table if exists public.contract_settings
  add column if not exists responsibility text;

alter table if exists public.contract_settings
  add column if not exists obligations_title text;

alter table if exists public.contract_settings
  add column if not exists obligations_lines text;

alter table if exists public.contract_settings
  add column if not exists deductible_reduction_title text;

alter table if exists public.contract_settings
  add column if not exists deductible_reduction_exceptions_intro text;

alter table if exists public.contract_settings
  add column if not exists deductible_reduction_exception_lines text;

alter table if exists public.contract_settings
  add column if not exists cancellation_policy_title text;

alter table if exists public.contract_settings
  add column if not exists cancellation_policy_text text;

alter table if exists public.contract_settings
  add column if not exists terms_title text;

alter table if exists public.contract_settings
  add column if not exists terms_lines text;

alter table if exists public.contract_settings
  add column if not exists updated_at timestamp with time zone not null default now();

alter table if exists public.contract_settings
  add column if not exists updated_by text;

alter table if exists public.contract_settings
  drop constraint if exists contract_settings_language_check;

alter table if exists public.contract_settings
  add constraint contract_settings_language_check check (language in ('no', 'en'));

create unique index if not exists contract_settings_language_uidx
  on public.contract_settings (language);

insert into public.contract_settings (
  language,
  intro,
  responsibility,
  obligations_title,
  obligations_lines,
  deductible_reduction_title,
  deductible_reduction_exceptions_intro,
  deductible_reduction_exception_lines,
  cancellation_policy_title,
  cancellation_policy_text,
  terms_title,
  terms_lines
)
values
(
  'no',
  'Kontrakten er inngatt mellom Astafjord bilutleie (tlf +47 45658315) og bestiller:',
  'I leieperioden og til bilen er returnert, har leietaker fullt ansvar for bilen og bruken av den.',
  'Leietaker plikter a betale folgende:',
  $$Leiens pris som avtalt. Det vil komme tillegg pa kr 2,50/km nar korelengden overstiger avtalt fri korelengde (200 km/dogn).
Leien faktureres forskuddsvis og skal vare betalt for henting. Dersom kontrakt skrives samme dag, ma betaling skje med kort for henting.
Drivstoff ma etterfylles (tanken skal vare full ved henting og levering). Mangelfullt drivstoff etterfaktureres med 27 kr/liter.
Alle kostnader for bompenger, parkeringsgebyr og fartsboter (etterfaktureres).
Enhver skade pa kjoretoyet i leieperioden, inkludert harverk og tyveri, opptil en egenandel pa: 12 000 NOK.
Leietaker ma inspisere bilen ved henting og notere eventuelle skader. Bor ta bilder av bilen ved mottak.
Leietaker er ansvarlig for vedlikehold (olje, kjolevaske, dekktrykk). Kontakt utleier ved tvil.$$,
  'Egenandelsreduksjon',
  'Unntak fra egenandelsreduksjon: Dersom skaden har oppstatt som folge av leietakers uaktsomhet eller brudd pa leievilkarene, gjelder full egenandel (12 000 kr) eller fullt tap dersom dette overstiger egenandelen.',
  $$Grov uaktsomhet: Kjoring i strid med veitrafikkloven (f.eks. hoy fart), eller kjoring i pavirket tilstand (alkohol/rusmidler).
Feilfylling: Fylling av feil drivstoff pa tanken, samt folgeskader av dette.
Interior og utstyr: Skader pa bilens interior (f.eks. sigarettglo, flekker, revnet setetrekk) eller tap av utstyr/nokler.
Feilbruk: Skader oppstatt ved kjoring utenfor offentlig vei (offroad), overlasting av bilen, eller skader pa understell som folge av uaktsom kjoring over fortauskanter/fartshumper.
Manglende skademelding: Dersom leietaker unnlater a fylle ut skademelding eller unnlater a oppgi motpart/vitner ved ulykke.$$,
  'Avbestilling',
  'Vi vet at planer kan endres. Avbestilling er gratis frem til samme dag som booking starter, sa lenge avbestilling meldes til astafjord.bilutleie@gmail.com for start av leieforholdet. Dersom avbestilling ikke meldes for start, belastes leieforholdet i sin helhet. Avbestilling etter leiestart faktureres for minimum 1 dag leie + leverings- og hentegebyr, eller minimum 1 000 kr.',
  'Bruksvilkar',
  $$Leietaker ma ikke: Kjore uten nodvendige tillatelser.
Ta bilen ut av landet uten skriftlig tillatelse.
Transportere passasjerer mot betaling.
Fylle feil drivstoff.
Kjore utenfor offentlig vei.$$
),
(
  'en',
  'The contract is made between Astafjord Bilutleie (tel +47 45658315) and the renter:',
  'During the rental period and until the car is returned, the renter is fully responsible for the car and its use.',
  'The renter agrees to pay:',
  $$The agreed rental price. Extra distance is billed at NOK 2.50/km beyond the included 200 km/day.
The rental is invoiced in advance and must be paid before pickup. Same-day contracts must be paid by card before pickup.
Fuel must be refilled (full tank at pickup and return). Missing fuel is billed at 27 NOK/liter.
All tolls, parking fees and speeding tickets (billed after).
Any damage during the rental period, including vandalism and theft, up to a deductible of NOK 12,000.
The renter must inspect the car at pickup and note any damages. Photos are recommended.
The renter is responsible for basic maintenance (oil, coolant, tire pressure). Contact the lessor if unsure.$$,
  'Deductible reduction',
  'Exceptions: If damage is caused by renter negligence or breach of rental terms, full deductible (NOK 12,000) applies, or full loss if this exceeds the deductible.',
  $$Gross negligence: Driving against road traffic law (for example high speed), or driving under the influence (alcohol/drugs).
Wrong fuel: Filling the wrong fuel and any consequential damage.
Interior and equipment: Damage to interior (for example burns, stains, torn seats) or loss of equipment/keys.
Misuse: Damage from off-road driving, overloading, or undercarriage damage from negligent driving over curbs/speed bumps.
Missing incident report: If the renter does not submit an incident report or fails to provide counterpart/witness details after an accident.$$,
  'Cancellation',
  'We know plans can change. Cancellation is free up to the same day the booking starts, as long as cancellation is sent to astafjord.bilutleie@gmail.com before rental start. If cancellation is not reported before start, the full rental is charged. Cancellation after rental start is invoiced for minimum 1 rental day + delivery and pickup fee, or minimum NOK 1,000.',
  'Usage terms',
  $$The renter must not: drive without required permits.
Take the car out of the country without written permission.
Transport passengers for payment.
Fill the wrong fuel.
Drive off public roads.$$
)
on conflict (language) do nothing;
