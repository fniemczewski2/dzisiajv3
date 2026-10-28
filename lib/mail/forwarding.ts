// lib/mail/forwarding.ts
//
// Wariant A (bez dostępu do skrzynki): każde konto dostaje unikalny adres, na który
// użytkownik ustawia przekierowanie. Token jest losowy; w bazie przechowujemy wyłącznie jego skrót.

const FORWARDING_LOCAL_PREFIX = "p-";

export function createForwardingToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function forwardingAddress(token: string, domain: string): string {
  return `${FORWARDING_LOCAL_PREFIX}${token}@${domain}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Z adresu odbiorcy wyciąga token, jeśli adres należy do tej domeny i ma poprawny format. */
export function tokenFromRecipient(recipient: string, domain: string): string | null {
  const re = new RegExp(`^${FORWARDING_LOCAL_PREFIX}([a-f0-9]{32})@${escapeRegExp(domain)}$`, "i");
  const match = re.exec(recipient.trim());
  return match ? match[1].toLowerCase() : null;
}

/** Skrót tokenu do zapisu w bazie (SHA-256, hex). */
export async function hashForwardingToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Najwyżej tyle aktywnych adresów przekierowania na użytkownika. */
export const MAX_FORWARDING_ADDRESSES = 5;

/** Czas, po którym przekierowana wiadomość znika z bufora (wariant A). */
export const INBOX_RETENTION_HOURS = 72;

export function planForwardingCreate(activeCount: number): { ok: true } | { ok: false; reason: "limit" } {
  return activeCount >= MAX_FORWARDING_ADDRESSES ? { ok: false, reason: "limit" } : { ok: true };
}
