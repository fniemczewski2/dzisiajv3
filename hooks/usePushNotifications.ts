import { useState, useEffect } from 'react';

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | null;
  subscription: PushSubscription | null;
  isSubscribed: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: null,
    subscription: null,
    isSubscribed: false,
    error: null,
  });

  // Sprawdź wsparcie dla powiadomień
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setState(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
      }));
    }
  }, []);

  // Zarejestruj Service Worker
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered:', registration);
      
      // Poczekaj aż Service Worker będzie aktywny
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Nie udało się zarejestrować Service Workera',
      }));
      return null;
    }
  };

  // Poproś o uprawnienia
  const requestPermission = async (): Promise<NotificationPermission> => {
    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      return permission;
    } catch (error) {
      console.error('Error requesting permission:', error);
      setState(prev => ({
        ...prev,
        error: 'Nie udało się uzyskać uprawnień do powiadomień',
      }));
      return 'denied';
    }
  };

  // Subskrybuj powiadomienia z VAPID
  const subscribe = async (): Promise<PushSubscription | null> => {
    try {
      // Najpierw sprawdź uprawnienia
      let permission = state.permission;
      if (permission !== 'granted') {
        permission = await requestPermission();
        if (permission !== 'granted') {
          setState(prev => ({
            ...prev,
            error: 'Uprawnienia do powiadomień zostały odrzucone',
          }));
          return null;
        }
      }

      // Zarejestruj Service Worker
      const registration = await registerServiceWorker();
      if (!registration) return null;

      // Sprawdź czy już istnieje subskrypcja
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('VAPID public key not found. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to .env.local');
        }
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });
        
        // Zapisz subskrypcję do serwera
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription),
        });
      }

      setState(prev => ({
        ...prev,
        subscription,
        isSubscribed: true,
        error: null,
      }));

      console.log('Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Nie udało się zasubskrybować powiadomień',
      }));
      return null;
    }
  };

  // Odsubskrybuj powiadomienia
  const unsubscribe = async (): Promise<boolean> => {
    try {
      if (state.subscription) {
        // Usuń subskrypcję z serwera
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: state.subscription.endpoint }),
        });
        
        // Usuń subskrypcję z przeglądarki
        await state.subscription.unsubscribe();
        
        setState(prev => ({
          ...prev,
          subscription: null,
          isSubscribed: false,
          error: null,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setState(prev => ({
        ...prev,
        error: 'Nie udało się odsubskrybować powiadomień',
      }));
      return false;
    }
  };

  // Wyślij testowe powiadomienie (lokalne)
  const sendTestNotification = async () => {
    if (!state.isSupported || state.permission !== 'granted') {
      await requestPermission();
      return;
    }

    try {
      // Wyślij bezpośrednie lokalne powiadomienie
      new Notification('Dzisiaj - Test', {
        body: 'Powiadomienia działają poprawnie! 🎉',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
      });
      
      console.log('Test notification sent successfully');
    } catch (error) {
      console.error('Error sending test notification:', error);
      setState(prev => ({
        ...prev,
        error: 'Nie udało się wysłać testowego powiadomienia',
      }));
    }
  };

  // Zaplanuj powiadomienie (lokalne, bez serwera)
  const scheduleNotification = (title: string, body: string, delay: number) => {
    setTimeout(() => {
      if (state.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
        });
      }
    }, delay);
  };

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    scheduleNotification,
    registerServiceWorker,
  };
}

// Helper function do konwersji VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}