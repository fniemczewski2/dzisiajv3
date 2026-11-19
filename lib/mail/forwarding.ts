// lib/mail/forwarding.ts
//
// Wariant A (bez dostępu do skrzynki): każde konto dostaje unikalny adres, na który
// użytkownik ustawia przekierowanie. Token jest losowy; w bazie przechowujemy wyłącznie jego skrót.

import { MAX_FORWARDING_ADDRESSES } from "@/config/limits";

/** Rodzaj adresu: poczta do bufora (p-…) albo bilety kolejowe (b-…, lib/server/ticketInbound.ts). */
export type ForwardingKind = "mail" | "tickets";

const LOCAL_PREFIX: Readonly<Record<ForwardingKind, string>> = { mail: "p-", tickets: "b-" };

export function isForwardingKind(value: unknown): value is ForwardingKind {
  return value === "mail" || value === "tickets";
}

export function createForwardingToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function forwardingAddress(token: string, domain: string, kind: ForwardingKind = "mail"): string {
  return `${LOCAL_PREFIX[kind]}${token}@${domain}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** Rodzaj i token adresu odbiorcy (p-… lub b-…); null – adres spoza domeny lub w złym formacie. */
export function parseForwardingRecipient(
  recipient: string,
  domain: string
): { kind: ForwardingKind; token: string } | null {
  const re = new RegExp(`^([pb])-([a-f0-9]{32})@${escapeRegExp(domain)}$`, "i");
  const match = re.exec(recipient.trim());
  if (!match) return null;
  return { kind: match[1].toLowerCase() === "b" ? "tickets" : "mail", token: match[2].toLowerCase() };
}

/** Skrót tokenu do zapisu w bazie (SHA-256, hex). */
export async function hashForwardingToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function planForwardingCreate(activeCount: number): { ok: true } | { ok: false; reason: "limit" } {
  return activeCount >= MAX_FORWARDING_ADDRESSES ? { ok: false, reason: "limit" } : { ok: true };
}
