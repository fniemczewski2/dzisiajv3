import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userEmail, title, message, url } = req.body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Call Supabase Edge Function to send push
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Edge function error:', errorText)
      throw new Error(`Failed to send notification: ${response.status}`)
    }

    const data = await response.json()

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error sending test notification:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send test notification'
    })
  }
}