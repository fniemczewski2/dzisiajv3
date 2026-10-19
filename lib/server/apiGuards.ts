// lib/server/apiGuards.ts
//
// Wspólne sprawdzenia na początku endpointów: dozwolona metoda HTTP
// i zalogowany użytkownik. Zwracają null po wysłaniu odpowiedzi błędu.

import type { NextApiRequest, NextApiResponse } from "next";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

/** 405 z nagłówkiem Allow, gdy metoda nie jest dozwolona. */
export function allowMethods(req: NextApiRequest, res: NextApiResponse, methods: readonly string[]): boolean {
  if (req.method && methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.join(", "));
  res.status(405).json({ error: "Metoda niedozwolona." });
  return false;
}

/** Sesja z ciasteczek; 401, gdy brak zalogowanego użytkownika. */
export async function requireUser(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const supabase = createServerSupabase(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    res.status(401).json({ error: "Brak autoryzacji." });
    return null;
  }
  return { supabase, user };
}
