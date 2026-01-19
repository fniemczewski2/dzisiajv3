// components/PushNotificationManager.tsx
import React, { useState } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function PushNotificationManager({ userEmail }: { userEmail: string | undefined }) {
  const {
    isSubscribed,
    loading,
    subscribeToPush,
    unsubscribeFromPush
  } = usePushNotifications(userEmail);

  const [showDetails, setShowDetails] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'default'
  );

  // Detect platform
  const getPlatform = () => {
    if (typeof window === 'undefined') return 'desktop';
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    return 'desktop';
  };

  const platform = getPlatform();
  const isStandalone = typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches || 
     (window.navigator as any).standalone === true);

  const isSupported = typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    'PushManager' in window &&
    'Notification' in window;

  const handleRequestPermission = async () => {
    if (!isSupported) {
      alert('Push notifications are not supported in your browser');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        alert('Permission granted! Now you can enable notifications.');
      } else if (result === 'denied') {
        alert('Permission denied. Please enable notifications in your browser settings.');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      alert('Failed to request permission');
    }
  };

  const handleToggleNotifications = async () => {
    console.log('=== Toggle Notifications Clicked ===');
    console.log('Current state:', { isSubscribed, permission, isSupported });
    
    if (!isSupported) {
      alert('Push notifications are not supported in your browser');
      return;
    }

    if (permission !== 'granted') {
      alert('Please grant notification permission first');
      return;
    }

    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
      } else {
        await subscribeToPush();
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      alert('Failed to toggle notifications');
    }
  };

  const handleTestNotification = async () => {
    if (!isSubscribed) {
      alert('Please enable notifications first');
      return;
    }

    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          title: 'Test Notification',
          message: 'This is a test notification from DzisiajV3!',
          url: '/'
        })
      });

      if (!response.ok) throw new Error('Failed to send test notification');
      
      alert('Test notification sent! Check your device.');
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification');
    }
  };

  return (
    <div className="bg-card rounded-xl shadow p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Bell className="w-5 h-5 mr-2 text-gray-600 flex-shrink-0" />
          <h3 className="text-xl font-semibold">Powiadomienia Push</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-primary hover:underline"
        >
          {showDetails ? 'Ukryj' : 'Szczegóły'}
        </button>
      </div>

      {showDetails && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Platforma:</span>
            <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
              {platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Desktop'}
            </span>
            {isStandalone && 
              <span className="px-2 py-1 rounded bg-green-100 text-green-800">
                Standalone
              </span>
            }
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Obsługa przeglądarki:</span>
            <span className={`px-2 py-1 rounded ${
              isSupported 
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {isSupported ? 'Wspierana' : 'Niewspierana'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Status uprawnień:</span>
            <span className={`px-2 py-1 rounded ${
              permission === 'granted' 
                ? 'bg-green-100 text-green-800'
                : permission === 'denied'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {permission === 'granted' ? 'Przyznane' : 
               permission === 'denied' ? 'Odrzucone' : 
               'Nie ustawione'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Subskrypcja:</span>
            <span className={`px-2 py-1 rounded ${
              isSubscribed 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isSubscribed ? 'Aktywna' : 'Nieaktywna'}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Request Permission Button */}
        {isSupported && permission === 'default' && (
          <button
            onClick={handleRequestPermission}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {loading ? 'Ładowanie...' : 'Przyznaj uprawnienia'}
            <Bell className="w-4 h-4" />
          </button>
        )}

        {/* Toggle Notifications Button */}
        {isSupported && permission === 'granted' && (
          <button
            onClick={handleToggleNotifications}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
              isSubscribed
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-primary hover:bg-secondary text-white'
            }`}
          >
            {loading ? (
              'Ładowanie...'
            ) : isSubscribed ? (
              <>
                Wyłącz powiadomienia
                <BellOff className="w-5 h-5" />
              </>
            ) : (
              <>
                Włącz powiadomienia
                <Bell className="w-5 h-5" />
              </>
            )}
          </button>
        )}

        {/* Test Notification Button */}
        {isSubscribed && (
          <button
            onClick={handleTestNotification}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Testuj
            <CheckCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      
    </div>
  );
}