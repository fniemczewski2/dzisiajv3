import React, { useState } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import NotificationPreferences from './NotificationPreferencesForm';

export default function PushNotificationManager({ userId }: { userId: string | undefined }) {
  const {
    isSubscribed,
    loading,
    subscribeToPush,
    unsubscribeFromPush
  } = usePushNotifications(userId);

  const [showDetails, setShowDetails] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'default'
  );

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
      alert('Powiadomienia Push nie są wspierane w tej przeglądarce.');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        alert('Uprawnienia przyznane! Teraz możesz włączyć powiadomienia.');
      } else if (result === 'denied') {
        alert('Uprawnienia odrzucone. Proszę włączyć powiadomienia w ustawieniach przeglądarki.');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      alert('Nie udało się poprosić o uprawnienia.');
    }
  };

  const handleToggleNotifications = async () => {
    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
      } else {
        await subscribeToPush();
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    }
  };

  const handleTestNotification = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Błąd konfiguracji Supabase');
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-push`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          title: 'Dzisiaj v3 | Test',
          message: 'To jest powiadomienie testowe z aplikacji Dzisiaj!',
          url: '/',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Błąd wysyłki: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      alert(`Powiadomienie wysłano pomyślnie (${data.sent || 0} / ${data.total || 0})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      alert('Wystąpił błąd:\n' + errorMessage);
    }
  };

  return (
    <div className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-text">
          <div>
            <Bell className="w-5 h-5 text-primary flex-shrink-0" />
          </div>
          <h3 className="text-lg font-bold">Powiadomienia</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary transition-colors"
        >
          {showDetails ? 'Ukryj tech.' : 'Techniczne'}
        </button>
      </div>

      {showDetails && (
        <div className="bg-surface border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-textSecondary">Platforma:</span>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded card text-text font-medium uppercase">
                {platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Desktop'}
              </span>
              {isStandalone && 
                <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-bold border border-green-200 dark:border-green-500/30 uppercase">
                  PWA
                </span>
              }
            </div>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
            <span className="font-semibold text-textSecondary">Przeglądarka:</span>
            <span className={`px-2 py-1 rounded font-bold uppercase tracking-wide border ${
              isSupported 
                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
            }`}>
              {isSupported ? 'Wspierane' : 'Brak'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
            <span className="font-semibold text-textSecondary">Uprawnienia:</span>
            <span className={`px-2 py-1 rounded font-bold uppercase tracking-wide border ${
              permission === 'granted' 
                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30'
                : permission === 'denied'
                ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
                : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-700/50'
            }`}>
              {permission === 'granted' ? 'Przyznane' : 
               permission === 'denied' ? 'Odrzucone' : 
               'Pytaj'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs sm:text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
            <span className="font-semibold text-textSecondary">Subskrypcja:</span>
            <span className={`px-2 py-1 rounded font-bold uppercase tracking-wide border ${
              isSubscribed 
                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30' 
                : 'card text-textMuted'
            }`}>
              {isSubscribed ? 'Aktywna' : 'Brak'}
            </span>
          </div>
        </div>
      )}
      <NotificationPreferences/>
      <div className="flex flex-wrap gap-3 pt-2">
        {/* Request Permission Button */}
        {isSupported && permission === 'default' && (
          <button
            onClick={handleRequestPermission}
            disabled={loading}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {loading ? 'Czekaj...' : 'Nadaj Uprawnienia'}
            <AlertCircle className="w-5 h-5" />
          </button>
        )}

        {/* Toggle Notifications Button */}
        {isSupported && permission === 'granted' && (
          <button
            onClick={handleToggleNotifications}
            disabled={loading}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-all disabled:opacity-50 ${
              isSubscribed
                ? 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                : 'bg-primary hover:bg-secondary text-white'
            }`}
          >
            {loading ? (
              'Czekaj...'
            ) : isSubscribed ? (
              <>
                Wyłącz 
                <BellOff className="w-5 h-5" />
              </>
            ) : (
              <>
                Aktywuj 
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
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-text font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            Wyślij Test
            <CheckCircle className="w-5 h-5 text-green-500" />
          </button>
        )}
      </div>
    </div>
  );
}