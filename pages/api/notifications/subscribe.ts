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
  console.log('Headers:', Object.keys(req.headers));
  console.log('Cookies:', Object.keys(req.cookies));

  try {
    // Create Supabase client with proper auth
    const supabaseClient = createPagesServerClient({ req, res });
    
    // Try to get session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    console.log('Session check:', session ? 'Found' : 'Not found', sessionError);
    
    let userEmail: string | undefined;

    // Method 1: From session
    if (session?.user?.email) {
      userEmail = session.user.email;
      console.log('User email from session:', userEmail);
    } 
    // Method 2: From getUser (cookie-based)
    else {
      console.log('No session, trying getUser...');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      console.log('GetUser result:', user ? user.email : 'Not found', userError);
      
      if (user?.email) {
        userEmail = user.email;
        console.log('User email from getUser:', userEmail);
      }
    }

    // Method 3: Last resort - check cookies directly
    if (!userEmail) {
      console.log('Trying to extract from cookies...');
      const authToken = req.cookies['sb-access-token'] || 
                       req.cookies['sb-auth-token'] ||
                       req.cookies['supabase-auth-token'];
      console.log('Auth token found:', !!authToken);
      
      if (authToken) {
        try {
          // Try to verify token with Supabase
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(authToken);
          if (user?.email) {
            userEmail = user.email;
            console.log('User email from token:', userEmail);
          } else {
            console.log('Token verification failed:', error);
          }
        } catch (error) {
          console.error('Error verifying token:', error);
        }
      }
    }

    if (!userEmail) {
      console.error('No user email found after all attempts');
      console.error('Session:', !!session);
      console.error('Cookies:', Object.keys(req.cookies));
      return res.status(401).json({ 
        error: 'User not authenticated',
        debug: {
          hasSession: !!session,
          hasCookies: Object.keys(req.cookies).length > 0,
          cookieNames: Object.keys(req.cookies),
        }
      });
    }

    console.log('Authenticated as:', userEmail);

    const subscription = req.body;
    console.log('Subscription endpoint:', subscription.endpoint?.substring(0, 50) + '...');

    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      console.error('Invalid subscription object:', subscription);
      return res.status(400).json({ 
        error: 'Invalid subscription data',
        received: {
          hasEndpoint: !!subscription.endpoint,
          hasKeys: !!subscription.keys,
          hasP256dh: !!subscription.keys?.p256dh,
          hasAuth: !!subscription.keys?.auth,
        }
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
        hint: error.hint,
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
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    });
  }
}