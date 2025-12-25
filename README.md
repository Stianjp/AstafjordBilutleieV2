# Astafjord Bilutleie

Full-stack bilutleie-app med Next.js, Supabase og Tailwind. Booking er request-only og godkjennes manuelt av admin.

## Oppsett

1. Opprett et Supabase-prosjekt.
2. Kjor SQL i `sql/schema.sql`, deretter `sql/seed.sql` og `sql/rls.sql` i Supabase SQL Editor.
3. Sett environment variables basert pa `.env.example`.
4. Installer deps og start:

```bash
npm install
npm run dev
```

## Admin

- Admin logger inn via Supabase Auth.
- Sett admin e-poster i `ADMIN_EMAILS` (komma-separert).

## E-post

Systemet bruker Resend hvis `RESEND_API_KEY` og `BOOKING_ADMIN_EMAIL` er satt.

## API

- `GET /api/cars`
- `GET /api/locations`
- `POST /api/bookings`
- `GET /api/admin/bookings?status=pending`
- `PATCH /api/admin/bookings/:id`
- `GET/POST /api/admin/cars`
- `PUT/DELETE /api/admin/cars/:id`
- `GET/PUT /api/admin/locations`
- `POST /api/admin/mileage`
