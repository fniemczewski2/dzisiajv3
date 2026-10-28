// lib/server/mailInlineImages.ts
//
// Obrazy osadzone (cid:) jako adresy data: – CSP aplikacji dopuszcza data: w img-src.
// SVG jest pomijane (może zawierać skrypty); liczba i rozmiar obrazów są ograniczone.

import type { MailMessage } from "@/lib/mail/types";
import type { MailProviderClient } from "@/lib/mail/provider";

const MAX_INLINE_IMAGES = 10;
/** Limit długości base64 jednego obrazu (~1,5 MB danych). */
const MAX_INLINE_BASE64 = 2_000_000;
const INLINE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]);

export async function inlineImageDataUris(
  client: MailProviderClient,
  message: MailMessage
): Promise<Record<string, string>> {
  const wanted = message.inlineImages.filter((i) => INLINE_IMAGE_TYPES.has(i.mimeType)).slice(0, MAX_INLINE_IMAGES);
  const entries = await Promise.all(
    wanted.map(async (img) => {
      try {
        const base64 = await client.getAttachmentBase64(message.id, img.attachmentId);
        if (!base64 || base64.length > MAX_INLINE_BASE64) return null;
        return [img.contentId, `data:${img.mimeType};base64,${base64}`] as const;
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(entries.filter((e) => e !== null));
}
