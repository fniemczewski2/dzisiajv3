// pages/api/mail/gmail/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { startMailOAuth } from "@/lib/server/mailOAuth";
import { GMAIL_OAUTH } from "@/lib/server/mailProviders";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  await startMailOAuth(req, res, GMAIL_OAUTH);
}
