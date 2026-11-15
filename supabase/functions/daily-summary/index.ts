import { errorResponse, HttpError, json, preflight } from "../_shared/http.ts";
import { requireAdmin, requireUser } from "../_shared/auth.ts";
import { getClient, mapGeminiError, resolveModel } from "../_shared/gemini.ts";

type Row = {
  category: string | null; severity: string | null; status: string | null;
  address: string | null; safety_risk: boolean | null; created_at: string; is_demo: boolean | null;
};

const CLOSED = ["RESOLVED", "REJECTED", "DUPLICATE"];

function tally(rows: Row[], pick: (r: Row) => string | null) {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const k = pick(r) || "Unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function buildStats(rows: Row[], total: number) {
  const now = Date.now();
  const age = (r: Row) => now - new Date(r.created_at).getTime();
  const open = rows.filter((r) => !CLOSED.includes(r.status ?? ""));
  const area = (r: Row) => (r.address ?? "Unknown area").split(",")[0].trim() || "Unknown area";
  const topOpenAreas = Object.entries(tally(open, area))
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    total_complaints: total,
    rows_analysed: rows.length,
    new_last_24h: rows.filter((r) => age(r) <= 864e5).length,
    new_last_7d: rows.filter((r) => age(r) <= 6048e5).length,
    open_complaints: open.length,
    open_critical: open.filter((r) => r.severity === "Critical").length,
    open_with_safety_risk: open.filter((r) => r.safety_risk).length,
    by_status: tally(rows, (r) => r.status),
    by_severity: tally(rows, (r) => r.severity),
    by_category: tally(rows, (r) => r.category),
    top_open_areas: topOpenAreas,
    includes_demo_rows: rows.filter((r) => r.is_demo).length,
  };
}

const SYSTEM_INSTRUCTION =
  "You write a short operational briefing (3 to 5 plain sentences, no markdown, no bullet points) for a city administrator, " +
  "based ONLY on the JSON statistics provided. Use only the numbers given. Do not invent causes, trends, comparisons, " +
  "locations or recommendations that the data does not support. If a count is zero, say so. " +
  "If includes_demo_rows is greater than 0, mention that some records are demo data.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    if (req.method !== "POST" && req.method !== "GET") throw new HttpError(405, "Method not allowed.");
    const caller = await requireUser(req);
    requireAdmin(caller);

    // The admin dashboard calls this on every load. Reuse a recent stored summary so we do not burn Gemini quota.
    const forceRefresh = new URL(req.url).searchParams.has("refresh");
    if (!forceRefresh) {
      const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const { data: recent } = await caller.admin
        .from("daily_summaries")
        .select("summary,stats,generated_at")
        .gte("generated_at", since)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent?.summary) return json(recent);
    }

    const { data, count, error } = await caller.admin
      .from("complaints")
      .select("category,severity,status,address,safety_risk,created_at,is_demo", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new HttpError(500, "Could not read complaints.");

    const stats = buildStats((data ?? []) as Row[], count ?? (data?.length ?? 0));

    let summary: string | undefined;
    try {
      const ai = getClient();
      const model = await resolveModel(ai);
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: "Statistics (JSON): " + JSON.stringify(stats) }] }],
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.2 },
      });
      summary = res.text?.trim();
    } catch (e) {
      throw mapGeminiError(e);
    }
    if (!summary) throw new HttpError(502, "The AI returned an empty summary. Please try again.");

    const generated_at = new Date().toISOString();
    const { error: insErr } = await caller.admin
      .from("daily_summaries")
      .insert({ summary, stats, source: "edge-function", generated_at });
    if (insErr) console.error("Could not store daily summary:", insErr.message);

    return json({ summary, generated_at, stats });
  } catch (e) {
    return errorResponse(e);
  }
});
