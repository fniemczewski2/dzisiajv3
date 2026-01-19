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

  // hooks/usePushNotifications.ts
    async function subscribeToPush() {
    if (!userEmail) {
        alert('Please log in first')
        return
    }

    setLoading(true)

    try {
        const permission = await Notification.requestPermission()
        
        if (permission !== 'granted') {
        alert('Please enable notifications in your browser settings')
        setLoading(false)
        return
        }

        const registration = await navigator.serviceWorker.ready

        const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        )
        })

        const subscriptionJSON = subscription.toJSON()
        const endpoint = subscriptionJSON.endpoint

        // Check if THIS SPECIFIC DEVICE is already registered
        const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_email', userEmail)
        .eq('subscription->endpoint', endpoint)
        .single()

        if (existing) {
        // Update this device's subscription
        const { error } = await supabase
            .from('push_subscriptions')
            .update({
            subscription: subscriptionJSON,
            user_agent: navigator.userAgent,
            last_used: new Date().toISOString()
            })
            .eq('id', existing.id)

        if (error) throw error
        } else {
        // Insert new device subscription
        const { error } = await supabase
            .from('push_subscriptions')
            .insert({
            user_email: userEmail,
            subscription: subscriptionJSON,
            user_agent: navigator.userAgent
            })

        if (error) throw error
        }

        setIsSubscribed(true)
        alert('Push notifications enabled!')
    } catch (error) {
        console.error('Error subscribing to push:', error)
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
        const endpoint = subscription.toJSON().endpoint
        await subscription.unsubscribe()

        // Remove only THIS device's subscription
        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_email', userEmail)
            .eq('subscription->endpoint', endpoint)

        if (error) throw error
        }

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