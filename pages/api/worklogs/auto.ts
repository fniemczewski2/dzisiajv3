import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAppDateTime } from '@/lib/dateUtils';
import crypto from 'node:crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { secret, userId, action } = req.body;
  const expectedSecret = process.env.SHORTCUTS_API_SECRET;
  
  if (!expectedSecret) {
    console.error("[SHORTCUTS] No SHORTCUTS_API_SECRET defined.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  const providedSecret = secret || "";

  if (
    expectedSecret.length !== providedSecret.length || 
    !crypto.timingSafeEqual(Buffer.from(expectedSecret), Buffer.from(providedSecret))
  ) {
    return res.status(401).json({ error: `Unauthorized.` });
  }

  if (!userId || !action) {
    return res.status(400).json({ error: 'No required data.' });
  }

  try {
    const now = getAppDateTime();

    if (action === 'start') {
      const { data: existing } = await supabaseAdmin
        .from('work_logs')
        .select('id')
        .eq('user_id', userId)
        .is('end_time', null) 
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: 'Open work log found.' });
      }

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
      return res.status(200).json({ success: true, message: 'Rozpoczęto pracę', data });
      
    } else if (action === 'end') {
      const { data: openLog, error: fetchError } = await supabaseAdmin
        .from('work_logs')
        .select('*')
        .eq('user_id', userId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !openLog) {
        return res.status(404).json({ error: 'No open work log found.' });
      }

      const { data, error } = await supabaseAdmin
        .from('work_logs')
        .update({ end_time: now })
        .eq('id', openLog.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Zakończono pracę', data });
      
    } else {
      return res.status(400).json({ error: 'Unknown action.' });
    }
  } catch (error: any) {
    console.error('Błąd worklogs auto:', error);
    return res.status(500).json({ error: error.message || 'Server error.' });
  }
}