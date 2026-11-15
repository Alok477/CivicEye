import { GoogleGenAI } from "npm:@google/genai";
import { HttpError } from "./http.ts";

let cachedModel: string | null = null;

export function getClient(): GoogleGenAI {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new HttpError(500, "AI service is not configured (GEMINI_API_KEY missing).");
  return new GoogleGenAI({ apiKey });
}

export type ModelInfo = { name: string; supportedActions: string[] };

export async function listModels(ai: GoogleGenAI): Promise<ModelInfo[]> {
  const out: ModelInfo[] = [];
  const pager = await ai.models.list();
  for await (const m of pager) {
    out.push({
      name: (m.name ?? "").replace(/^models\//, ""),
      supportedActions: (m as { supportedActions?: string[] }).supportedActions ?? [],
    });
  }
  return out;
}

/** True if the model can generate content. If the SDK did not report actions at all, assume yes. */
export function canGenerate(m: ModelInfo): boolean {
  return m.supportedActions.length === 0 || m.supportedActions.includes("generateContent");
}

/** GEMINI_MODEL wins. Otherwise list models and pick the newest stable multimodal Flash. */
export async function resolveModel(ai: GoogleGenAI): Promise<string> {
  const env = Deno.env.get("GEMINI_MODEL");
  if (env) return env;
  if (cachedModel) return cachedModel;

  const models = await listModels(ai);
  const skip = /lite|image|tts|live|thinking|exp|audio|native|robotics|computer|embedding|learnlm|gemma/i;
  const candidates = models
    .filter(canGenerate)
    .filter((m) => /flash/i.test(m.name) && !skip.test(m.name));

  const score = (name: string) => {
    const v = name.match(/gemini-(\d+(?:\.\d+)?)/);
    const version = v ? parseFloat(v[1]) : 0;
    return version * 10 - (/preview/i.test(name) ? 5 : 0) - (/-\d{3}$/.test(name) ? 1 : 0);
  };
  candidates.sort((a, b) => score(b.name) - score(a.name));

  if (!candidates.length) {
    throw new HttpError(502, "No suitable Gemini model found for this API key. Set GEMINI_MODEL.");
  }
  cachedModel = candidates[0].name;
  console.log("Auto-selected Gemini model:", cachedModel);
  return cachedModel;
}

/** Map SDK errors to friendly HTTP errors. */
export function mapGeminiError(e: unknown): HttpError {
  if (e instanceof HttpError) return e;
  const err = e as { status?: number; message?: string };
  const status = err?.status;
  console.error("Gemini error:", status, err?.message);
  if (status === 429) return new HttpError(429, "The AI service is busy right now. Please retry in a few seconds.");
  if (status === 400) return new HttpError(422, "The AI could not process this input. Try a clearer photo or add a text description.");
  if (status === 401 || status === 403) return new HttpError(502, "AI service credentials were rejected. Contact the administrator.");
  if (status === 404) return new HttpError(502, "The configured AI model is unavailable. Contact the administrator.");
  return new HttpError(502, "The AI service is temporarily unavailable. Please try again.");
}
