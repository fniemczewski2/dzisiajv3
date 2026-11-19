// supabase/functions/_shared/contacts.ts
//
// Progi przypomnień o kontakcie według priorytetu osoby – jedno źródło dla aplikacji (usePeople, briefing)
// i funkcji process-notifications. Priorytet 0 i 5: bez przypomnień.

export const CONTACT_THRESHOLD_DAYS: Readonly<Record<number, number>> = { 1: 14, 2: 30, 3: 60, 4: 365 };

const DAY_MS = 86_400_000;

/** Pełne dni od ostatniego kontaktu; null – brak daty. */
export function daysSinceContact(lastContact: string | null | undefined, now: Date): number | null {
  if (!lastContact) return null;
  const t = new Date(lastContact).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor(Math.abs(now.getTime() - t) / DAY_MS);
}

/** Czy minął próg dla priorytetu. Brak daty kontaktu = zaległy (tylko dla priorytetów 1–4). */
export function isContactOverdue(priority: number, lastContact: string | null | undefined, now: Date): boolean {
  const threshold = CONTACT_THRESHOLD_DAYS[priority];
  if (threshold === undefined) return false;
  const days = daysSinceContact(lastContact, now);
  return days === null || days >= threshold;
}
