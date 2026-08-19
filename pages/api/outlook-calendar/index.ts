// pages/api/outlook-calendar/index.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { randomBytes } from 'node:crypto';
import { encryptToken, decryptToken } from '@/lib/server/tokenCrypto';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { ConnectedCalendarRow } from '@/types/connectedCalendars';
import { OutlookTokenResponse, OutlookEventsResponse, OutlookCalendarsResponse } from '@/types/outlookCalendar';
import { warsawNaiveToRFC3339 } from '@/lib/server/calendarTime';

async function refreshOutlookToken(refreshToken: string): Promise<OutlookTokenResponse | null> {
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

// Shared by handleListCalendars and handleExport — both need a live access
// token and both had this exact same inline refresh-and-persist block.
async function ensureFreshOutlookToken(supabase: SupabaseClient, mainAcc: ConnectedCalendarRow): Promise<string> {
  let accessToken = decryptToken(mainAcc.access_token);
  const storedRefreshToken = decryptToken(mainAcc.refresh_token);
  const isExpired = new Date(mainAcc.expires_at ?? 0).getTime() < Date.now() + 60000;

  if (isExpired && storedRefreshToken) {
    const tokenData = await refreshOutlookToken(storedRefreshToken);
    if (tokenData?.access_token) {
      accessToken = tokenData.access_token;
      await supabase.from('connected_calendars').update({
        access_token: encryptToken(accessToken),
        refresh_token: encryptToken(tokenData.refresh_token || storedRefreshToken),
        expires_at: new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString(),
      }).eq('id', mainAcc.id);
    }
  }
  return accessToken;
}

function handleAuthUrl(req: NextApiRequest, res: NextApiResponse) {
  const nonce = randomBytes(24).toString('base64url');
  res.setHeader("Set-Cookie", `outlook_oauth_state=${nonce}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`);

  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/outlook-calendar/callback`,
    scope: 'offline_access Calendars.Read User.Read',
    state: nonce,
    prompt: 'select_account'
  });
  
  return res.status(200).json({ url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}` });
}

async function handleListCalendars(req: NextApiRequest, res: NextApiResponse, supabase: SupabaseClient, user: User) {
  try {
    const { data: mainAcc, error: dbError } = await supabase
      .from('connected_calendars')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'outlook')
      .eq('google_calendar_id', '@account_connection')
      .maybeSingle<ConnectedCalendarRow>();

    if (dbError || !mainAcc) return res.status(404).json({ error: 'Brak konta Outlook' });

    const accessToken = await ensureFreshOutlookToken(supabase, mainAcc);

    const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) { return res.status(500).json({ error: "Wystąpił błąd Microsoft" });}
    const data: OutlookCalendarsResponse = await response.json();
    
    const calendars = (data.value || []).map((cal) => ({
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

async function collectNewOutlookEvents(
  supabase: SupabaseClient,
  events: OutlookEventsResponse["value"],
  userId: string,
  accountId: string
): Promise<object[]> {
  const eventsToInsert = [];
  for (const ev of events || []) {
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
      user_id: userId,
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
  return eventsToInsert;
}

async function handleImport(req: NextApiRequest, res: NextApiResponse, supabase: SupabaseClient, user: User) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda niedozwolona' });

  try {
    const { calendarId, accountId } = req.body;
    
    const { data: mainAcc } = await supabase
      .from('connected_calendars')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'outlook')
      .eq('google_calendar_id', '@account_connection')
      .maybeSingle<ConnectedCalendarRow>();

    if (!mainAcc) return res.status(500).json({ error: "Brak podłączonego konta Microsoft" });

    const accessToken = decryptToken(mainAcc.access_token);
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
      const data: OutlookEventsResponse = await msRes.json();
      const eventsToInsert = await collectNewOutlookEvents(supabase, data.value, user.id, accountId);

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

async function handleDisconnect(req: NextApiRequest, res: NextApiResponse, supabase: SupabaseClient, user: User) {
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

interface ExportableEvent {
  id: string;
  title: string;
  description: string | null;
  place: string | null;
  start_time: string;
  end_time: string;
  google_event_id: string | null;
}

async function exportEventsToOutlook(
  supabase: SupabaseClient,
  events: ExportableEvent[],
  accessToken: string,
  calendarId: string
): Promise<{ exported: number; skipped: number }> {
  let exported = 0;
  let skipped = 0;

  for (const ev of events) {
    const body = {
      subject: ev.title,
      body: { contentType: 'text', content: ev.description || '' },
      location: { displayName: ev.place || '' },
      start: { dateTime: warsawNaiveToRFC3339(ev.start_time), timeZone: 'Europe/Warsaw' },
      end: { dateTime: warsawNaiveToRFC3339(ev.end_time), timeZone: 'Europe/Warsaw' },
    };
    const method = ev.google_event_id ? 'PATCH' : 'POST';
    const endpoint = ev.google_event_id
      ? `https://graph.microsoft.com/v1.0/me/events/${ev.google_event_id}`
      : `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`;

    const r = await fetch(endpoint, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (r.ok) {
      const created = await r.json();
      await supabase.from('events').update({ google_event_id: created.id }).eq('id', ev.id);
      exported++;
    } else {
      skipped++;
    }
  }
  return { exported, skipped };
}

async function handleExport(req: NextApiRequest, res: NextApiResponse, supabase: SupabaseClient, user: User) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda niedozwolona' });

  try {
    const { calendarId, eventIds } = req.body ?? {};
    if (!calendarId) return res.status(400).json({ error: 'calendarId required' });

    const { data: mainAcc } = await supabase
      .from('connected_calendars')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'outlook')
      .eq('google_calendar_id', '@account_connection')
      .maybeSingle<ConnectedCalendarRow>();

    if (!mainAcc) return res.status(400).json({ error: 'Brak podłączonego konta Microsoft' });

    const accessToken = await ensureFreshOutlookToken(supabase, mainAcc);

    let query = supabase.from('events').select('*').eq('user_id', user.id);
    if (eventIds?.length) {
      query = query.in('id', eventIds);
    } else {
      const past30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
      const future = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
      query = query.gte('start_time', past30).lte('start_time', future);
    }

    const { data: events, error: fetchErr } = await query;
    if (fetchErr) return res.status(500).json({ error: 'Failed to fetch local events' });
    if (!events?.length) return res.json({ exported: 0, skipped: 0, message: 'No events found in selected range' });

    const { exported, skipped } = await exportEventsToOutlook(supabase, events as ExportableEvent[], accessToken, calendarId);
    return res.json({ exported, skipped });
  } catch {
    return res.status(500).json({ error: 'Błąd eksportu do kalendarza Outlook' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabase(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Nieautoryzowany dostęp' });
  }

  const { action } = req.query;

  if (action === 'auth-url') {
    return handleAuthUrl(req, res); 
  }
  
  if (action === 'list-calendars') return handleListCalendars(req, res, supabase, user);
  if (action === 'import') return handleImport(req, res, supabase, user);
  if (action === 'export') return handleExport(req, res, supabase, user);
  if (action === 'disconnect') return handleDisconnect(req, res, supabase, user);

  return res.status(404).json({ error: 'Nieznana akcja' });
}
