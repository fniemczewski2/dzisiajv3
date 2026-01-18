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
    // Próbuj pobrać sesję użytkownika
    const supabaseClient = createPagesServerClient({ req, res });
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    let userEmail: string | undefined;

    if (session?.user?.email) {
      userEmail = session.user.email;
    } else {
      // Fallback: użyj cookie auth jeśli dostępny
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user?.email) {
        userEmail = user.email;
      }
    }

    if (!userEmail) {
      console.error('No user email found in session or cookie');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const subscription = req.body;

    // Zapisz subskrypcję do Supabase używając service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_email: userEmail,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_email,endpoint'
      });

    if (error) {
      console.error('Error saving subscription:', error);
      return res.status(500).json({ error: 'Failed to save subscription', details: error.message });
    }

    res.status(201).json({ 
      message: 'Subscription saved successfully', 
      userEmail,
      data 
    });
  } catch (error) {
    console.error('Error in subscribe handler:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
