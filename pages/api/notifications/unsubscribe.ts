import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Próbuj pobrać email użytkownika z sesji (opcjonalnie)
    const supabaseClient = createPagesServerClient({ req, res });
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    let userEmail: string | undefined;
    if (session?.user?.email) {
      userEmail = session.user.email;
    } else {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user?.email) {
        userEmail = user.email;
      }
    }

    // Usuń subskrypcję z Supabase używając service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Buduj query - jeśli mamy email, dodaj jako dodatkowy warunek bezpieczeństwa
    let query = supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);
    
    // Opcjonalnie: dodaj warunek na email dla dodatkowego bezpieczeństwa
    if (userEmail) {
      query = query.eq('user_email', userEmail);
    }

    const { error, count } = await query;

    if (error) {
      console.error('Error deleting subscription:', error);
      return res.status(500).json({ 
        error: 'Failed to delete subscription',
        details: error.message 
      });
    }

    res.status(200).json({ 
      message: 'Subscription deleted successfully',
      deletedCount: count,
      userEmail: userEmail || 'unknown'
    });
  } catch (error) {
    console.error('Error in unsubscribe handler:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
