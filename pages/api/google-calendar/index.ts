import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

function getRedirectUri(req: NextApiRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    return `${baseUrl}/api/google-calendar/callback`;
  }
  const host = req.headers.host || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}/api/google-calendar/callback`;
}

function getServiceSupabase(token?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Brak zmiennych środowiskowych Supabase!");
  return createClient(url, key, token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined);
}

async function getUserFromBearer(req: NextApiRequest) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { data: { user }, error } = await getServiceSupabase(token).auth.getUser(token);
  if (error || !user) return null;
  return { user, token };
}

type AuthContext = NonNullable<Awaited<ReturnType<typeof getUserFromBearer>>>;

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

async function getValidGoogleToken(auth: AuthContext, accountId?: string): Promise<string | null> {
  const sb = getServiceSupabase(auth.token);
  let targetEmail: string | null = null;

  if (accountId) {
    const { data: calInfo } = await sb.from("connected_calendars")
      .select("account_email")
      .eq("id", accountId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    
    if (calInfo) targetEmail = calInfo.account_email;
  }

  let query = sb.from("connected_calendars")
    .select("id, access_token, refresh_token, expires_at")
    .eq("user_id", auth.user.id)
    .eq("provider", "google")
    .eq("google_calendar_id", "@account_connection");

  if (targetEmail) {
    query = query.eq("account_email", targetEmail);
  }

  const { data } = await query.limit(1).maybeSingle();

  if (!data) return null;
  if (data.expires_at && Date.now() < new Date(data.expires_at).getTime() - 60_000) return data.access_token;
  if (!data.refresh_token) return null;

  const fresh = await refreshGoogleToken(data.refresh_token);
  if (!fresh) return null;

  await sb.from("connected_calendars")
    .update({ access_token: fresh, expires_at: new Date(Date.now() + 3_600_000).toISOString() })
    .eq("id", data.id);
    
  return fresh;
}

const toSupabaseTime = (dt: { dateTime?: string; date?: string } | undefined, isEndTime = false): string => {
  if (!dt) return new Date().toISOString().slice(0, 19);
  
  if (dt.dateTime) {
    return dt.dateTime.slice(0, 19) + "+00:00";
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

const toRFC3339 = (ts: string): string => {
  try {
    const localStr = ts.replace(" ", "T").replace(/([+-]\d{2}:\d{2}|[+-]\d{2}|Z)$/, "");
    const refDate = new Date(localStr + "Z"); 
    const offsetStr = new Intl.DateTimeFormat("en", { timeZone: "Europe/Warsaw", timeZoneName: "shortOffset" }).formatToParts(refDate).find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
    const match = /GMT([+-])(\d+)/.exec(offsetStr);
    const sign = match?.[1] ?? "+";
    const hrs = String( Number.parseInt(match?.[2] ?? "1")).padStart(2, "0");
    return localStr + sign + hrs + ":00"; 
  } catch {
    return new Date().toISOString();
  }
};

async function handleAuthUrl(req: NextApiRequest, res: NextApiResponse, auth: AuthContext) {
  const state = Buffer.from(JSON.stringify({ userId: auth.user.id, token: auth.token })).toString("base64url");
  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.calendarlist",
    "https://www.googleapis.com/auth/calendar.calendars.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.events.owned",
    "https://www.googleapis.com/auth/calendar.events.owned.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/userinfo.email" 
  ].join(" ");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", getRedirectUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent select_account"); 
  url.searchParams.set("state", state);

  return res.json({ url: url.toString() });
}

async function handleListCalendars(req: NextApiRequest, res: NextApiResponse, auth: AuthContext) {
  const sb = getServiceSupabase(auth.token);
  const { data: mainAccounts } = await sb.from("connected_calendars")
    .select("id, account_email")
    .eq("user_id", auth.user.id)
    .eq("provider", "google")
    .eq("google_calendar_id", "@account_connection"); 

  if (!mainAccounts || mainAccounts.length === 0) return res.json({ connected: false, calendars: [] });

  const allCalendars: any[] = [];

  for (const mainAcc of mainAccounts) {
    const accessToken = await getValidGoogleToken(auth, mainAcc.id);
    if (!accessToken) continue;

    const r = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", { headers: { Authorization: `Bearer ${accessToken}` } });

    if (r.ok) {
      const data = await r.json();
      
      const items = data.items?.filter((c: any) => !c.id.includes("addressbook#birthdays")) || [];

      items.forEach((c: any) => allCalendars.push({ ...c, primaryAccountId: mainAcc.id }));

      allCalendars.push({
        id: "google_birthdays",
        summary: "Urodziny",
        primary: false,
        primaryAccountId: mainAcc.id
      });
    }
  }
  return res.json({ connected: allCalendars.length > 0, calendars: allCalendars });
}

async function handleImport(req: NextApiRequest, res: NextApiResponse, auth: AuthContext) {
  const { calendarId, accountId } = req.body ?? {};
  if (!calendarId || !accountId) return res.status(400).json({ error: "Missing params" });

  const accessToken = await getValidGoogleToken(auth, accountId);
  if (!accessToken) return res.status(400).json({ error: "Not connected to Google Calendar" });

  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 1);
  const timeMax = new Date();
  timeMax.setFullYear(timeMax.getFullYear() + 1);

  const isBirthdayVirtual = calendarId === "google_birthdays";
  const targetCalendarId = isBirthdayVirtual ? "primary" : calendarId;

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("maxResults", "2500");
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());

  if (isBirthdayVirtual) {
    url.searchParams.set("eventTypes", "birthday");
  } else {
    url.searchParams.set("eventTypes", "default");
  }

  let allItems: any[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const fetchUrl = new URL(url.toString());
    if (pageToken) fetchUrl.searchParams.set("pageToken", pageToken);

    const r = await fetch(fetchUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!r.ok) return res.status(r.status).json({ error: "Failed to fetch from Google" });

    const data = await r.json();
    allItems.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  const sb = getServiceSupabase(auth.token);
  let imported = 0, skipped = 0;

  for (const ev of allItems) {
    if (ev.status === "cancelled" || !ev.start || !ev.end) { skipped++; continue; }
    
    const isBirthdayEvent = ev.eventType === "birthday";
    if (isBirthdayVirtual && !isBirthdayEvent) { skipped++; continue; }
    if (!isBirthdayVirtual && isBirthdayEvent) { skipped++; continue; }

    const { data: dup } = await sb.from("events")
      .select("id")
      .eq("google_event_id", ev.id)
      .eq("calendar_id", accountId) 
      .maybeSingle();
      
    if (dup) { skipped++; continue; }

    const { error } = await sb.from("events").insert({
      user_id: auth.user.id,
      calendar_id: accountId,       
      title: ev.summary || "(bez tytułu)",
      description: ev.description || "",
      start_time: toSupabaseTime(ev.start),
      end_time: toSupabaseTime(ev.end, true),
      place: ev.location || "",
      repeat: "none",
      google_event_id: ev.id,
      shared_with_id: null,
    });
    
    if (error) skipped++; else imported++;
  }
  return res.json({ imported, skipped });
}

async function handleDisconnect(req: NextApiRequest, res: NextApiResponse, auth: AuthContext) {
  const { accountId, email, subCalendarId } = req.query;
  const sb = getServiceSupabase(auth.token);
  
  if (subCalendarId) {
    const { data: cal } = await sb.from("connected_calendars")
      .select("id")
      .eq("id", subCalendarId as string)
      .eq("user_id", auth.user.id)
      .single();

    if (cal) {
      await sb.from("events").delete().eq("calendar_id", cal.id); 
      await sb.from("connected_calendars").delete().eq("id", cal.id);
    }
  } 
  else if (email) {
    const { data: cals } = await sb.from("connected_calendars")
      .select("id")
      .eq("account_email", email as string)
      .eq("user_id", auth.user.id);
      
    if (cals && cals.length > 0) {
      const ids = cals.map(c => c.id);
      await sb.from("events").delete().in("calendar_id", ids);
      await sb.from("connected_calendars").delete().in("id", ids);
    }
  } 
  else if (accountId) {
    await sb.from("events").delete().eq("calendar_id", accountId as string);
    await sb.from("connected_calendars").delete().eq("id", accountId as string).eq("user_id", auth.user.id);
  } else {
    await sb.from("connected_calendars").delete().eq("provider", "google").eq("user_id", auth.user.id);
  }
  return res.json({ ok: true });
}

async function handleExport(req: NextApiRequest, res: NextApiResponse, auth: AuthContext) {
  const { calendarId, eventIds, accountId } = req.body ?? {};
  if (!calendarId) return res.status(400).json({ error: "calendarId required" });

  const accessToken = await getValidGoogleToken(auth, accountId);
  if (!accessToken) return res.status(400).json({ error: "Not connected to Google Calendar" });

  const sb = getServiceSupabase(auth.token);
  let query = sb.from("events").select("*").eq("user_id", auth.user.id);
  if (eventIds?.length) query = query.in("id", eventIds);
  else {
    const past30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const future = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
    query = query.gte("start_time", past30).lte("start_time", future);
  }

  const { data: events, error: fetchErr } = await query;
  if (fetchErr) return res.status(500).json({ error: "Failed to fetch local events" });
  if (!events?.length) return res.json({ exported: 0, skipped: 0, message: "No events found in selected range" });

  let exported = 0, skipped = 0;
  for (const ev of events) {
    const body = { summary: ev.title, description: ev.description || "", location: ev.place || "", start: { dateTime: toRFC3339(ev.start_time), timeZone: "Europe/Warsaw" }, end: { dateTime: toRFC3339(ev.end_time), timeZone: "Europe/Warsaw" } };
    const method = ev.google_event_id ? "PUT" : "POST";
    const endpoint = ev.google_event_id ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${ev.google_event_id}` : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    const r = await fetch(endpoint, { method, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) {
      const created = await r.json();
      await sb.from("events").update({ google_event_id: created.id }).eq("id", ev.id);
      exported++;
    } else skipped++;
  }
  return res.json({ exported, skipped });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await getUserFromBearer(req);
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const { action } = req.query;
  if (action === "auth-url" && req.method === "GET") return handleAuthUrl(req, res, auth);
  if (action === "list-calendars" && req.method === "GET") return handleListCalendars(req, res, auth);
  if (action === "import" && req.method === "POST") return handleImport(req, res, auth);
  if (action === "export" && req.method === "POST") return handleExport(req, res, auth);
  if (action === "disconnect" && req.method === "DELETE") return handleDisconnect(req, res, auth);
  return res.status(404).json({ error: "Unknown action" });
}