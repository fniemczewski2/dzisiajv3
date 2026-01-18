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
        setState(prev => ({ ...prev, subscription, isSubscribed: true }));
      }
    } catch (error) {
      console.error('Błąd subskrypcji:', error);
    }
  };

  // NAPRAWA 1: Wrapper na funkcję uprawnień, aby pasował do onClick
  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
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
      if (state.platform === 'ios' && !state.isStandalone) {
        throw new Error('Na iPhone wymagane dodanie do ekranu głównego (PWA).');
      }

      if (Notification.permission !== 'granted') {
        const perm = await requestPermission();
        if (perm !== 'granted') throw new Error('Brak uprawnień.');
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) throw new Error('Brak klucza VAPID.');

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Zapisz na serwerze
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      setState(prev => ({ ...prev, subscription, isSubscribed: true, isLoading: false }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Błąd subskrypcji',
        isLoading: false
      }));
    }
  };

  const unsubscribe = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      if (state.subscription) {
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: state.subscription.endpoint }),
        });
        await state.subscription.unsubscribe();
      }
      setState(prev => ({ ...prev, subscription: null, isSubscribed: false, isLoading: false }));
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Błąd odsubskrybowania', isLoading: false }));
    }
  };

  const sendTestNotification = async () => {
    if (state.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      // Używamy registration.showNotification zamiast new Notification dla lepszego wsparcia mobilnego
      registration.showNotification("Test PWA", {
        body: "To jest testowe powiadomienie.",
        icon: "/icon-192x192.png",
      });
    }
  };

  // NAPRAWA 2: Przywrócenie scheduleNotification
  const scheduleNotification = (title: string, body: string, delay: number) => {
    if (state.permission !== 'granted') return;

    setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          body,
          icon: '/icon-192x192.png',
          tag: `scheduled-${Date.now()}`
        });
      } catch (error) {
        console.error('Błąd wysyłania zaplanowanego powiadomienia:', error);
      }
    }, delay);
  };

  return {
    ...state,
    requestPermission, // Teraz to jest nasza funkcja wrapper, a nie native API
    subscribe,
    unsubscribe,
    sendTestNotification,
    scheduleNotification, // Dodane z powrotem do return
  };
}