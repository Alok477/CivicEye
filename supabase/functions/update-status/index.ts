import { z } from "npm:zod@3";
import { errorResponse, HttpError, json, preflight, readJson } from "../_shared/http.ts";
import { requireAdmin, requireUser } from "../_shared/auth.ts";
import { CATEGORIES, DEPARTMENTS, SEVERITIES, STATUSES } from "../_shared/constants.ts";
import { fireN8n } from "../_shared/n8n.ts";

const Body = z.object({
  complaintId: z.string().uuid(),
  newStatus: z.enum(STATUSES).optional(),
  remarks: z.string().trim().max(1000).optional(),
  department: z.enum(DEPARTMENTS).optional(),
  severity: z.enum(SEVERITIES).optional(),
  category: z.enum(CATEGORIES).optional(),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed.");
    const caller = await requireUser(req);
    requireAdmin(caller); // server-side role check

    const parsed = Body.safeParse(await readJson(req, 100_000));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new HttpError(422, `Invalid ${issue.path.join(".") || "input"}: ${issue.message}`);
    }
    const b = parsed.data;
    if (!b.newStatus && !b.department && !b.severity && !b.category) {
      throw new HttpError(400, "Provide at least one of: newStatus, department, severity, category.");
    }

    const { data: before, error: readErr } = await caller.admin
      .from("complaints").select("status").eq("id", b.complaintId).maybeSingle();
    if (readErr) throw new HttpError(500, "Could not read the complaint.");
    if (!before) throw new HttpError(404, "Complaint not found.");

    // The RPC updates the row; the DB trigger writes the history row and citizen notification.
    const { data: updated, error } = await caller.admin.rpc("admin_update_complaint", {
      p_complaint_id: b.complaintId,
      p_actor: caller.userId,
      p_new_status: b.newStatus ?? null,
      p_remarks: b.remarks ?? null,
      p_department: b.department ?? null,
      p_severity: b.severity ?? null,
      p_category: b.category ?? null,
    });

    if (error || !updated) {
      if (error?.message?.includes("complaint_not_found")) throw new HttpError(404, "Complaint not found.");
      if (error?.message?.includes("not_admin")) throw new HttpError(403, "Admin access required.");
      console.error("admin_update_complaint failed:", error?.message);
      throw new HttpError(500, "Could not update the complaint.");
    }

    // n8n only when the status actually changed
    if (updated.status !== before.status) {
      const { data: citizen } = await caller.admin
        .from("users").select("id,name,email").eq("id", updated.user_id).maybeSingle();
      await fireN8n({
        event: "complaint.status_changed",
        complaint: updated,
        citizen,
        previous_status: before.status,
        new_status: updated.status,
        remarks: b.remarks ?? null,
      });
    }

    return json(updated);
  } catch (e) {
    return errorResponse(e);
  }
});
