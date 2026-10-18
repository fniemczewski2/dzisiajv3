// pages/api/outlook-calendar/callback.ts

import { serverEnv } from "@/config/env";
import { NextApiRequest, NextApiResponse } from "next";
import { handleOAuthCallback } from "@/lib/server/oauthCallback";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleOAuthCallback(req, res, {
    provider: "outlook",
    stateCookieName: "outlook_oauth_state",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    profileUrl: "https://graph.microsoft.com/v1.0/me",
    calendarName: "Połączenie Outlook",
    buildClientCredentials: () => {
      const { clientId, clientSecret } = serverEnv.outlook.require();
      return { client_id: clientId, client_secret: clientSecret };
    },
    extractEmail: (profile) =>
      (profile.mail as string | undefined) || (profile.userPrincipalName as string | undefined),
  });
}
