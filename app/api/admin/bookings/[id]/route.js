import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";
import { sendBookingDecisionEmail } from "../../../../../lib/email";

export async function PATCH(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  const status = payload.status;
  if (!status || !["approved", "rejected", "cancelled"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: booking, error } = await supabaseService
    .from("bookings")
    .update({ status })
    .eq("id", params.id)
    .select("*, customers(*), cars(*)")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await sendBookingDecisionEmail({
    customer: booking.customers,
    booking,
    status
  });

  return Response.json({ booking });
}
