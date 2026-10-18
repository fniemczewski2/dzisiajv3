// pages/api/auth/callback.ts
//
// Powrót z logowania Supabase (OAuth/magic link): wymiana kodu na sesję
// i krótka strona przejściowa, która powiadamia pozostałe karty i przechodzi
// pod adres z parametru `next` (tylko ścieżki w obrębie aplikacji).

import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/redirect";
import { CACHE_CONTROL } from "@/config/server";

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Strona przejściowa w barwach aplikacji (jasny i ciemny motyw z ustawień systemu). */
export function renderCallbackPage(nextPath: string): string {
  return `<!DOCTYPE html>
<html lang="pl" data-next="${escapeAttribute(nextPath)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Logowanie – Dzisiaj.Fun</title>
    <style>
      :root { color-scheme: light dark; --bg: #F7F8FA; --card: #FFFFFF; --text: #101A26; --muted: #34475C; --line: #CBD3DD; --accent: #1D5FB0; }
      @media (prefers-color-scheme: dark) { :root { --bg: #04080F; --card: #0A121D; --text: #E9EEF4; --muted: #B9C5D3; --line: #2A3A4F; --accent: #7EB0EE; } }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem; background: var(--bg); color: var(--text);
        font-family: "Atkinson Hyperlegible Next", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.55; }
      main { width: 100%; max-width: 26rem; background: var(--card); border: 1px solid var(--line); border-radius: 0.875rem; padding: 1.5rem; }
      h1 { margin: 0 0 0.5rem; font-size: 1.375rem; }
      p { margin: 0; color: var(--muted); }
      a { color: var(--accent); font-weight: 600; }
      .spinner { width: 1.5rem; height: 1.5rem; margin-bottom: 1rem; border-radius: 50%; border: 3px solid var(--line); border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
    </style>
    <script src="/auth-callback.js" defer></script>
  </head>
  <body>
    <main role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <h1>Zalogowano</h1>
      <p>Za chwilę przejdziesz do aplikacji. Jeśli nic się nie dzieje, <a href="${escapeAttribute(nextPath)}">przejdź dalej</a>.</p>
    </main>
  </body>
</html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }

  const { code } = req.query;
  const nextPath = safeRedirectPath(req.query.next);

  if (typeof code === "string" && code) {
    try {
      const { error } = await createServerSupabase(req, res).auth.exchangeCodeForSession(code);
      if (!error) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", CACHE_CONTROL.private);
        return res.status(200).send(renderCallbackPage(nextPath));
      }
      console.error("[auth/callback] Wymiana kodu na sesję nie powiodła się:", error.message);
    } catch (error) {
      console.error("[auth/callback] Nieoczekiwany błąd logowania:", error);
    }
  }

  return res.redirect("/start?error=auth_failed");
}
