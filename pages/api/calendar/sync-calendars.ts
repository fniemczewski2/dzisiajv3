import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID!;
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET!;

const toSupabaseTime = (dt: { dateTime?: string; date?: string } | undefined, isEndTime = false): string => {
  if (!dt) return new Date().toISOString().slice(0, 19);
  if (dt.dateTime) {
    const localTimeRaw = dt.dateTime.split(/[+-Z]/)[0];
    return localTimeRaw.slice(0, 19);
  }
  if (dt.date) {
    if (isEndTime) {
      const d = new Date(dt.date);
      d.setDate(d.getDate() - 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}T23:59:59`;
    }
    return `${dt.date}T00:00:00`;
  }
  return new Date().toISOString().slice(0, 19);
};

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.access_token ?? null;
}

async function refreshOutlookToken(refreshToken: string) {
  const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      client_secret: OUTLOOK_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) return null;
  return await r.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Nieautoryzowane wywołanie" });
  }

  try {
    const { data: accounts, error: dbError } = await supabaseService
      .from("connected_calendars")
      .select("*"); // Usuwamy ograniczenie tylko na google

    if (dbError) throw dbError;
    if (!accounts || accounts.length === 0) return res.json({ message: "Brak kont do synchronizacji" });

    let totalImported = 0;
    const tokenCache: Record<string, string> = {}; 
    const mainAccountsCache: Record<string, any> = {};

    for (const acc of accounts) {
      if (acc.google_calendar_id === '@account_connection') continue; 

      const mainAcc = accounts.find(a => a.account_email === acc.account_email && a.google_calendar_id === '@account_connection' && a.provider === acc.provider);
      if (!mainAcc || !mainAcc.refresh_token) continue;

      const cacheKey = `${acc.provider}-${mainAcc.account_email}`;
      let accessToken = tokenCache[cacheKey];

      if (!accessToken) {
        if (acc.provider === 'google') {
          accessToken = (await refreshGoogleToken(mainAcc.refresh_token)) || '';
        } else if (acc.provider === 'outlook') {
          const tokenData = await refreshOutlookToken(mainAcc.refresh_token);
          accessToken = tokenData ? tokenData.access_token : '';
        }
        
        if (accessToken) {
            tokenCache[cacheKey] = accessToken;
            mainAccountsCache[cacheKey] = mainAcc;
        }
      }
      
      if (!accessToken) continue;

      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1);
      const timeMax = new Date();
      timeMax.setFullYear(timeMax.getFullYear() + 1);

      if (acc.provider === 'google') {
          const isBirthdayVirtual = acc.google_calendar_id === "google_birthdays";
          const targetCalendarId = isBirthdayVirtual ? "primary" : (acc.google_calendar_id || "primary");

          const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`);
          url.searchParams.set("timeMin", timeMin.toISOString());
          url.searchParams.set("timeMax", timeMax.toISOString());
          url.searchParams.set("singleEvents", "true");
          url.searchParams.set("maxResults", "2500");
          if (isBirthdayVirtual) url.searchParams.set("eventTypes", "birthday");

          let pageToken: string | undefined = undefined;

          do {
            const fetchUrl = new URL(url.toString());
            if (pageToken) fetchUrl.searchParams.set("pageToken", pageToken);

            const googleRes = await fetch(fetchUrl.toString(), {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!googleRes.ok) break;
            const data = await googleRes.json();
            pageToken = data.nextPageToken;

            for (const ev of data.items || []) {
              if (ev.status === "cancelled" || !ev.start || !ev.end) continue;
              const isBirthdayEvent = ev.eventType === "birthday";
              if (isBirthdayVirtual && !isBirthdayEvent) continue;
              if (!isBirthdayVirtual && isBirthdayEvent) continue;

              const { data: dup } = await supabaseService.from("events").select("id").eq("google_event_id", ev.id).eq("calendar_id", acc.id).maybeSingle();
              if (dup) continue;

              await supabaseService.from("events").insert({
                user_id: acc.user_id,
                calendar_id: acc.id,
                title: ev.summary || "(bez tytułu)",
                description: ev.description || "",
                start_time: toSupabaseTime(ev.start),
                end_time: toSupabaseTime(ev.end, true),
                place: ev.location || "",
                repeat: "none",
                google_event_id: ev.id,
                shared_with_id: null,
              });
              totalImported++;
            }
          } while (pageToken);

      } else if (acc.provider === 'outlook') {
          let fetchUrl: string | undefined = `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(acc.google_calendar_id)}/calendarView?startDateTime=${timeMin.toISOString()}&endDateTime=${timeMax.toISOString()}&$top=100`;
          while (fetchUrl) {
            const msRes: Response = await fetch(fetchUrl, {
              headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' }
            });
            
            if (!msRes.ok) break;
            const data: any = await msRes.json();
            
            for (const ev of data.value || []) {
              if (ev.isCancelled) continue;
              const { data: dup } = await supabaseService.from("events").select("id").eq("google_event_id", ev.id).eq("calendar_id", acc.id).maybeSingle();
              if (dup) continue;

              const startTime = new Date(ev.start.dateTime + 'Z').toISOString().slice(0, 19);
              const endTime = new Date(ev.end.dateTime + 'Z').toISOString().slice(0, 19);

              await supabaseService.from("events").insert({
                user_id: acc.user_id,
                calendar_id: acc.id,
                title: ev.subject || "(bez tytułu)",
                description: ev.bodyPreview || "",
                start_time: startTime,
                end_time: endTime,
                place: ev.location?.displayName || "",
                repeat: "none",
                google_event_id: ev.id,
                shared_with_id: null,
              });
              totalImported++;
            }
            fetchUrl = data['@odata.nextLink']; // Obsługa paginacji i przekraczania 100 wpisów
          }
      }
    }

    // Aktualizacja czasu życia tokenów dla kont głównych w bazie
    for (const [key, token] of Object.entries(tokenCache)) {
      const mainAcc = mainAccountsCache[key];
      if (mainAcc) {
         await supabaseService.from("connected_calendars")
          .update({ access_token: token, expires_at: new Date(Date.now() + 3600000).toISOString() })
          .eq("id", mainAcc.id);
      }
    }

    return res.json({ success: true, imported: totalImported });
  } catch (error: any) {
    console.error("[CRON ERROR]:", error);
    return res.status(500).json({ error: error.message });
  }
}