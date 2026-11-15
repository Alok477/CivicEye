import { errorResponse, HttpError, json, preflight } from "../_shared/http.ts";
import { requireUser } from "../_shared/auth.ts";
import { DEFAULT_RADIUS_M, findDuplicates } from "../_shared/duplicates.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    if (req.method !== "GET") throw new HttpError(405, "Method not allowed.");
    const caller = await requireUser(req);

    const url = new URL(req.url);
    const complaintId = url.searchParams.get("complaintId") ?? "";
    if (!UUID.test(complaintId)) throw new HttpError(400, "complaintId must be a valid UUID.");

    const radius = Math.min(1000, Math.max(20, Number(url.searchParams.get("radius")) || DEFAULT_RADIUS_M));

    const { data: owner } = await caller.admin
      .from("complaints").select("user_id").eq("id", complaintId).maybeSingle();
    if (!owner) throw new HttpError(404, "Complaint not found.");
    const isAdmin = caller.role === "admin";
    if (!isAdmin && owner.user_id !== caller.userId) {
      throw new HttpError(403, "You can only check your own complaints.");
    }

    const matches = await findDuplicates(caller.admin, complaintId, radius);

    // Citizens get a redacted view and no AI note (the note can paraphrase other people's text).
    const result = matches.map((m) => {
      const c = m.complaint as Record<string, unknown>;
      const complaint = isAdmin
        ? c
        : {
          id: c.id, complaint_number: c.complaint_number, title: c.title, category: c.category,
          severity: c.severity, status: c.status, latitude: c.latitude, longitude: c.longitude,
          created_at: c.created_at,
        };
      return {
        complaint,
        similarity_score: m.similarity_score,
        distance_m: m.distance_m,
        ...(isAdmin && m.ai_note ? { ai_note: m.ai_note } : {}),
      };
    });

    return json(result);
  } catch (e) {
    return errorResponse(e);
  }
});
