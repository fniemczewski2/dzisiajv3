import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';

async function refreshOutlookToken(refreshToken: string) {
  const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) return null;
  return await r.json();
}

function handleAuthUrl(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/outlook-calendar/callback`,
    scope: 'offline_access Calendars.Read User.Read',
    state: state,
    prompt: 'select_account'
  });
  return res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`);
}

async function handleListCalendars(req: NextApiRequest, res: NextApiResponse, supabase: any, user: any) {
  try {
    const { data: mainAcc, error: dbError } = await supabase
      .from('connected_calendars')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'outlook')
      .eq('google_calendar_id', '@account_connection')
      .maybeSingle();

    if (dbError || !mainAcc) return res.status(404).json({ error: 'Brak konta Outlook' });

    let accessToken = mainAcc.access_token;
    const isExpired = new Date(mainAcc.expires_at).getTime() < Date.now() + 60000;

    if (isExpired && mainAcc.refresh_token) {
      const tokenData = await refreshOutlookToken(mainAcc.refresh_token);
      if (tokenData?.access_token) {
        accessToken = tokenData.access_token;
        await supabase.from('connected_calendars').update({
          access_token: accessToken,
          refresh_token: tokenData.refresh_token || mainAcc.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        }).eq('id', mainAcc.id);
      }
    }

    const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) { return res.status(500).json({ error: "Wystąpił błąd Microsoft" });}
    const data = await response.json();
    
    const calendars = (data.value || []).map((cal: any) => ({
      id: cal.id,
      summary: cal.name,
      primary: cal.isDefaultCalendar,
      primaryAccountId: mainAcc.id
    }));

    return res.status(200).json({ calendars });
  } catch {
    return res.status(500).json({ error: "Błąd pobierania listy kalendarzy" });
  }
}

async function handleImport(req: NextApiRequest, res: NextApiResponse, supabase: any, user: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda niedozwolona' });

  try {
    const { calendarId, accountId } = req.body;
    
    const { data: mainAcc } = await supabase
      .from('connected_calendars')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'outlook')
      .eq('google_calendar_id', '@account_connection')
      .maybeSingle();

    if (!mainAcc) return res.status(500).json({ error: "Brak podłączonego konta Microsoft" });

    let accessToken = mainAcc.access_token;
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setFullYear(timeMax.getFullYear() + 1);

    let fetchUrl: string | undefined = `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/calendarView?startDateTime=${timeMin.toISOString()}&endDateTime=${timeMax.toISOString()}&$top=100`;
    let imported = 0;

    while (fetchUrl) {
      const msRes: Response = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' }
      });
          
      if (!msRes.ok) break;
      const data: any = await msRes.json();
      const eventsToInsert = [];
      
      for (const ev of data.value || []) {
        if (ev.isCancelled) continue;

        const { data: dup } = await supabase
          .from('events')
          .select('id')
          .eq('google_event_id', ev.id)
          .eq('calendar_id', accountId)
          .maybeSingle();

        if (dup) continue;

        const startTime = new Date(ev.start.dateTime + 'Z').toISOString().slice(0, 19);
        const endTime = new Date(ev.end.dateTime + 'Z').toISOString().slice(0, 19);

        eventsToInsert.push({
          user_id: user.id,
          calendar_id: accountId,
          title: ev.subject || '(bez tytułu)',
          description: ev.bodyPreview || '',
          start_time: startTime,
          end_time: endTime,
          place: ev.location?.displayName || '',
          repeat: 'none',
          google_event_id: ev.id,
          shared_with_id: null
        });
      }

      if (eventsToInsert.length > 0) {
        await supabase.from('events').insert(eventsToInsert);
        imported += eventsToInsert.length;
      }

      fetchUrl = data['@odata.nextLink']; 
    }

    return res.status(200).json({ success: true, imported });
  } catch {
    return res.status(500).json({ error: "Błąd pobierania wydarzeń z kalendarza Outlook" });
  }
}

async function handleDisconnect(req: NextApiRequest, res: NextApiResponse, supabase: any, user: any) {
  try {
    const { subCalendarId, email } = req.query;
    if (subCalendarId) {
      await supabase.from('connected_calendars').delete().eq('id', subCalendarId).eq('user_id', user.id);
    } else if (email) {
      await supabase.from('connected_calendars').delete().eq('account_email', email).eq('provider', 'outlook').eq('user_id', user.id);
    }
    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: "Błąd odłączenia kalendarza Outlook" });
  }
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;

  if (action === 'auth-url') {
    return handleAuthUrl(req, res);
  }

  const supabase = createServerSupabase(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Nieautoryzowany dostęp' });
  }

  if (action === 'list-calendars') {
    return handleListCalendars(req, res, supabase, user);
  }
  
  if (action === 'import') {
    return handleImport(req, res, supabase, user);
  }
  
  if (action === 'disconnect') {
    return handleDisconnect(req, res, supabase, user);
  }

  return res.status(404).json({ error: 'Nieznana akcja' });
}