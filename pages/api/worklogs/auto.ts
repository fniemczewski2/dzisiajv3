// pages/api/worklogs/auto.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAppDateTime } from '@/lib/dateUtils';
import { getErrorMessage } from '@/lib/errorUtils';
import { validateUuid } from '@/lib/sanitize';
import crypto from 'node:crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

function verifyShortcutsSecret(req: NextApiRequest, expectedSecret: string): boolean {
  const headerSecret = req.headers['x-api-secret'];
  const providedSecret =
    (typeof headerSecret === 'string' ? headerSecret : '') ||
    (typeof req.body?.secret === 'string' ? req.body.secret : '');

  const expectedHash = crypto.createHash('sha256').update(expectedSecret).digest();
  const providedHash = crypto.createHash('sha256').update(providedSecret).digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
}

interface ActionResult {
  status: number;
  body: Record<string, unknown>;
}

async function handleStart(userId: string, now: ReturnType<typeof getAppDateTime>): Promise<ActionResult> {
  const { data: existing } = await supabaseAdmin
    .from('work_logs')
    .select('id')
    .eq('user_id', userId)
    .is('end_time', null)
    .maybeSingle();

  if (existing) return { status: 400, body: { error: 'Open work log found.' } };

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

  if (fetchError || !openLog) return { status: 404, body: { error: 'No open work log found.' } };

  const { data, error } = await supabaseAdmin
    .from('work_logs')
    .update({ end_time: now })
    .eq('id', openLog.id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return { status: 200, body: { success: true, message: 'Zakończono pracę', data } };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { userId, action } = req.body ?? {};

  const expectedSecret = process.env.SHORTCUTS_API_SECRET;
  if (!expectedSecret) {
    console.error("[SHORTCUTS] No SHORTCUTS_API_SECRET defined.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  if (!verifyShortcutsSecret(req, expectedSecret)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const validUserId = validateUuid(userId);
  if (!validUserId || !action) {
    return res.status(400).json({ error: 'No required data.' });
  }

  try {
    const now = getAppDateTime();

    if (action === 'start') {
      const result = await handleStart(validUserId, now);
      return res.status(result.status).json(result.body);
    }
    if (action === 'end') {
      const result = await handleEnd(validUserId, now);
      return res.status(result.status).json(result.body);
    }
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (error) {
    console.error('Błąd worklogs auto:', error);
    return res.status(500).json({ error: getErrorMessage(error, 'Server error.') });
  }
}
