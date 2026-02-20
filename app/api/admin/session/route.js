import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";

export async function GET(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  return Response.json({ ok: true, email: user.email });
}
