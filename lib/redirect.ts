// lib/redirect.ts

/**
 * Bezpieczna ścieżka przekierowania po logowaniu: tylko ścieżka w obrębie
 * aplikacji (zaczyna się od jednego „/”), bez schematu, hosta i ukośników
 * wstecznych. Wszystko inne – strona główna.
 */
export function safeRedirectPath(raw: string | string[] | null | undefined, fallback = "/"): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return fallback;
  if (value === "/index") return "/";
  if (!/^\/(?!\/)[\w\-/?=&#.%~]*$/.test(value)) return fallback;
  return value;
}
