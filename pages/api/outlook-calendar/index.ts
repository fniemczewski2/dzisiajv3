import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '../../../utils/supabase/server';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action, userId } = req.query;

  // 1. Generowanie URL logowania
  if (action === 'auth-url') {
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

  // Autoryzacja dla pozostałych akcji API
  const supabase = createServerSupabase(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({ error: 'Nieautoryzowany dostęp' });
  }

  // 2. Pobieranie listy kalendarzy (bez zmian)
  if (action === 'list-calendars') {
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
        if (tokenData && tokenData.access_token) {
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

      if (!response.ok) throw new Error('Błąd Microsoft Graph');
      const data = await response.json();
      
      const calendars = (data.value || []).map((cal: any) => ({
        id: cal.id,
        summary: cal.name,
        primary: cal.isDefaultCalendar,
        primaryAccountId: mainAcc.id
      }));

      return res.status(200).json({ calendars });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // 3. Włączanie pod-kalendarza (Importowanie wydarzeń)
  if (action === 'import') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda niedozwolona' });

    try {
      const { calendarId, accountId } = req.body;
      
      // Znajdź przypisane konto bazowe, by pobrać z niego token
      const { data: mainAcc } = await supabase
        .from('connected_calendars')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'outlook')
        .eq('google_calendar_id', '@account_connection')
        .maybeSingle();

      if (!mainAcc) throw new Error("Brak podłączonego konta Microsoft");

      let accessToken = mainAcc.access_token;

      // Import z ostatnich 30 dni oraz najbliższego roku (zgodnie z logiką dla Google)
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

        fetchUrl = data['@odata.nextLink']; // Obsługa paginacji
      }

      return res.status(200).json({ success: true, imported });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 4. Odłączanie podkonta lub całego konta
  if (action === 'disconnect') {
    try {
      const { subCalendarId, email } = req.query;
      if (subCalendarId) {
        await supabase.from('connected_calendars').delete().eq('id', subCalendarId).eq('user_id', user.id);
      } else if (email) {
        await supabase.from('connected_calendars').delete().eq('account_email', email).eq('provider', 'outlook').eq('user_id', user.id);
      }
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(404).json({ error: 'Nieznana akcja' });
}