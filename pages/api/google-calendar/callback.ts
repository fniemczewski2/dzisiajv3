import { NextApiRequest, NextApiResponse } from "next";
import { handleOAuthCallback } from "@/lib/server/oauthCallback";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleOAuthCallback(req, res, {
    provider: "google",
    stateCookieName: "gcal_oauth_state",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    calendarName: "Połączenie Google",
    buildClientCredentials: () => ({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    extractEmail: (profile) => profile.email as string | undefined,
  });
}
