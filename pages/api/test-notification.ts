// pages/api/test-notification.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('=== Test Notification API Called ===')
  console.log('Method:', req.method)
  console.log('Body:', req.body)
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userEmail, title, message, url } = req.body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ANON_KEY

    console.log('Supabase URL:', supabaseUrl)
    console.log('Has Service Role Key:', !!supabaseKey)

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing env vars')
      return res.status(500).json({ 
        error: 'Missing Supabase configuration',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      })
    }

    console.log('Calling Edge Function:', `${supabaseUrl}/functions/v1/send-push`)

    const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userEmail,
        title,
        message,
        url,
        data: { type: 'test' }
      })
    })

    console.log('Edge Function status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Edge function error:', errorText)
      return res.status(response.status).json({ 
        error: `Edge function failed: ${errorText}`,
        status: response.status
      })
    }

    const data = await response.json()
    console.log('Edge Function response:', data)

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error in test-notification:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}