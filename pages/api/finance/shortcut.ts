// pages/api/finance/shortcut.ts
//
// POST z automatyzacji Skrótów iOS wyzwalanej płatnością Apple Pay: { amount, merchant }. Tworzy wydatek z dzisiejszą
// datą (czas polski), w profilu finansowym o najniższej kolejności. Kategoria i powiązanie z rachunkiem stałym są
// podpowiadane z historii (lib/finance.ts: suggestCategoryName, suggestBillLink – link jako „suggested”).
// Uwierzytelnianie tokenem Skrótów (jak szybkie notatki i dane o zdrowiu).

import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods } from "@/lib/server/apiGuards";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { looksLikeShortcutToken } from "@/lib/server/shortcutTokens";
import { extractShortcutToken, resolveShortcutUser } from "@/lib/server/shortcutAuth";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { parseFinanceShortcutPayload } from "@/lib/financeShortcut";
import { formatPln, suggestBillLink, suggestCategoryName } from "@/lib/finance";
import { getAppDate } from "@/lib/dateUtils";
import { cols } from "@/lib/db/columns";
import type { RecurringBill, Transaction } from "@/types/finance";

export const config = { api: { bodyParser: { sizeLimit: "4kb" } } };

const HISTORY_LIMIT = 300;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!(await enforceRateLimit(res, "financeShortcut", clientIp(req)))) return;

  const token = extractShortcutToken(req);
  if (!looksLikeShortcutToken(token)) {
    res.status(401).json({ error: "Brak autoryzacji." });
    return;
  }
  const parsed = parseFinanceShortcutPayload(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    const admin = supabaseAdmin();
    const userId = await resolveShortcutUser(admin, token);
    if (!userId) {
      res.status(401).json({ error: "Brak autoryzacji." });
      return;
    }

    const date = getAppDate();
    const [profiles, history, bills, categories] = await Promise.all([
      admin.from("finance_profiles").select("id").eq("user_id", userId).order("sort_order").limit(1),
      admin
        .from("transactions")
        .select(cols("transactions"))
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(HISTORY_LIMIT),
      admin.from("recurring_bills").select(cols("recurring_bills")).eq("user_id", userId).eq("active", true),
      admin.from("budget_categories").select("id, name, year").eq("user_id", userId),
    ]);

    const historyRows = (history.data ?? []) as Transaction[];
    const draft = { description: parsed.merchant, amount: parsed.amount, date, is_income: false };
    const nameById = new Map(
      ((categories.data ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name])
    );
    const categoryName = suggestCategoryName(draft, historyRows, nameById);
    const year = Number(date.slice(0, 4));
    const category = ((categories.data ?? []) as Array<{ id: string; name: string; year: number }>).find(
      (c) => c.year === year && categoryName !== null && c.name === categoryName
    );
    const billLink = suggestBillLink(
      draft,
      ((bills.data ?? []) as RecurringBill[]).map((b) => ({ ...b, amount: Number(b.amount) })),
      historyRows
    );

    const { error } = await admin.from("transactions").insert({
      user_id: userId,
      profile_id: (profiles.data?.[0] as { id: string } | undefined)?.id ?? null,
      date,
      amount: parsed.amount,
      is_income: false,
      description: parsed.merchant,
      category_id: category?.id ?? null,
      recurring_bill_id: billLink?.billId ?? null,
      link_status: billLink ? "suggested" : null,
      source: "shortcut",
      import_key: null,
    });
    if (error) throw error;
    res
      .status(201)
      .json({ success: true, message: `Zapisano wydatek ${formatPln(parsed.amount)} – ${parsed.merchant}.` });
  } catch (err) {
    console.error("[finance/shortcut]", err instanceof Error ? err.message : "nieznany błąd");
    res.status(500).json({ error: "Nie udało się zapisać wydatku. Spróbuj ponownie." });
  }
}
