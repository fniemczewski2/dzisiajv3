import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { encryptToken, decryptToken } from '@/lib/server/tokenCrypto';
import { refreshGoogleToken, refreshOutlookToken } from '@/lib/server/oauthTokens';
import { toSupabaseTime, outlookToSupabaseTime } from '@/lib/server/calendarTime';
import { ConnectedCalendarRow, TokenCache, MainAccountsCache } from '@/types/connectedCalendars';
import { GoogleEventsListResponse } from '@/types/googleCalendar';
import { OutlookEventsResponse } from '@/types/outlookCalendar';

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// Kształt wiersza wstawianego do `events` przy imporcie.
interface ImportedEventRow {
  user_id: string;
  calendar_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  place: string;
  repeat: 'none';
  google_event_id: string;
  shared_with_id: null;
}

/**
 * Batch upsert zamiast N+1 (osobny SELECT dedup + INSERT per event).
 * Wymaga częściowego indeksu unikalnego (zob. supabase/migrations/
 * 20260720120000_events_dedup_index.sql):
 *   CREATE UNIQUE INDEX events_calendar_google_event_uidx
 *     ON events (calendar_id, google_event_id)
 *     WHERE google_event_id IS NOT NULL;
 * `ignoreDuplicates: true` = "ON CONFLICT DO NOTHING", więc istniejące
 * wydarzenia nie są nadpisywane (zachowuje dotychczasowe zachowanie dedup).
 */
async function upsertImportedEvents(rows: ImportedEventRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const { error } = await supabaseService
    .from('events')
    .upsert(rows, {
      onConflict: 'calendar_id,google_event_id',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('[CRON] events upsert error:', error.message);
    return 0;
  }
  return rows.length;
}

async function getAccessToken(
  acc: ConnectedCalendarRow,
  accounts: ConnectedCalendarRow[],
  tokenCache: TokenCache,
  mainAccountsCache: MainAccountsCache
): Promise<string | null> {
  const mainAcc = accounts.find(a => a.account_email === acc.account_email && a.google_calendar_id === '@account_connection' && a.provider === acc.provider);
  const storedRefreshToken = decryptToken(mainAcc?.refresh_token);
  if (!storedRefreshToken || !mainAcc) return null;

  const cacheKey = `${acc.provider}-${mainAcc.account_email}`;
  if (tokenCache[cacheKey]) return tokenCache[cacheKey];

  let accessToken = '';
  if (acc.provider === 'google') {
    accessToken = (await refreshGoogleToken(storedRefreshToken)) || '';
  } else if (acc.provider === 'outlook') {
    const tokenData = await refreshOutlookToken(storedRefreshToken);
    accessToken = tokenData?.access_token ?? '';
  }

  if (accessToken) {
    tokenCache[cacheKey] = accessToken;
    mainAccountsCache[cacheKey] = mainAcc;
  }
  return accessToken || null;
}

async function syncGoogleCalendar(acc: ConnectedCalendarRow, accessToken: string, timeMin: Date, timeMax: Date): Promise<number> {
  let importedCount = 0;
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
    const data: GoogleEventsListResponse = await googleRes.json();
    pageToken = data.nextPageToken;

    const rows: ImportedEventRow[] = [];
    for (const ev of data.items || []) {
      if (ev.status === "cancelled" || !ev.start || !ev.end) continue;
      const isBirthdayEvent = ev.eventType === "birthday";
      if (isBirthdayVirtual && !isBirthdayEvent) continue;
      if (!isBirthdayVirtual && isBirthdayEvent) continue;

      rows.push({
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
    }
    importedCount += await upsertImportedEvents(rows);
  } while (pageToken);

  return importedCount;
}

async function syncOutlookCalendar(acc: ConnectedCalendarRow, accessToken: string, timeMin: Date, timeMax: Date): Promise<number> {
  let importedCount = 0;
  let fetchUrl: string | undefined = `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(acc.google_calendar_id)}/calendarView?startDateTime=${timeMin.toISOString()}&endDateTime=${timeMax.toISOString()}&$top=100`;

  while (fetchUrl) {
    const msRes: Response = await fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' }
    });

    if (!msRes.ok) break;
    const data: OutlookEventsResponse = await msRes.json();

    const rows: ImportedEventRow[] = [];
    for (const ev of data.value || []) {
      if (ev.isCancelled) continue;

      rows.push({
        user_id: acc.user_id,
        calendar_id: acc.id,
        title: ev.subject || "(bez tytułu)",
        description: ev.bodyPreview || "",
        start_time: outlookToSupabaseTime(ev.start.dateTime),
        end_time: outlookToSupabaseTime(ev.end.dateTime),
        place: ev.location?.displayName || "",
        repeat: "none",
        google_event_id: ev.id,
        shared_with_id: null,
      });
    }
    importedCount += await upsertImportedEvents(rows);
    fetchUrl = data['@odata.nextLink'];
  }

  return importedCount;
}

async function updateMainTokens(tokenCache: TokenCache, mainAccountsCache: MainAccountsCache) {
  for (const [key, token] of Object.entries(tokenCache)) {
    const mainAcc = mainAccountsCache[key];
    if (mainAcc) {
       await supabaseService.from("connected_calendars")
        .update({ access_token: encryptToken(token), expires_at: new Date(Date.now() + 3600000).toISOString() })
        .eq("id", mainAcc.id);
    }
  }
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[CRON] No CRON_SECRET defined.");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const expectedHeader = `Bearer ${expectedSecret}`;
  const providedHeader = req.headers.authorization || "";

  if (
    expectedHeader.length !== providedHeader.length || 
    !crypto.timingSafeEqual(Buffer.from(expectedHeader), Buffer.from(providedHeader))
  ) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  try {
    const { data: accounts, error: dbError } = await supabaseService
      .from("connected_calendars")
      .select("*")
      .returns<ConnectedCalendarRow[]>();

    if (dbError) throw dbError;
    if (!accounts || accounts.length === 0) return res.json({ message: "No accounts to synchronize." });

    let totalImported = 0;
    const tokenCache: TokenCache = {};
    const mainAccountsCache: MainAccountsCache = {};

    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setFullYear(timeMax.getFullYear() + 1);

    for (const acc of accounts) {
      if (acc.google_calendar_id === '@account_connection') continue; 

      const accessToken = await getAccessToken(acc, accounts, tokenCache, mainAccountsCache);
      if (!accessToken) continue;

      if (acc.provider === 'google') {
        totalImported += await syncGoogleCalendar(acc, accessToken, timeMin, timeMax);
      } else if (acc.provider === 'outlook') {
        totalImported += await syncOutlookCalendar(acc, accessToken, timeMin, timeMax);
      }
    }

    await updateMainTokens(tokenCache, mainAccountsCache);

    return res.json({ success: true, imported: totalImported });
  } catch (error) {
    console.error("[CRON ERROR]:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
