// pages/api/obsidian/onedrive/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { startVaultOAuth } from "@/lib/server/vaultConnection";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  await startVaultOAuth(req, res, "onedrive");
}
