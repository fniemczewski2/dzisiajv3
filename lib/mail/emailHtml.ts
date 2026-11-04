// lib/mail/emailHtml.ts
//
// Przygotowanie HTML wiadomości do wyświetlenia w izolowanym <iframe srcdoc> (bez skryptów):
// sanitizacja DOMPurify, bezpieczne linki w nowej karcie, obrazy osadzone (cid:) jako data:,
// zdalne obrazy zablokowane do czasu zgody użytkownika (mogą służyć do śledzenia otwarcia),
// a po zgodzie pobierane przez proxy /api/mail/image (CSP aplikacji blokuje obce img-src).

import DOMPurify from "dompurify";
import { sanitizeHref } from "@/lib/sanitize";
import { trimChars } from "@/lib/text";

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

/** Bezpieczne linki: tylko http(s), mailto, tel; nowa karta bez referrera. */
function secureLinks(doc: Document): void {
  for (const a of Array.from(doc.querySelectorAll("a"))) {
    const href = (a.getAttribute("href") ?? "").trim();
    const absolute = /^[a-z][a-z\d+\-.]*:/i.test(href) || /^www\./i.test(href);
    const safe = absolute ? sanitizeHref(href) : null;
    if (!safe) {
      a.removeAttribute("href");
      continue;
    }
    a.setAttribute("href", safe);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  }
}

/** Obrazy: cid → data:, zdalne ukryte albo przez proxy, pozostałe (poza bezpiecznym data:image) usuwane. */
function processImages(
  doc: Document,
  options: { inlineImages?: Record<string, string>; showRemoteImages: boolean }
): number {
  let blocked = 0;
  for (const img of Array.from(doc.querySelectorAll("img"))) {
    const src = (img.getAttribute("src") ?? "").trim();
    if (/^cid:/i.test(src)) {
      const data = options.inlineImages?.[trimChars(src.slice(4), "<>")];
      if (data && SAFE_DATA_IMAGE.test(data)) img.setAttribute("src", data);
      else img.remove();
    } else if (/^https?:\/\//i.test(src)) {
      if (options.showRemoteImages) {
        img.setAttribute("src", remoteImageUrl(src));
      } else {
        img.removeAttribute("src");
        img.dataset.blocked = "1";
        blocked++;
      }
    } else if (!SAFE_DATA_IMAGE.test(src)) {
      img.remove();
    }
  }
  return blocked;
}

/**
 * CSS z elementów <style> maila (zwykle w <head>). Sanitizacja treści działa na samym <body> (WHOLE_DOCUMENT: false),
 * więc style przenosimy osobno jako tekst: CSS nie wykonuje skryptów, a „</style” jest neutralizowane.
 */
function emailStyles(html: string): string {
  const source = new DOMParser().parseFromString(html, "text/html");
  return Array.from(source.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("\n")
    .replaceAll(/<\/style/gi, String.raw`<\/style`);
}

export function prepareEmailHtml(
  html: string,
  options: { inlineImages?: Record<string, string>; showRemoteImages: boolean }
): PreparedEmail {
  const body = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: false,
    FORBID_TAGS: [...FORBID_TAGS, "style"],
    FORBID_ATTR,
    ALLOW_DATA_ATTR: false,
  });
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><head></head><body>${body}</body></html>`,
    "text/html"
  );
  secureLinks(doc);
  const blockedImages = processImages(doc, options);
  const styleEl = doc.createElement("style");
  styleEl.textContent = emailStyles(html);
  doc.head.append(styleEl);
  doc.head.insertAdjacentHTML("afterbegin", `<meta charset="utf-8"><base target="_blank"><style>${FRAME_CSS}</style>`);
  return { document: `<!doctype html>${doc.documentElement.outerHTML}`, blockedImages };
}
