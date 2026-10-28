// pages/api/google-calendar/callback.ts

import { serverEnv } from "@/config/env";
import { NextApiRequest, NextApiResponse } from "next";
import { handleOAuthCallback } from "@/lib/server/oauthCallback";
import { GOOGLE_TOKEN_URL } from "@/lib/server/oauthTokens";

// Bez zwracania wyniku: Next.js ostrzega, gdy handler API zwraca wartość (res.redirect zwraca obiekt).
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  await handleOAuthCallback(req, res, {
    provider: "google",
    stateCookieName: "gcal_oauth_state",
    tokenUrl: GOOGLE_TOKEN_URL,
    profileUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    calendarName: "Połączenie Google",
    buildClientCredentials: () => {
      const { clientId, clientSecret } = serverEnv.google.require();
      return { client_id: clientId, client_secret: clientSecret };
    },
    extractEmail: (profile) => profile.email as string | undefined,
  });
}
