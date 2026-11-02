// pages/api/mail/forwarding.ts
//
// Adresy przekierowania (wariant A): lista, utworzenie (adres pokazany jednorazowo) i odwołanie.
// W bazie zapisywany jest wyłącznie skrót tokenu.

import type { NextApiRequest, NextApiResponse } from "next";
import { serverEnv } from "@/config/env";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { isUuid } from "@/lib/server/mailRoute";
import {
  createForwardingToken,
  forwardingAddress,
  hashForwardingToken,
  planForwardingCreate,
} from "@/lib/mail/forwarding";

const LABEL_MAX = 100;

type Auth = NonNullable<Awaited<ReturnType<typeof requireUser>>>;

async function listAddresses(res: NextApiResponse, { supabase }: Auth): Promise<void> {
  const { data, error } = await supabase
    .from("mail_forwarding_addresses")
    .select("id, label, created_at, revoked_at")
    .order("created_at", { ascending: true });
  if (error) {
    res.status(500).json({ error: "Nie udało się pobrać adresów." });
    return;
  }
  res.status(200).json({ addresses: data ?? [] });
}

async function createAddress(req: NextApiRequest, res: NextApiResponse, { supabase, user }: Auth): Promise<void> {
  const domain = serverEnv.mailForwardingDomain;
  if (!domain) {
    res.status(503).json({ error: "Przekierowania nie są skonfigurowane." });
    return;
  }
  const rawLabel = (req.body as { label?: unknown } | undefined)?.label;
  const label = typeof rawLabel === "string" ? rawLabel.trim().slice(0, LABEL_MAX) : "";
  const { count } = await supabase
    .from("mail_forwarding_addresses")
    .select("id", { count: "exact", head: true })
    .is("revoked_at", null);
  if (!planForwardingCreate(count ?? 0).ok) {
    res.status(409).json({ error: "Osiągnięto limit aktywnych adresów." });
    return;
  }
  const token = createForwardingToken();
  const { data, error } = await supabase
    .from("mail_forwarding_addresses")
    .insert({ user_id: user.id, token_hash: await hashForwardingToken(token), label })
    .select("id")
    .single();
  if (error || !data) {
    res.status(500).json({ error: "Nie udało się utworzyć adresu." });
    return;
  }
  res.status(201).json({ id: data.id, address: forwardingAddress(token, domain) });
}

async function revokeAddress(req: NextApiRequest, res: NextApiResponse, { supabase }: Auth): Promise<void> {
  const { id } = req.query;
  if (!isUuid(id)) {
    res.status(400).json({ error: "Nieprawidłowy identyfikator." });
    return;
  }
  const { data, error } = await supabase
    .from("mail_forwarding_addresses")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id");
  if (error) {
    res.status(500).json({ error: "Nie udało się odwołać adresu." });
    return;
  }
  if (!data || data.length === 0) {
    res.status(404).json({ error: "Nie znaleziono aktywnego adresu." });
    return;
  }
  res.status(204).end();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["GET", "POST", "DELETE"])) return;
  const auth = await requireUser(req, res);
  if (!auth) return;
  if (!(await enforceRateLimit(res, "mailRead", auth.user.id))) return;
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  if (req.method === "GET") return listAddresses(res, auth);
  if (req.method === "POST") return createAddress(req, res, auth);
  return revokeAddress(req, res, auth);
}
