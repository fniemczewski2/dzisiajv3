import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '../../../utils/supabase/server';
import { fetchAllEvents } from '../../../lib/calendarAggregator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabase(req, res);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { timeMin, timeMax } = req.query;
  if (!timeMin || !timeMax) return res.status(400).json({ error: 'Missing time range' });

  try {
    const events = await fetchAllEvents(session.user.id, timeMin as string, timeMax as string, req, res);
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}