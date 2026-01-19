// hooks/usePushNotifications.ts
import { useState, useEffect } from 'react';

// Helper do konwersji klucza VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | null;
  subscription: PushSubscription | null;
  isSubscribed: boolean;
  error: string | null;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  isStandalone: boolean;
  isLoading: boolean;
}

export interface NotificationOptions {
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: null,
    subscription: null,
    isSubscribed: false,
    error: null,
    platform: 'unknown',
    isStandalone: false,
    isLoading: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detekcja platformy
    const ua = navigator.userAgent.toLowerCase();
    let platform: PushNotificationState['platform'] = 'unknown';
    if (/iphone|ipad|ipod/.test(ua)) platform = 'ios';
    else if (/android/.test(ua)) platform = 'android';
    else if (/windows|macintosh|linux/.test(ua)) platform = 'desktop';

    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;

    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const isSupported = hasServiceWorker && hasPushManager;

    setState(prev => ({
      ...prev,
      platform,
      isStandalone,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied',
    }));

    if (isSupported) {
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('Existing subscription found:', subscription.endpoint);
        setState(prev => ({ ...prev, subscription, isSubscribed: true }));
      } else {
        console.log('No existing subscription');
      }
    } catch (error) {
      console.error('Błąd sprawdzania subskrypcji:', error);
    }
  };

  const requestPermission = async () => {
    try {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      setState(prev => ({ ...prev, permission }));
      return permission;
    } catch (error) {
      console.error('Błąd uprawnień:', error);
      return 'denied';
    }
  };

  const subscribe = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('Starting subscription process...');
      console.log('Platform:', state.platform, 'Standalone:', state.isStandalone);
      
      if (state.platform === 'ios' && !state.isStandalone) {
        throw new Error('Na iPhone wymagane dodanie do ekranu głównego (PWA).');
      }

      if (Notification.permission !== 'granted') {
        console.log('Requesting permission...');
        const perm = await requestPermission();
        if (perm !== 'granted') throw new Error('Brak uprawnień.');
      }

      console.log('Getting service worker registration...');
      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker ready');
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.error('VAPID key not found in environment');
        console.error('Available env vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC')));
        throw new Error('Brak klucza VAPID.');
      }

      console.log('VAPID key found:', vapidPublicKey.substring(0, 10) + '...');
      console.log('Subscribing to push manager...');
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('Push subscription created:', subscription.endpoint);

      // Zapisz na serwerze
      console.log('Saving subscription to server...');
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      console.log('Server response status:', response.status);
      const data = await response.json();
      console.log('Server response data:', data);
      
      if (!response.ok) {
        console.error('Server error:', data);
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      console.log('Subscription saved successfully!');
      setState(prev => ({ ...prev, subscription, isSubscribed: true, isLoading: false }));

    } catch (error) {
      console.error('Subscribe error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Błąd subskrypcji',
        isLoading: false
      }));
      // Don't throw - let the component handle the error via state
    }
  };

  const unsubscribe = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      console.log('Unsubscribing...');
      
      if (state.subscription) {
        console.log('Sending unsubscribe request to server...');
        const response = await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: state.subscription.endpoint }),
        });
        
        if (response.ok) {
          console.log('Server unsubscribe successful');
        } else {
          console.warn('Server unsubscribe failed:', await response.text());
        }
        
        console.log('Unsubscribing from push manager...');
        await state.subscription.unsubscribe();
        console.log('Unsubscribed successfully');
      }
      
      setState(prev => ({ ...prev, subscription: null, isSubscribed: false, isLoading: false }));
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setState(prev => ({ ...prev, error: 'Błąd odsubskrybowania', isLoading: false }));
    }
  };

  const sendTestNotification = async () => {
    console.log('Sending test notification via server...');
    
    try {
      const response = await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      console.log('Test notification response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test notification');
      }

      console.log('Test notification sent successfully!');
    } catch (error) {
      console.error('Test notification error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Błąd wysyłania testowego powiadomienia' 
      }));
    }
  };

  // Enhanced scheduleNotification with more options
  const scheduleNotification = (
    title: string, 
    body: string, 
    delay: number, 
    options?: NotificationOptions
  ) => {
    if (state.permission !== 'granted') return;

    setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          body,
          icon: options?.icon || '/icon-192x192.png',
          badge: options?.badge || '/icon-192x192.png',
          tag: options?.tag || `scheduled-${Date.now()}`,
          data: {
            url: options?.url || '/',
            dateOfArrival: Date.now(),
          },
          requireInteraction: options?.requireInteraction || false,
        });
      } catch (error) {
        console.error('Błąd wysyłania zaplanowanego powiadomienia:', error);
      }
    }, delay);
  };

  // Send immediate notification
  const sendNotification = async (
    title: string,
    body: string,
    options?: NotificationOptions
  ) => {
    if (state.permission !== 'granted') return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: options?.icon || '/icon-192x192.png',
        badge: options?.badge || '/icon-192x192.png',
        tag: options?.tag,
        data: {
          url: options?.url || '/',
          dateOfArrival: Date.now(),
        },
        requireInteraction: options?.requireInteraction || false,
      });
    } catch (error) {
      console.error('Błąd wysyłania powiadomienia:', error);
    }
  };

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    scheduleNotification,
    sendNotification,
  };
}