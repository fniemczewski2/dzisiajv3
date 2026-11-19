// pages/api/obsidian/import-decisions.ts
//
// Duplikaty osób przy imporcie z vaultu Obsidiana. GET – pliki czekające na decyzję z kandydatami (osoby
// o tym samym imieniu i nazwisku). POST { fileId, action: "merge" | "create" | "skip", personId? } – decyzja
// wykonywana przy następnej synchronizacji (scalenie z osobą, nowa osoba z priorytetem 5, pominięcie pliku na stałe).

import type { NextApiRequest, NextApiResponse } from "next";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";

const ACTIONS = ["merge", "create", "skip"] as const;
type Action = (typeof ACTIONS)[number];

interface DecisionRow {
  file_id: string;
  path: string;
  candidate_ids: string[] | null;
  values: Record<string, unknown> | null;
  created_at: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, user } = auth;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("vault_import_decisions")
      .select("file_id, path, candidate_ids, values, created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("path");
    if (error) {
      res.status(500).json({ error: "Nie udało się pobrać duplikatów." });
      return;
    }
    const rows = (data ?? []) as DecisionRow[];
    const ids = [...new Set(rows.flatMap((r) => r.candidate_ids ?? []))];
    const { data: people, error: peopleError } = ids.length
      ? await supabase
          .from("people")
          .select("id, first_name, last_name, relationship, priority, phones, emails, birthday")
          .eq("user_id", user.id)
          .in("id", ids)
      : { data: [], error: null };
    if (peopleError) {
      res.status(500).json({ error: "Nie udało się pobrać osób." });
      return;
    }
    const byId = new Map((people ?? []).map((p) => [p.id as string, p]));
    res.status(200).json({
      duplicates: rows.map((r) => ({
        fileId: r.file_id,
        path: r.path,
        fromVault: {
          relationship: r.values?.relationship ?? null,
          phones: r.values?.phones ?? [],
          emails: r.values?.emails ?? [],
          birthday: r.values?.birthday ?? null,
          hasNotes: typeof r.values?.notes === "string" && r.values.notes.trim().length > 0,
        },
        candidates: (r.candidate_ids ?? []).map((id) => byId.get(id)).filter(Boolean),
      })),
    });
    return;
  }

  const body = (req.body ?? {}) as { fileId?: unknown; action?: unknown; personId?: unknown };
  const action = body.action as Action;
  if (typeof body.fileId !== "string" || !ACTIONS.includes(action)) {
    res.status(400).json({ error: "Nieprawidłowa decyzja." });
    return;
  }
  const { data: row } = await supabase
    .from("vault_import_decisions")
    .select("candidate_ids")
    .eq("user_id", user.id)
    .eq("file_id", body.fileId)
    .eq("status", "pending")
    .maybeSingle<{ candidate_ids: string[] | null }>();
  if (!row) {
    res.status(404).json({ error: "Nie znaleziono decyzji." });
    return;
  }
  if (action === "merge" && (typeof body.personId !== "string" || !(row.candidate_ids ?? []).includes(body.personId))) {
    res.status(400).json({ error: "Wybierz osobę do scalenia." });
    return;
  }
  const { error } = await supabase
    .from("vault_import_decisions")
    .update({
      status: action,
      person_id: action === "merge" ? body.personId : null,
      decided_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("file_id", body.fileId);
  if (error) {
    res.status(500).json({ error: "Nie udało się zapisać decyzji." });
    return;
  }
  res.status(200).json({ success: true });
}
