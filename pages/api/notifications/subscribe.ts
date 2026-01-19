// pages/api/notifications/subscribe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== Subscribe API Called ===');
  console.log('Cookies:', Object.keys(req.cookies).length, 'cookies found');

  try {
    // IMPORTANT: Use createPagesServerClient - it reads session from cookies automatically
    const supabaseClient = createPagesServerClient({ req, res });
    
    // Get the session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    console.log('Session check:', session ? `Found (${session.user.email})` : 'Not found');
    if (sessionError) {
      console.error('Session error:', sessionError);
    }
    
    let userEmail: string | undefined;

    if (session?.user?.email) {
      userEmail = session.user.email;
      console.log('User email from session:', userEmail);
    } else {
      // Fallback: try getUser
      console.log('No session, trying getUser...');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (user?.email) {
        userEmail = user.email;
        console.log('User email from getUser:', userEmail);
      } else {
        console.error('GetUser failed:', userError);
      }
    }

    if (!userEmail) {
      console.error('No user email found');
      console.error('Available cookies:', Object.keys(req.cookies));
      return res.status(401).json({ 
        error: 'User not authenticated',
        debug: {
          availableCookies: Object.keys(req.cookies),
          hasSession: !!session,
        }
      });
    }

    const subscription = req.body;
    console.log('Subscription endpoint:', subscription.endpoint?.substring(0, 50) + '...');

    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      console.error('Invalid subscription object');
      return res.status(400).json({ 
        error: 'Invalid subscription data',
        required: ['endpoint', 'keys.p256dh', 'keys.auth'],
      });
    }

    // Save to database using service role (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Saving to database...');
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
      })
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        error: 'Failed to save subscription', 
        details: error.message,
        code: error.code,
      });
    }

    console.log('Subscription saved successfully');
    console.log('Data:', data);

    res.status(201).json({ 
      success: true,
      message: 'Subscription saved successfully', 
      userEmail,
      subscriptionId: data?.[0]?.id,
    });
  } catch (error) {
    console.error('Error in subscribe handler:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}