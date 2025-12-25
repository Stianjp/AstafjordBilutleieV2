import { supabaseAnon } from "./serverSupabase";

export async function getUserFromRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return { user: null, token: null, error: "Missing token" };
  }

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, token, error: error?.message || "Invalid token" };
  }

  return { user: data.user, token, error: null };
}

export function isAdminEmail(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return list.map((value) => value.toLowerCase()).includes(normalized);
}
