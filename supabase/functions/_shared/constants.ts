export const STATUSES = [
  "SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS",
  "RESOLVED", "REJECTED", "DUPLICATE",
] as const;

export const SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;

export const CATEGORIES = [
  "Road Damage", "Garbage & Sanitation", "Street Lighting",
  "Water Supply & Leakage", "Drainage & Sewage", "Public Safety",
  "Public Infrastructure", "Other",
] as const;

export const DEPARTMENTS = [
  "Road Maintenance", "Sanitation", "Electrical & Lighting", "Water Works",
  "Drainage & Sewerage", "Public Safety", "General Administration",
] as const;

// Priority score bands (configurable here)
export const BANDS: Record<(typeof SEVERITIES)[number], [number, number]> = {
  Critical: [80, 100],
  High: [60, 79],
  Medium: [30, 59],
  Low: [0, 29],
};

export function clampToBand(severity: keyof typeof BANDS, score: number): number {
  const [lo, hi] = BANDS[severity];
  return Math.min(hi, Math.max(lo, Math.round(score)));
}

export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const AUDIO_MIMES = [
  "audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg",
];
export const MAX_BASE64_CHARS = 8_000_000; // about 6 MB of raw bytes
