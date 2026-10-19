// lib/themeScriptHash.mjs
//
// Skrót SHA-256 skryptu, który next-themes wstawia w treść strony (ustawia
// motyw przed pierwszym renderem). Dopuszczenie tego jednego skryptu skrótem
// pozwala usunąć 'unsafe-inline' z dyrektywy script-src.

import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "next-themes";

/** @param {Record<string, unknown>} props */
export function themeScriptHash(props) {
  const html = renderToStaticMarkup(createElement(ThemeProvider, props, null));
  const open = html.indexOf("<script>");
  const close = html.indexOf("</script>", open);
  if (open === -1 || close === -1)
    throw new Error("next-themes nie wstawił skryptu motywu – sprawdź wersję biblioteki.");
  const script = html.slice(open + "<script>".length, close);
  return `'sha256-${createHash("sha256").update(script).digest("base64")}'`;
}
