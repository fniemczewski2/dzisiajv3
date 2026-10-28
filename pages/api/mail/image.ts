// pages/api/mail/image.ts
//
// Proxy zdalnych obrazów z treści maili – wywoływane dopiero po kliknięciu „Pokaż obrazy”.

import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { fetchRemoteImage, parseImageUrl } from "@/lib/server/imageProxy";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!allowMethods(req, res, ["GET"])) return;
  const auth = await requireUser(req, res);
  if (!auth) return;
  if (!(await enforceRateLimit(res, "mailImage", auth.user.id))) return;

  const url = parseImageUrl(req.query.u);
  if (!url) {
    res.status(400).json({ error: "Nieprawidłowy adres obrazu." });
    return;
  }

  try {
    const result = await fetchRemoteImage(url);
    if (!result.ok) {
      res.status(result.status).json({ error: result.reason });
      return;
    }
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("Content-Disposition", "inline");
    res.status(200).send(Buffer.from(result.body));
  } catch (err) {
    console.warn("[mail/image] pobranie obrazu:", err instanceof Error ? err.message : err);
    res.status(502).json({ error: "Nie udało się pobrać obrazu." });
  }
}
