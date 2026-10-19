// lib/sanitize.ts

import { MAX_TITLE_LENGTH, MAX_PLACE_LENGTH } from "@/config/limits";
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function sanitizeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z][a-z\d+\-.]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function sanitizeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replaceAll("<", String.raw`\u003C`)
    .replaceAll(">", String.raw`\u003E`)
    .replaceAll("&", String.raw`\u0026`)
    .replaceAll("\u2028", String.raw`\u2028`)
    .replaceAll("\u2029", String.raw`\u2029`);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const MAX_EMAIL_LENGTH = 254;

export function validateEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(trimmed)) return null;
  return trimmed;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateSlot(value: unknown): { date: string; start_time: string } | null {
  if (typeof value !== "object" || value === null) return null;
  const { date, start_time } = value as Record<string, unknown>;
  if (typeof date !== "string" || !ISO_DATE_RE.test(date)) return null;
  if (typeof start_time !== "string" || !HHMM_RE.test(start_time)) return null;
  return { date, start_time };
}

export interface FinalizeSlotValidated {
  date: string;
  start_time: string;
  end_time: string;
  title?: string;
  place?: string;
}

/**
 * Validates a meeting-poll finalize slot coming straight from the request
 * body before it's interpolated into an `events` insert (date/time were
 * previously trusted as-is, allowing malformed timestamps or oversized
 * title/place values to reach the database).
 */
export function validateFinalizeSlot(value: unknown): FinalizeSlotValidated | null {
  if (typeof value !== "object" || value === null) return null;
  const { date, start_time, end_time, title, place } = value as Record<string, unknown>;

  if (typeof date !== "string" || !ISO_DATE_RE.test(date)) return null;
  if (typeof start_time !== "string" || !HHMM_RE.test(start_time)) return null;
  if (typeof end_time !== "string" || !HHMM_RE.test(end_time)) return null;
  if (end_time <= start_time) return null;

  if (title !== undefined && (typeof title !== "string" || title.length > MAX_TITLE_LENGTH)) return null;
  if (place !== undefined && (typeof place !== "string" || place.length > MAX_PLACE_LENGTH)) return null;

  return {
    date,
    start_time,
    end_time,
    title: typeof title === "string" ? title.trim() : undefined,
    place: typeof place === "string" ? place.trim() : undefined,
  };
}
