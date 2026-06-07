import { createServerSupabase } from '../utils/supabase/server';

export interface UnifiedEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  place?: string;
  provider: 'google' | 'outlook' | 'local';
  accountEmail: string;
  user_id: string;
  repeat: 'none' | 'weekly' | 'monthly' | 'yearly';
}

async function refreshOutlookToken(account: any, supabase: any) {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const tokens = await res.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabase.from('connected_calendars').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
  }).eq('id', account.id);
  return tokens.access_token;
}

async function refreshGoogleToken(account: any, supabase: any) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const tokens = await res.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabase.from('connected_calendars').update({
    access_token: tokens.access_token,
    expires_at: expiresAt,
  }).eq('id', account.id);
  return tokens.access_token;
}

async function ensureValidToken(account: any, supabase: any) {
  if (new Date(account.expires_at) < new Date()) {
    if (account.provider === 'outlook') return await refreshOutlookToken(account, supabase);
    if (account.provider === 'google') return await refreshGoogleToken(account, supabase);
  }
  return account.access_token;
}

async function fetchOutlookEvents(accessToken: string, timeMin: string, timeMax: string, email: string, userId: string): Promise<UnifiedEvent[]> {
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${timeMin}&endDateTime=${timeMax}&$top=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.value.map((event: any) => ({
    id: event.id,
    title: event.subject,
    start_time: event.start.dateTime + 'Z',
    end_time: event.end.dateTime + 'Z',
    description: event.bodyPreview || "",
    place: event.location?.displayName || "",
    provider: 'outlook',
    accountEmail: email,
    user_id: userId,
    repeat: 'none', 
  }));
}

async function fetchGoogleEvents(accessToken: string, timeMin: string, timeMax: string, email: string, userId: string): Promise<UnifiedEvent[]> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items.map((event: any) => ({
    id: event.id,
    title: event.summary || "(bez tytułu)",
    start_time: event.start.dateTime || event.start.date,
    end_time: event.end.dateTime || event.end.date,
    description: event.description || "",
    place: event.location || "",
    provider: 'google',
    accountEmail: email,
    user_id: userId,
    repeat: 'none', 
  }));
}

export async function fetchAllEvents(userId: string, timeMin: string, timeMax: string, req: any, res: any): Promise<UnifiedEvent[]> {
  const supabase = createServerSupabase(req, res);
  
  const { data: localEvents } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', timeMin)
    .lte('start_time', timeMax);

  const mappedLocal: UnifiedEvent[] = (localEvents || []).map((ev: any) => ({
    id: ev.id,
    title: ev.title,
    start_time: ev.start_time,
    end_time: ev.end_time,
    description: ev.description,
    place: ev.place,
    provider: 'local',
    accountEmail: 'local',
    user_id: ev.user_id,
    repeat: ev.repeat || 'none',
  }));

  const { data: accounts } = await supabase.from('connected_calendars').select('*').eq('user_id', userId);
  
  if (!accounts || accounts.length === 0) {
    return mappedLocal.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  const eventsPromises = accounts.map(async (account) => {
    try {
      const token = await ensureValidToken(account, supabase);
      if (account.provider === 'outlook') return await fetchOutlookEvents(token, timeMin, timeMax, account.account_email, userId);
      if (account.provider === 'google') return await fetchGoogleEvents(token, timeMin, timeMax, account.account_email, userId);
    } catch (e) {
      console.error(e);
      return [];
    }
    return [];
  });

  const allEventsArrays = await Promise.all(eventsPromises);
  const unifiedEvents = [...mappedLocal, ...allEventsArrays.flat()];
  return unifiedEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}