// lib/server/cronAuth.ts

import { timingSafeEqual } from "node:crypto";
import type { NextApiRequest } from "next";

function safeEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

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