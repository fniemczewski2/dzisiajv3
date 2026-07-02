import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nieobsługiwana. Użyj POST.' });
  }

  const { secret, userId, description = "Praca w biurze", startTime, endTime } = req.body;

  if (secret !== process.env.SHORTCUTS_API_SECRET) {
    return res.status(401).json({ error: 'Brak autoryzacji - nieprawidłowy kod' });
  }

  // 2. Sprawdzenie, czy przesłano wymagane dane
  if (!userId || !startTime || !endTime) {
    return res.status(400).json({ error: 'Brak wymaganych danych (userId, startTime, endTime)' });
  }

  try {
    // 3. Zapis do bazy danych
    const { data, error } = await supabaseAdmin
      .from('work_logs')
      .insert([
        {
          user_id: userId,
          description,
          start_time: startTime,
          end_time: endTime,
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Błąd podczas automatycznego logowania pracy:', error);
    return res.status(500).json({ error: error.message || 'Wystąpił błąd serwera' });
  }
}