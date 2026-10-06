// pages/api/calendar/sync-calendars.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyCronRequest } from '@/lib/server/cronAuth';
import { encryptToken, decryptToken } from '@/lib/server/tokenCrypto';
import { refreshGoogleToken, refreshOutlookToken } from '@/lib/server/oauthTokens';
import { fetchWithTimeout } from '@/lib/server/fetchWithTimeout';
import { buildGoogleEventsUrl } from '@/lib/server/googleCalendarApi';
import { toSupabaseTime, outlookToSupabaseTime } from '@/lib/server/calendarTime';
import { ConnectedCalendarRow, TokenCache, MainAccountsCache } from '@/types/connectedCalendars';
import { GoogleEventsListResponse } from '@/types/googleCalendar';
import { OutlookEventsResponse } from '@/types/outlookCalendar';

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

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
}

/**
 * Batch upsert zamiast N+1. Wymaga indeksu unikalnego
 * events_calendar_google_event_uidx (calendar_id, google_event_id) –
 * zob. supabase/migrations/20261005000000_events_google_event_unique.sql.
 *
 * Bez `ignoreDuplicates`: istniejące wydarzenia są aktualizowane, więc zmiana
 * tytułu/godziny w Google lub Outlooku trafia do aplikacji. Wcześniej
 * "ON CONFLICT DO NOTHING" zamrażało wydarzenie w stanie z pierwszego importu.
 * Lokalne edycje zaimportowanego wydarzenia są przy synchronizacji nadpisywane
 * – kalendarz zewnętrzny jest źródłem prawdy. Wyjątek: shared_with_id nie
 * jest w wierszach, więc udostępnienie ustawione w aplikacji zostaje.
 */
async function upsertImportedEvents(rows: ImportedEventRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const { error } = await supabaseService
    .from('events')
    .upsert(rows, { onConflict: 'calendar_id,google_event_id' });

  if (error) {
    // Rzucamy, żeby synchronizacja kalendarza nie została uznana za pełną –
    // inaczej usuwanie nieaktualnych wydarzeń skasowałoby niezapisane wiersze.
    throw new Error(`events upsert: ${error.message}`);
  }
  return rows.length;
}

const PAGE_SIZE = 1000;
const DELETE_CHUNK = 200;

/**
 * Usuwa wydarzenia tego kalendarza z okna synchronizacji, których nie było
 * w odpowiedzi Google/Outlooka (usunięte lub odwołane u źródła).
 * Wywoływane tylko po pełnym, udanym pobraniu wszystkich stron.
 */
async function deleteStaleEvents(calendarId: string, seenIds: Set<string>, timeMin: Date, timeMax: Date): Promise<number> {
  const staleIds: string[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseService
      .from('events')
      .select('id, google_event_id')
      .eq('calendar_id', calendarId)
      .not('google_event_id', 'is', null)
      .gte('start_time', timeMin.toISOString())
      .lt('start_time', timeMax.toISOString())
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`events stale lookup: ${error.message}`);

    for (const row of data ?? []) {
      if (!seenIds.has(row.google_event_id as string)) staleIds.push(row.id as string);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  for (let i = 0; i < staleIds.length; i += DELETE_CHUNK) {
    const { error } = await supabaseService
      .from('events')
      .delete()
      .in('id', staleIds.slice(i, i + DELETE_CHUNK));
    if (error) throw new Error(`events stale delete: ${error.message}`);
  }
  return staleIds.length;
}

async function loadAllConnectedCalendars(): Promise<ConnectedCalendarRow[]> {
  // PostgREST domyślnie ucina odpowiedź do 1000 wierszy – bez stronicowania
  // konta powyżej tego progu po cichu przestawały się synchronizować.
  const all: ConnectedCalendarRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseService
      .from('connected_calendars')
      .select('*')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
      .returns<ConnectedCalendarRow[]>();
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
}

async function getAccessToken(
  acc: ConnectedCalendarRow,
  accounts: ConnectedCalendarRow[],
  tokenCache: TokenCache,
  mainAccountsCache: MainAccountsCache
): Promise<string | null> {
  // Dopasowanie MUSI obejmować user_id: dwóch użytkowników aplikacji może
  // podłączyć to samo konto Google/Outlook i wtedy kalendarz jednego
  // synchronizował się tokenem drugiego (także po odwołaniu dostępu).
  const mainAcc = accounts.find(a =>
    a.user_id === acc.user_id &&
    a.account_email === acc.account_email &&
    a.google_calendar_id === '@account_connection' &&
    a.provider === acc.provider
  );
  const storedRefreshToken = decryptToken(mainAcc?.refresh_token);
  if (!storedRefreshToken || !mainAcc) return null;

  const cacheKey = `${acc.user_id}:${acc.provider}:${mainAcc.account_email}`;
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
    // Clear a previously recorded sync error now that the refresh succeeded,
    // so a transient failure doesn't keep showing a stale warning forever.
    if (mainAcc.sync_error) {
      await supabaseService.from('connected_calendars').update({ sync_error: null }).eq('id', mainAcc.id);
    }
  } else {
    // Token refresh failed (e.g. the user revoked access in Google/Microsoft
    // account settings) — previously this was silently swallowed and the
    // account was skipped forever with no signal to the user. Persist the
    // failure so the UI (ConnectedCalendars.tsx) can surface a re-auth prompt.
    await supabaseService
      .from('connected_calendars')
      .update({ sync_error: 'token_refresh_failed' })
      .eq('id', mainAcc.id);
  }
  return accessToken || null;
}

function buildGoogleEventRows(
  items: GoogleEventsListResponse["items"],
  acc: ConnectedCalendarRow,
  isBirthdayVirtual: boolean
): ImportedEventRow[] {
  const rows: ImportedEventRow[] = [];
  for (const ev of items || []) {
    if (ev.status === "cancelled" || !ev.start || !ev.end) continue;
    const isBirthdayEvent = ev.eventType === "birthday";
    if (isBirthdayVirtual !== isBirthdayEvent) continue;

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
    });
  }
  return rows;
}

interface CalendarSyncResult {
  imported: number;
  removed: number;
}

async function syncGoogleCalendar(acc: ConnectedCalendarRow, accessToken: string, timeMin: Date, timeMax: Date): Promise<CalendarSyncResult> {
  let imported = 0;
  const seenIds = new Set<string>();
  const isBirthdayVirtual = acc.google_calendar_id === "google_birthdays";
  const targetCalendarId = isBirthdayVirtual ? "primary" : (acc.google_calendar_id || "primary");

  const url = new URL(buildGoogleEventsUrl(targetCalendarId));
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("maxResults", "2500");
  if (isBirthdayVirtual) url.searchParams.set("eventTypes", "birthday");

  let pageToken: string | undefined = undefined;

  do {
    const fetchUrl = new URL(url.toString());
    if (pageToken) fetchUrl.searchParams.set("pageToken", pageToken);

    const googleRes = await fetchWithTimeout(fetchUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!googleRes.ok) {
      // Niepełna lista – nie wolno na jej podstawie usuwać wydarzeń.
      throw new Error(`Google fetch failed for calendar ${acc.id}: ${googleRes.status}`);
    }
    const data: GoogleEventsListResponse = await googleRes.json();
    pageToken = data.nextPageToken;

    const rows = buildGoogleEventRows(data.items, acc, isBirthdayVirtual);
    rows.forEach((r) => seenIds.add(r.google_event_id));
    imported += await upsertImportedEvents(rows);
  } while (pageToken);

  const removed = await deleteStaleEvents(acc.id, seenIds, timeMin, timeMax);
  return { imported, removed };
}

async function syncOutlookCalendar(acc: ConnectedCalendarRow, accessToken: string, timeMin: Date, timeMax: Date): Promise<CalendarSyncResult> {
  let imported = 0;
  const seenIds = new Set<string>();
  let fetchUrl: string | undefined = `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(acc.google_calendar_id)}/calendarView?startDateTime=${timeMin.toISOString()}&endDateTime=${timeMax.toISOString()}&$top=100`;

  while (fetchUrl) {
    const msRes: Response = await fetchWithTimeout(fetchUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' }
    });

    if (!msRes.ok) {
      throw new Error(`Outlook fetch failed for calendar ${acc.id}: ${msRes.status}`);
    }
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
      });
    }
    rows.forEach((r) => seenIds.add(r.google_event_id));
    imported += await upsertImportedEvents(rows);
    fetchUrl = data['@odata.nextLink'];
  }

  const removed = await deleteStaleEvents(acc.id, seenIds, timeMin, timeMax);
  return { imported, removed };
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
  if (req.method !== "GET") return res.status(405).json({ error: "Metoda niedozwolona." });

  // Reuse the shared cron-auth helper instead of re-implementing the same
  // timing-safe comparison locally — keeps this endpoint in sync with any
  // future fix to the shared implementation.
  if (!verifyCronRequest(req)) {
    return res.status(401).json({ error: "Brak autoryzacji." });
  }

  const CONCURRENCY_LIMIT = 5;

  try {
    const accounts = await loadAllConnectedCalendars();
    if (accounts.length === 0) return res.json({ message: "Brak kont do synchronizacji." });

    const targets = accounts.filter(a => a.google_calendar_id !== '@account_connection');
    const tokenCache: TokenCache = {};
    const mainAccountsCache: MainAccountsCache = {};

    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setFullYear(timeMax.getFullYear() + 1);

    const noop: CalendarSyncResult = { imported: 0, removed: 0 };
    const processAccount = async (acc: ConnectedCalendarRow): Promise<CalendarSyncResult> => {
      const accessToken = await getAccessToken(acc, accounts, tokenCache, mainAccountsCache);
      if (!accessToken) return noop;

      if (acc.provider === 'google') return syncGoogleCalendar(acc, accessToken, timeMin, timeMax);
      if (acc.provider === 'outlook') return syncOutlookCalendar(acc, accessToken, timeMin, timeMax);
      return noop;
    };

    let totalImported = 0;
    let totalRemoved = 0;
    const failedAccounts: string[] = [];

    for (let i = 0; i < targets.length; i += CONCURRENCY_LIMIT) {
      const chunk = targets.slice(i, i + CONCURRENCY_LIMIT);
      const results = await Promise.allSettled(chunk.map(processAccount));

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          totalImported += result.value.imported;
          totalRemoved += result.value.removed;
        } else {
          console.error(`[CRON] Sync failed for account ${chunk[idx].id}:`, result.reason);
          failedAccounts.push(chunk[idx].id);
        }
      });

      await updateMainTokens(tokenCache, mainAccountsCache);
    }

    return res.json({ success: failedAccounts.length === 0, imported: totalImported, removed: totalRemoved, failedAccounts });
  } catch (error) {
    console.error("[CRON ERROR]:", error);
    return res.status(500).json({ error: "Synchronizacja nie powiodła się." });
  }
}
