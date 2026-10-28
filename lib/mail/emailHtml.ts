// lib/mail/emailHtml.ts
//
// Przygotowanie HTML wiadomości do wyświetlenia w izolowanym <iframe srcdoc> (bez skryptów):
// sanitizacja DOMPurify, bezpieczne linki w nowej karcie, obrazy osadzone (cid:) jako data:,
// zdalne obrazy zablokowane do czasu zgody użytkownika (mogą służyć do śledzenia otwarcia),
// a po zgodzie pobierane przez proxy /api/mail/image (CSP aplikacji blokuje obce img-src).

import DOMPurify from "dompurify";
import { sanitizeHref } from "@/lib/sanitize";

const FORBID_TAGS = [
  "script",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "meta",
  "link",
  "base",
  "svg",
  "math",
  "noscript",
  "template",
];
const FORBID_ATTR = ["srcset", "ping", "background", "action", "formaction", "poster"];
const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpeg|gif|webp|avif);base64,/i;

/** Responsywność treści maila: obrazy i tabele nie wychodzą poza szerokość ramki, długie ciągi się zawijają. */
const FRAME_CSS = [
  ":root{color-scheme:light}",
  "html,body{margin:0;padding:0;background:#fff;color:#1f2933}",
  'body{padding:12px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow-wrap:anywhere;word-break:break-word}',
  "*{box-sizing:border-box;max-width:100%}",
  "img{max-width:100%!important;height:auto!important}",
  "table{max-width:100%!important}",
  "pre{white-space:pre-wrap}",
  "a{color:#0b57d0}",
  "img[data-blocked]{display:none}",
].join("");

export function remoteImageUrl(src: string): string {
  return `/api/mail/image?u=${encodeURIComponent(src)}`;
}

export interface PreparedEmail {
  /** Kompletny dokument do atrybutu srcdoc. */
  document: string;
  /** Liczba zdalnych obrazów ukrytych do czasu zgody. */
  blockedImages: number;
}

export function prepareEmailHtml(
  html: string,
  options: { inlineImages?: Record<string, string>; showRemoteImages: boolean }
): PreparedEmail {
  const clean = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    FORBID_TAGS,
    FORBID_ATTR,
    ALLOW_DATA_ATTR: false,
  });
  const doc = new DOMParser().parseFromString(clean, "text/html");

  for (const a of Array.from(doc.querySelectorAll("a"))) {
    const href = (a.getAttribute("href") ?? "").trim();
    const absolute = /^[a-z][a-z\d+\-.]*:/i.test(href) || /^www\./i.test(href);
    const safe = absolute ? sanitizeHref(href) : null;
    if (safe) {
      a.setAttribute("href", safe);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    } else {
      a.removeAttribute("href");
    }
  }

  let blockedImages = 0;
  for (const img of Array.from(doc.querySelectorAll("img"))) {
    const src = (img.getAttribute("src") ?? "").trim();
    if (/^cid:/i.test(src)) {
      const data = options.inlineImages?.[src.slice(4).replace(/^<|>$/g, "")];
      if (data && SAFE_DATA_IMAGE.test(data)) img.setAttribute("src", data);
      else img.remove();
    } else if (/^https?:\/\//i.test(src)) {
      if (options.showRemoteImages) {
        img.setAttribute("src", remoteImageUrl(src));
      } else {
        img.removeAttribute("src");
        img.setAttribute("data-blocked", "1");
        blockedImages++;
      }
    } else if (!SAFE_DATA_IMAGE.test(src)) {
      img.remove();
    }
  }

  doc.head.insertAdjacentHTML("afterbegin", `<meta charset="utf-8"><base target="_blank"><style>${FRAME_CSS}</style>`);
  return { document: `<!doctype html>${doc.documentElement.outerHTML}`, blockedImages };
}
