/** Fire-and-log. A failure here must never fail the caller. */
export async function fireN8n(payload: unknown): Promise<boolean> {
  const url = Deno.env.get("N8N_WEBHOOK_URL");
  if (!url) {
    console.warn("N8N_WEBHOOK_URL not set; skipping webhook.");
    return false;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) console.error(`n8n webhook responded ${res.status}`);
    return res.ok;
  } catch (e) {
    console.error("n8n webhook failed:", e instanceof Error ? e.message : e);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
