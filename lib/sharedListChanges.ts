// lib/sharedListChanges.ts
//
// Zmiany pozycji wspólnej listy zbierane do jednego powiadomienia: różnica między dwoma stanami listy,
// scalanie kolejnych zmian (dodanie i usunięcie tej samej pozycji znosi się) i ładunek dla funkcji notify-shared.

/** Zgodne z limitem etykiet w funkcji notify-shared. */
export const MAX_NOTIFY_LABELS = 100;

export interface TextItem {
  text: string;
}

/** Zmiana netto: tekst pozycji → liczba dodanych (dodatnia) albo usuniętych (ujemna) wystąpień. */
export type ChangeBuffer = Map<string, number>;

const clean = (text: string): string => text.trim();

/** Różnica między stanami listy; odhaczenie pozycji nie jest dodaniem ani usunięciem (liczy się tekst). */
export function diffElements(prev: readonly TextItem[], next: readonly TextItem[]): ChangeBuffer {
  const delta: ChangeBuffer = new Map();
  const bump = (text: string, by: number) => {
    const key = clean(text);
    if (!key) return;
    const value = (delta.get(key) ?? 0) + by;
    if (value === 0) delta.delete(key);
    else delta.set(key, value);
  };
  for (const item of next) bump(item.text, 1);
  for (const item of prev) bump(item.text, -1);
  return delta;
}

/** Dodaje zmianę do bufora (sumując per pozycja); pozycje, które się zniosły, znikają. */
export function mergeChange(buffer: ChangeBuffer, change: ChangeBuffer): void {
  for (const [text, by] of change) {
    const value = (buffer.get(text) ?? 0) + by;
    if (value === 0) buffer.delete(text);
    else buffer.set(text, value);
  }
}

export interface ChangePayload {
  added: string[];
  removed: string[];
}

/** Ładunek dla serwera: etykiety dodanych i usuniętych pozycji (z powtórzeniami), do limitu na stronę. */
export function toPayload(buffer: ChangeBuffer): ChangePayload {
  const added: string[] = [];
  const removed: string[] = [];
  for (const [text, by] of buffer) {
    const target = by > 0 ? added : removed;
    for (let i = 0; i < Math.abs(by); i++) target.push(text);
  }
  return { added: added.slice(0, MAX_NOTIFY_LABELS), removed: removed.slice(0, MAX_NOTIFY_LABELS) };
}
