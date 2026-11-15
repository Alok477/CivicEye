import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

export function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new HttpError(500, "Server is not configured (Supabase keys missing).");
  return createClient(url, key, { auth: { persistSession: false } });
}

export type Caller = {
  admin: SupabaseClient;
  userId: string;
  email: string | null;
  name: string | null;
  role: "citizen" | "admin";
};

/** Verifies the bearer JWT and loads the caller's profile. Never trust ids from the body. */
export async function requireUser(req: Request): Promise<Caller> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "Missing Authorization header.");

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Invalid or expired session. Please sign in again.");

  const { data: profile } = await admin
    .from("users")
    .select("name,email,role")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    admin,
    userId: data.user.id,
    email: profile?.email ?? data.user.email ?? null,
    name: profile?.name ?? null,
    role: profile?.role === "admin" ? "admin" : "citizen",
  };
}

export function requireAdmin(caller: Caller) {
  if (caller.role !== "admin") throw new HttpError(403, "Admin access required.");
}
