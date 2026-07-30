// pages/api/outlook-calendar/callback.ts

import { NextApiRequest, NextApiResponse } from "next";
import { handleOAuthCallback } from "@/lib/server/oauthCallback";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleOAuthCallback(req, res, {
    provider: "outlook",
    stateCookieName: "outlook_oauth_state",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    profileUrl: "https://graph.microsoft.com/v1.0/me",
    calendarName: "Połączenie Outlook",
    buildClientCredentials: () => ({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
    }),
    extractEmail: (profile) => (profile.mail as string | undefined) || (profile.userPrincipalName as string | undefined),
  });
}
