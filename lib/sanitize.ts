// lib/sanitize.ts

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function sanitizeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z][a-z\d+\-.]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("`", "&#96;");
}

export function sanitizeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replaceAll("<", String.raw`\u003C`)
    .replaceAll(">", String.raw`\u003E`)
    .replaceAll("&", String.raw`\u0026`)
    .replaceAll("\u2028", String.raw`\u2028`)
    .replaceAll("\u2029", String.raw`\u2029`);
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUuid(id: unknown): string | null {
  if (typeof id !== "string") return null;
  return UUID_REGEX.test(id) ? id : null;
}