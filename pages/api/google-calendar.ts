// pages/api/google-calendar.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

function getRedirectUri(req: NextApiRequest): string {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host || "localhost:3000";
  const proto =
    req.headers["x-forwarded-proto"] === "https" ||
    String(host).includes("vercel.app") ||
    (!String(host).startsWith("localhost") && !String(host).startsWith("127."))
      ? "https"
      : "http";
  return `${proto}://${host}/api/google-calendar/callback`;
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getUserFromBearer(req: NextApiRequest) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { user, token };
}

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


async function getValidGoogleToken(userId: string): Promise<string | null> {
  const sb = getServiceSupabase();
  const { data } = await sb
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  if (data.expires_at && Date.now() < new Date(data.expires_at).getTime() - 60_000) {
    return data.access_token;
  }

  if (!data.refresh_token) return null;
  const fresh = await refreshGoogleToken(data.refresh_token);
  if (!fresh) return null;

  await sb
    .from("google_calendar_tokens")
    .update({ access_token: fresh, expires_at: new Date(Date.now() + 3600_000).toISOString() })
    .eq("user_id", userId);

  return fresh;
}

const toSupabaseTime = (dt: { dateTime?: string; date?: string } | undefined): string => {
  if (!dt) return new Date().toISOString().slice(0, 19) + "+00";
  if (dt.dateTime) {
    const d = new Date(dt.dateTime);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}+00`;
  }
  if (dt.date) return `${dt.date}T00:00:00+00`;
  return new Date().toISOString().slice(0, 19) + "+00";
};

const toRFC3339 = (ts: string): string => {
  try {
    return new Date(ts.replace(" ", "T").replace(/\+00$/, "")).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;

  if (action === "auth-url" && req.method === "GET") {
    const auth = await getUserFromBearer(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const redirectUri = getRedirectUri(req);

    const state = Buffer.from(
      JSON.stringify({ userId: auth.user.id, token: auth.token })
    ).toString("base64url");

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    return res.json({ url: url.toString(), redirectUri });
  }


  if (action === "list-calendars" && req.method === "GET") {
    const auth = await getUserFromBearer(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const sb = getServiceSupabase();
    const { data: row } = await sb
      .from("google_calendar_tokens")
      .select("user_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!row) return res.json({ connected: false });

    const accessToken = await getValidGoogleToken(auth.user.id);
    if (!accessToken) return res.json({ connected: false });

    const r = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (r.status === 401) return res.json({ connected: false });
    if (!r.ok) return res.status(r.status).json({ error: "Google Calendar API error" });

    const data = await r.json();
    return res.json({ connected: true, calendars: data.items ?? [] });
  }

  if (action === "import" && req.method === "POST") {
    const auth = await getUserFromBearer(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const { calendarId, timeMin, timeMax } = req.body ?? {};
    if (!calendarId) return res.status(400).json({ error: "calendarId required" });

    const accessToken = await getValidGoogleToken(auth.user.id);
    if (!accessToken) return res.status(400).json({ error: "Not connected to Google Calendar" });

    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    );
    url.searchParams.set("timeMin", timeMin || new Date().toISOString());
    url.searchParams.set("timeMax", timeMax || new Date(Date.now() + 90 * 86_400_000).toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("orderBy", "startTime");

    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) return res.status(r.status).json({ error: "Failed to fetch events from Google" });

    const { items = [] } = await r.json();
    const sb = getServiceSupabase();
    let imported = 0, skipped = 0;

    for (const ev of items as any[]) {
      if (ev.status === "cancelled" || !ev.start || !ev.end) { skipped++; continue; }

      const { data: dup } = await sb
        .from("events")
        .select("id")
        .eq("google_event_id", ev.id)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (dup) { skipped++; continue; }

      const { error } = await sb.from("events").insert({
        user_id: auth.user.id,
        title: ev.summary || "(bez tytułu)",
        description: ev.description || "",
        start_time: toSupabaseTime(ev.start),
        end_time: toSupabaseTime(ev.end),
        place: ev.location || "",
        repeat: "none",
        google_event_id: ev.id,
        shared_with_id: null,
      });
      if (!error) imported++; else skipped++;
    }

    return res.json({ imported, skipped, total: items.length });
  }

  if (action === "export" && req.method === "POST") {
    const auth = await getUserFromBearer(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const { calendarId, eventIds } = req.body ?? {};
    if (!calendarId) return res.status(400).json({ error: "calendarId required" });

    const accessToken = await getValidGoogleToken(auth.user.id);
    if (!accessToken) return res.status(400).json({ error: "Not connected to Google Calendar" });

    const sb = getServiceSupabase();
    let query = sb.from("events").select("*").eq("user_id", auth.user.id);
    if (eventIds?.length) {
      query = query.in("id", eventIds);
    } else {
      const now = new Date().toISOString().slice(0, 10);
      const future = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
      query = query.gte("start_time", now).lte("start_time", future);
    }

    const { data: events } = await query;
    if (!events?.length) return res.json({ exported: 0, skipped: 0 });

    let exported = 0, skipped = 0;

    for (const ev of events) {
      const body = {
        summary: ev.title,
        description: ev.description || "",
        location: ev.place || "",
        start: { dateTime: toRFC3339(ev.start_time), timeZone: "Europe/Warsaw" },
        end: { dateTime: toRFC3339(ev.end_time), timeZone: "Europe/Warsaw" },
      };

      const method = ev.google_event_id ? "PUT" : "POST";
      const endpoint = ev.google_event_id
        ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${ev.google_event_id}`
        : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

      const r = await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (r.ok) {
        const created = await r.json();
        await sb.from("events").update({ google_event_id: created.id }).eq("id", ev.id);
        exported++;
      } else {
        console.error("[export] Google API error:", r.status, await r.text());
        skipped++;
      }
    }

    return res.json({ exported, skipped });
  }

  if (action === "disconnect" && req.method === "DELETE") {
    const auth = await getUserFromBearer(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    await getServiceSupabase()
      .from("google_calendar_tokens")
      .delete()
      .eq("user_id", auth.user.id);

    return res.json({ ok: true });
  }

  return res.status(404).json({ error: "Unknown action" });
}