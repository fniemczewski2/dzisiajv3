import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.query.userId as string;
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/outlook-calendar/callback`,
    scope: 'offline_access Calendars.Read User.Read',
    state: state,
    prompt: 'select_account'
  });
  res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`);
}