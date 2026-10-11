// pages/api/worklogs/auto.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAppDateTime } from '@/lib/dateUtils';
import { looksLikeShortcutToken } from '@/lib/server/shortcutTokens';
import { extractShortcutToken, resolveShortcutUser } from '@/lib/server/shortcutAuth';
import { checkRateLimit, clientIp } from '@/lib/server/rateLimit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

interface ActionResult {
  status: number;
  body: Record<string, unknown>;
}

async function handleStart(userId: string, now: ReturnType<typeof getAppDateTime>): Promise<ActionResult> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('work_logs')
    .select('id')
    .eq('user_id', userId)
    .is('end_time', null)
    .limit(1);

  if (existingError) throw existingError;
  if (existing && existing.length > 0) return { status: 400, body: { error: 'Masz już rozpoczęty wpis czasu pracy.' } };

  const { data, error } = await supabaseAdmin
    .from('work_logs')
    .insert([{
      user_id: userId,
      description: "Wpis automatyczny",
      start_time: now,
    }])
    .select()
    .maybeSingle();

  if (error) throw error;
  return { status: 200, body: { success: true, message: 'Rozpoczęto pracę', data } };
}

async function handleEnd(userId: string, now: ReturnType<typeof getAppDateTime>): Promise<ActionResult> {
  const { data: openLog, error: fetchError } = await supabaseAdmin
    .from('work_logs')
    .select('*')
    .eq('user_id', userId)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !openLog) return { status: 404, body: { error: 'Brak rozpoczętego wpisu czasu pracy.' } };

  const { data, error } = await supabaseAdmin
    .from('work_logs')
    .update({ end_time: now })
    .eq('id', openLog.id)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return { status: 200, body: { success: true, message: 'Zakończono pracę', data } };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda niedozwolona.' });

  if (!checkRateLimit(`worklogs-auto:${clientIp(req)}`, 30, 60_000)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.' });
  }

  const token = extractShortcutToken(req);
  if (!looksLikeShortcutToken(token)) {
    return res.status(401).json({ error: 'Brak autoryzacji.' });
  }

  const { action } = (req.body ?? {}) as { action?: unknown };
  if (action !== 'start' && action !== 'end') {
    return res.status(400).json({ error: 'Nieznana akcja.' });
  }

  try {
    const userId = await resolveShortcutUser(supabaseAdmin, token);
    if (!userId) return res.status(401).json({ error: 'Brak autoryzacji.' });

    const now = getAppDateTime();
    const result = action === 'start' ? await handleStart(userId, now) : await handleEnd(userId, now);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Błąd worklogs auto:', error);
    return res.status(500).json({ error: 'Błąd serwera.' });
  }
}
