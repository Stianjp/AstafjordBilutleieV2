import { supabaseService } from "../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  let customersQuery = supabaseService
    .from("customers")
    .select("*")
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (q) {
    const escaped = q.replace(/,/g, " ");
    customersQuery = customersQuery.or([
      `first_name.ilike.%${escaped}%`,
      `last_name.ilike.%${escaped}%`,
      `email.ilike.%${escaped}%`,
      `phone.ilike.%${escaped}%`
    ].join(","));
  }

  const { data: customers, error: customersError } = await customersQuery;
  if (customersError) {
    return Response.json({ error: customersError.message }, { status: 500 });
  }

  const ids = (customers || []).map((customer) => customer.id);
  let bookingStats = {};

  if (ids.length > 0) {
    const { data: bookings, error: bookingsError } = await supabaseService
      .from("bookings")
      .select("customer_id, start_date")
      .in("customer_id", ids);

    if (bookingsError) {
      return Response.json({ error: bookingsError.message }, { status: 500 });
    }

    bookingStats = (bookings || []).reduce((acc, booking) => {
      const current = acc[booking.customer_id] || { bookings_count: 0, last_booking_date: null };
      current.bookings_count += 1;
      if (!current.last_booking_date || String(booking.start_date) > String(current.last_booking_date)) {
        current.last_booking_date = booking.start_date;
      }
      acc[booking.customer_id] = current;
      return acc;
    }, {});
  }

  const payload = (customers || []).map((customer) => ({
    ...customer,
    bookings_count: bookingStats[customer.id]?.bookings_count || 0,
    last_booking_date: bookingStats[customer.id]?.last_booking_date || null
  }));

  return Response.json(
    { customers: payload },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
