// lib/daySchemas.ts
//
// Kilka schematów może obejmować ten sam dzień tygodnia (np. „Zwykły
// czwartek” i „Czwartek z warsztatem”). Na dany dzień obowiązuje:
// 1) schemat wybrany ręcznie na planie dnia (albo „bez schematu”),
// 2) w przeciwnym razie schemat oznaczony jako domyślny dla tego dnia,
// 3) w przeciwnym razie pierwszy schemat obejmujący ten dzień.

import type { Schema } from "@/types/schemas";

/** undefined = brak ręcznego wyboru; null = „bez schematu”; string = id schematu. */
export type SchemaChoice = string | null | undefined;

export function schemasForWeekday(schemas: readonly Schema[], weekday: number): Schema[] {
  return schemas.filter((s) => s.days?.includes(weekday));
}

export function defaultSchemaFor(schemas: readonly Schema[], weekday: number): Schema | null {
  const candidates = schemasForWeekday(schemas, weekday);
  return candidates.find((s) => s.is_default) ?? candidates[0] ?? null;
}

export function resolveActiveSchema(schemas: readonly Schema[], weekday: number, choice: SchemaChoice): Schema | null {
  if (choice === null) return null;
  if (typeof choice === "string") {
    const chosen = schemas.find((s) => s.id === choice);
    if (chosen) return chosen; // usunięty schemat – wracamy do domyślnego
  }
  return defaultSchemaFor(schemas, weekday);
}
