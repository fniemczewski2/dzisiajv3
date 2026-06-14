import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Nieautoryzowane wywołanie" });
  }

  try {
    // 1. Pobierz absolutnie wszystkie konta Google z bazy danych
    const { data: accounts, error: dbError } = await supabaseService
      .from("connected_calendars")
      .select("*")
      .eq("provider", "google");

    if (dbError) throw dbError;
    if (!accounts || accounts.length === 0) return res.json({ message: "Brak kont do synchronizacji" });

    let totalImported = 0;

    for (const acc of accounts) {
      if (!acc.refresh_token) continue;
      if (acc.google_calendar_id === '@account_connection') continue; 

      const accessToken = await refreshGoogleToken(acc.refresh_token);

      // Definiujemy okno czasowe synchronizacji (np. od dziś do 30 dni w przód)
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 86_400_000).toISOString();
      // POPRAWIONE: dynamiczny calendar ID zamiast sztywnego 'primary'
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(acc.google_calendar_id || 'primary')}/events`);
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("singleEvents", "true");

      const googleRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!googleRes.ok) continue;
      const { items = [] } = await googleRes.json();

      for (const ev of items) {
        if (ev.status === "cancelled" || !ev.start || !ev.end) continue;

        // POPRAWIONE: sprawdzanie po konkretnym kalendarzu
        const { data: dup } = await supabaseService
          .from("events")
          .select("id")
          .eq("google_event_id", ev.id)
          .eq("calendar_id", acc.id) 
          .maybeSingle();

        if (dup) continue;

        await supabaseService.from("events").insert({
          user_id: acc.user_id,
          calendar_id: acc.id, // POPRAWIONE: dodana właściwa relacja
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
      
      await supabaseService.from("connected_calendars")
        .update({ access_token: accessToken, expires_at: new Date(Date.now() + 3600000).toISOString() })
        .eq("id", acc.id);
    }

    return res.json({ success: true, imported: totalImported });
  } catch (error: any) {
    console.error("[CRON ERROR]:", error);
    return res.status(500).json({ error: error.message });
  }
}