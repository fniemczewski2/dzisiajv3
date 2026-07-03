import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAppDate, getAppDateTime } from '@/lib/dateUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Użyj POST' });

  // Pobieramy parametry z żądania HTTP (Skrót na iOS wyśle je jako JSON)
  const { secret, userId, action } = req.body;

  if (secret !== process.env.SHORTCUTS_API_SECRET) {
    return res.status(401).json({ error: 'Brak autoryzacji' });
  }
  if (!userId || !action) {
    return res.status(400).json({ error: 'Brak wymaganych danych (userId, action)' });
  }

  try {
    const now = getAppDateTime();

    if (action === 'start') {
      const { data: existing } = await supabaseAdmin
        .from('work_logs')
        .select('id')
        .eq('user_id', userId)
        .is('end_time', null) 
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Masz już otwartą sesję pracy.' });
      }

      const { data, error } = await supabaseAdmin
        .from('work_logs')
        .insert([{
          user_id: userId,
          description: "Wpis automatyczny",
          start_time: now,
        }])
        .select()
        .single();

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
        .single();

      if (fetchError || !openLog) {
        return res.status(404).json({ error: 'Brak otwartej sesji do zakończenia.' });
      }

      const { data, error } = await supabaseAdmin
        .from('work_logs')
        .update({ end_time: now })
        .eq('id', openLog.id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Zakończono pracę', data });
      
    } else {
      return res.status(400).json({ error: 'Nieznana akcja. Użyj "start" lub "end".' });
    }
  } catch (error: any) {
    console.error('Błąd worklogs auto:', error);
    return res.status(500).json({ error: error.message || 'Wystąpił błąd serwera' });
  }
}