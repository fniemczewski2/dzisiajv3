// lib/server/cronAuth.ts

import type { NextApiRequest } from "next";
import { safeEqual } from "@/lib/server/safeEqual";

export function verifyCronRequest(req: NextApiRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const headerSecret = req.headers["x-cron-secret"];
  if (typeof headerSecret === "string" && safeEqual(expected, headerSecret)) return true;

  const authorization = req.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return safeEqual(expected, authorization.slice("Bearer ".length));
  }
  return false;
}