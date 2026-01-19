// hooks/usePushNotifications.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function usePushNotifications(userEmail: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/custom-sw.js').then(() => {
        console.log('Service Worker registered')
        checkSubscription()
      })
    }
  }, [])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator) || !userEmail) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    setIsSubscribed(!!subscription)
  }

  async function subscribeToPush() {
    if (!userEmail) {
      alert('Please log in first')
      return
    }

    setLoading(true)

    try {
      // Request notification permission
      const permission = await Notification.requestPermission()
      
      if (permission !== 'granted') {
        alert('Please enable notifications in your browser settings')
        setLoading(false)
        return
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        )
      })

      // Save subscription to Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_email: userEmail,
          subscription: subscription.toJSON(),
          user_agent: navigator.userAgent
        }, {
          onConflict: 'user_email'
        })

      if (error) throw error

      setIsSubscribed(true)
      alert('Push notifications enabled!')
    } catch (error) {
      console.error('Error subscribing to push:', error)
      alert('Failed to enable push notifications')
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribeFromPush() {
    setLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      // Remove from Supabase
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_email', userEmail)

      setIsSubscribed(false)
      alert('Push notifications disabled')
    } catch (error) {
      console.error('Error unsubscribing:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    isSubscribed,
    loading,
    subscribeToPush,
    unsubscribeFromPush
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}