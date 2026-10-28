// pages/api/mail/outlook/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { startMailOAuth } from "@/lib/server/mailOAuth";
import { OUTLOOK_OAUTH } from "@/lib/server/mailProviders";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  await startMailOAuth(req, res, OUTLOOK_OAUTH);
}
