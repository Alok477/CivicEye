import { z } from "npm:zod@3";
import { errorResponse, HttpError, json, preflight, readJson } from "../_shared/http.ts";
import { requireUser } from "../_shared/auth.ts";
import { CATEGORIES, DEPARTMENTS, SEVERITIES } from "../_shared/constants.ts";
import { findDuplicates, storeRelations } from "../_shared/duplicates.ts";
import { fireN8n } from "../_shared/n8n.ts";

const optText = (max: number) =>
  z.string().max(max).nullish().transform((v) => (v && v.trim() ? v.trim() : null));

const Body = z.object({
  title: z.string().trim().min(3).max(150),
  description: optText(3000),
  ai_description: optText(1500),
  category: z.enum(CATEGORIES),
  subcategory: optText(80),
  severity: z.enum(SEVERITIES),
  priority_score: z.number().int().min(0).max(100),
  ai_confidence: z.number().min(0).max(1).nullish().transform((v) => v ?? null),
  safety_risk: z.boolean().optional().default(false),
  department: z.enum(DEPARTMENTS).nullish().transform((v) => v ?? null),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: optText(300),
  image_url: optText(1000),
  audio_url: optText(500),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed.");
    const caller = await requireUser(req);

    const raw = await readJson(req, 1_000_000);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new HttpError(422, `Invalid ${issue.path.join(".") || "input"}: ${issue.message}`);
    }
    const b = parsed.data;

    // Media references must be sane and belong to the caller
    if (b.image_url && !/^https?:\/\//i.test(b.image_url)) {
      throw new HttpError(422, "Invalid image_url.");
    }
    if (b.audio_url && !b.audio_url.startsWith(`${caller.userId}/`)) {
      throw new HttpError(422, "audio_url must be a storage path inside your own folder.");
    }

    // user_id always comes from the verified JWT, never from the body
    const { data: complaint, error } = await caller.admin
      .from("complaints")
      .insert({ ...b, user_id: caller.userId, status: "SUBMITTED", is_demo: false })
      .select("*")
      .single();

    if (error || !complaint) {
      console.error("Insert failed:", error?.message);
      throw new HttpError(500, "Could not save the complaint. Please try again.");
    }

    // Duplicate detection: never blocks the submission
    try {
      const matches = await findDuplicates(caller.admin, complaint.id);
      await storeRelations(caller.admin, complaint.id, matches);
    } catch (e) {
      console.error("Duplicate detection failed:", e instanceof Error ? e.message : e);
    }

    // n8n: failure is logged, never fails the submission
    await fireN8n({
      event: "complaint.submitted",
      complaint,
      citizen: { id: caller.userId, email: caller.email, name: caller.name },
    });

    return json({ id: complaint.id, complaint_number: complaint.complaint_number });
  } catch (e) {
    return errorResponse(e);
  }
});
