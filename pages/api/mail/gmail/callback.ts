// pages/api/mail/gmail/callback.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { handleMailOAuthCallback } from "@/lib/server/mailOAuth";
import { GMAIL_OAUTH } from "@/lib/server/mailProviders";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  await handleMailOAuthCallback(req, res, GMAIL_OAUTH);
}
