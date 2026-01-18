// hooks/usePushNotifications.ts
import { useState, useEffect } from 'react';

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

// Detect platform
function detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }

  if (/windows|macintosh|linux/.test(ua) && !/android/.test(ua)) {
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
  
  if ('standalone' in navigator) {
    return (navigator as any).standalone === true;
  }
  
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
    isLoading: false,
  });

  // Initialize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const platform = detectPlatform();
    const standalone = isStandalone();
    const hasNotifications = 'Notification' in window;
    
    console.log('Push Notifications Init:', {
      platform,
      standalone,
      hasNotifications,
      permission: hasNotifications ? Notification.permission : null,
    });
    
    setState(prev => ({
      ...prev,
      platform,
      isStandalone: standalone,
      isSupported: hasNotifications,
      permission: hasNotifications ? Notification.permission : null,
    }));
    
    // Check existing subscription (Android/Desktop)
    if (platform !== 'ios' && 'serviceWorker' in navigator) {
      checkExistingSubscription();
    }
    
    // Check iOS local storage
    if (platform === 'ios') {
      const iosEnabled = localStorage.getItem('ios-notifications-enabled') === 'true';
      setState(prev => ({ ...prev, isSubscribed: iosEnabled }));
    }
  }, []);

  // Check if already subscribed (Android/Desktop)
  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('Existing subscription found');
        setState(prev => ({
          ...prev,
          subscription,
          isSubscribed: true,
        }));
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  // Request permission
  const requestPermission = async (): Promise<NotificationPermission> => {
    console.log('Requesting notification permission...');
    
    try {
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      
      setState(prev => ({ ...prev, permission, error: null }));
      return permission;
    } catch (error) {
      console.error('Error requesting permission:', error);
      setState(prev => ({
        ...prev,
        error: 'Nie udało się uzyskać uprawnień',
      }));
      return 'denied';
    }
  };

  // Subscribe
  const subscribe = async (): Promise<PushSubscription | null> => {
    console.log('Subscribe called, platform:', state.platform);
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check permission first
      let permission = state.permission;
      if (permission !== 'granted') {
        console.log('Permission not granted, requesting...');
        permission = await requestPermission();
        if (permission !== 'granted') {
          throw new Error('Uprawnienia zostały odrzucone');
        }
      }

      // iOS: Local notifications only
      if (state.platform === 'ios') {
        console.log('iOS: Enabling local notifications');
        localStorage.setItem('ios-notifications-enabled', 'true');
        
        setState(prev => ({
          ...prev,
          isSubscribed: true,
          isLoading: false,
        }));
        
        console.log('iOS notifications enabled');
        return null;
      }

      // Android/Desktop: Web Push
      console.log('Android/Desktop: Registering for Web Push');
      
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      // Wait for service worker to be ready
      console.log('Waiting for Service Worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker ready:', registration);

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      console.log('Existing subscription:', subscription);
      
      if (!subscription) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('VAPID public key not configured');
        }
        
        console.log('Creating new subscription...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });
        console.log('New subscription created:', subscription);
        
        // Save to server
        console.log('Saving subscription to server...');
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save subscription');
        }
        
        console.log('Subscription saved to server');
      }

      setState(prev => ({
        ...prev,
        subscription,
        isSubscribed: true,
        isLoading: false,
      }));

      console.log('Push notifications enabled');
      return subscription;
    } catch (error) {
      console.error('Subscribe error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Nie udało się zasubskrybować',
        isLoading: false,
      }));
      return null;
    }
  };

  // Unsubscribe
  const unsubscribe = async (): Promise<boolean> => {
    console.log('Unsubscribe called');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // iOS
      if (state.platform === 'ios') {
        localStorage.removeItem('ios-notifications-enabled');
        setState(prev => ({
          ...prev,
          isSubscribed: false,
          isLoading: false,
        }));
        console.log('iOS notifications disabled');
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
          isLoading: false,
        }));
        
        console.log('Push notifications disabled');
        return true;
      }
      
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setState(prev => ({
        ...prev,
        error: 'Nie udało się odsubskrybować',
        isLoading: false,
      }));
      return false;
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    console.log('Test notification called');
    
    if (!state.isSupported) {
      console.error('Notifications not supported');
      return;
    }
    
    if (state.permission !== 'granted') {
      console.log('Permission not granted, requesting...');
      await requestPermission();
      return;
    }

    try {
      // Local notification (works everywhere)
      console.log('Sending local notification...');
      new Notification('Dzisiaj - Test', {
        body: 'Powiadomienia działają poprawnie!',
        icon: '/icon.png',
        badge: '/icon.png',
        tag: 'test',
      });
      
      console.log('Test notification sent');
    } catch (error) {
      console.error('Test notification error:', error);
      setState(prev => ({
        ...prev,
        error: 'Nie udało się wysłać testowego powiadomienia',
      }));
    }
  };

  const scheduleNotification = (title: string, body: string, delay: number) => {
    if (state.permission !== 'granted') {
      console.warn('Cannot schedule notification: permission not granted');
      return;
    }

    console.log(`Scheduling notification in ${delay}ms:`, title);
    
    setTimeout(() => {
      try {
        new Notification(title, {
          body,
          icon: '/icon.png',
          badge: '/icon.png',
          tag: `scheduled-${Date.now()}`,
        });
        console.log('Scheduled notification sent:', title);
      } catch (error) {
        console.error('Error sending scheduled notification:', error);
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
  };
}