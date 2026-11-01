// pages/api/obsidian/gdrive/callback.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { handleVaultCallback } from "@/lib/server/vaultConnection";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  await handleVaultCallback(req, res, "gdrive");
}
