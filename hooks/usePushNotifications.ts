// hooks/usePushNotifications.ts
// Cross-platform push notifications (Android, Desktop, iOS)

import { useState, useEffect } from 'react';

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | null;
  subscription: PushSubscription | null;
  isSubscribed: boolean;
  error: string | null;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  isStandalone: boolean;
}

function detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  
  if (/windows|macintosh|linux/.test(ua)) {
    return 'desktop';
  }
  
  if (/android/.test(ua)) {
    return 'android';
  }
  
  return 'unknown';
}

// Check if app is installed as PWA
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  // iOS
  if ('standalone' in navigator) {
    return (navigator as any).standalone === true;
  }
  
  // Android/Desktop
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  return false;
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
  });

  // Initialize - detect platform and check support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const platform = detectPlatform();
    const standalone = isStandalone();
    
    // Check notification support
    const hasNotifications = 'Notification' in window;
    const hasPushManager = 'PushManager' in window && 'serviceWorker' in navigator;
    
    setState(prev => ({
      ...prev,
      platform,
      isStandalone: standalone,
      isSupported: hasNotifications,
      permission: hasNotifications ? Notification.permission : null,
    }));
    
    // iOS: Check if already subscribed (stored locally)
    if (platform === 'ios') {
      const iosSubscribed = localStorage.getItem('ios-notifications-enabled') === 'true';
      setState(prev => ({ ...prev, isSubscribed: iosSubscribed }));
    }
  }, []);

  // Request permission
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

  // Register Service Worker (tylko dla Android/Desktop)
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    // iOS nie potrzebuje SW dla lokalnych powiadomień
    if (state.platform === 'ios') {
      return null;
    }
    
    if (!('serviceWorker' in navigator)) {
      return null;
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered:', registration);
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

  // Subscribe - różne metody dla różnych platform
  const subscribe = async (): Promise<PushSubscription | null> => {
    try {
      // Sprawdź uprawnienia
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

      // iOS: Tylko lokalne powiadomienia
      if (state.platform === 'ios') {
        // Zapisz stan w localStorage
        localStorage.setItem('ios-notifications-enabled', 'true');
        
        // Zapisz email użytkownika dla backendu (do wysyłania SMS/Email jako fallback)
        const userEmail = await getUserEmail(); // Implementuj to
        if (userEmail) {
          await fetch('/api/notifications/subscribe-ios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: userEmail,
              platform: 'ios',
              standalone: state.isStandalone,
            }),
          });
        }
        
        setState(prev => ({
          ...prev,
          isSubscribed: true,
          error: null,
        }));
        
        // Pokaż info użytkownikowi
        console.log('iOS: Notifications enabled (local only)');
        return null;
      }

      // Android/Desktop: Web Push z VAPID
      const registration = await registerServiceWorker();
      if (!registration) return null;

      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('VAPID public key not found');
        }
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });
        
        // Zapisz subskrypcję do serwera
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      }

      setState(prev => ({
        ...prev,
        subscription,
        isSubscribed: true,
        error: null,
      }));

      return subscription;
    } catch (error) {
      console.error('Error subscribing:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Nie udało się zasubskrybować',
      }));
      return null;
    }
  };

  // Unsubscribe
  const unsubscribe = async (): Promise<boolean> => {
    try {
      // iOS
      if (state.platform === 'ios') {
        localStorage.removeItem('ios-notifications-enabled');
        
        await fetch('/api/notifications/unsubscribe-ios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        setState(prev => ({
          ...prev,
          isSubscribed: false,
          error: null,
        }));
        return true;
      }

      // Android/Desktop
      if (state.subscription) {
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: state.subscription.endpoint }),
        });
        
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
        error: 'Nie udało się odsubskrybować',
      }));
      return false;
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!state.isSupported || state.permission !== 'granted') {
      await requestPermission();
      return;
    }

    try {
      // Lokalne powiadomienie (działa na iOS i wszędzie)
      new Notification('Dzisiaj - Test', {
        body: 'Powiadomienia działają poprawnie! 🎉',
        icon: '/icon.png',
        badge: '/icon.png',
        tag: 'test',
      });
      
      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
      setState(prev => ({
        ...prev,
        error: 'Nie udało się wysłać testowego powiadomienia',
      }));
    }
  };

  // Schedule local notification (iOS i wszędzie)
  const scheduleNotification = (title: string, body: string, delay: number) => {
    setTimeout(() => {
      if (state.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon.png',
          badge: '/icon.png',
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

// Helper: Get user email from session
async function getUserEmail(): Promise<string | null> {
  try {
    // Dostosuj do swojego systemu auth
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    return data.email || null;
  } catch {
    return null;
  }
}