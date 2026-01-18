import React, { useState } from 'react';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle, Smartphone, Info } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function PushNotificationManager() {
  const {
    permission,
    isSubscribed,
    error,
    platform,
    isStandalone,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const [showDetails, setShowDetails] = useState(false);

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="bg-card rounded-xl shadow p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
          <Bell className="w-5 h-5 mr-2 text-gray-600 flex-shrink-0" />
            <h3 className="text-xl w-full font-semibold">Powiadomienia Push</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-primary hover:underline"
        >
          {showDetails ? 'Ukryj' : 'Szczegóły'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {showDetails && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Platforma:</span>
            <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
                {platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Desktop'}
            </span>
            {isStandalone && 
              <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
                  Standalone
              </span>
            }
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
               permission === 'denied' ? 'Odrzucone' : 'Nieznane'}
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
        {permission !== 'granted' && (
          <button
            onClick={requestPermission}
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-primary cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Przyznaj uprawnienia
            <Bell className="w-4 h-4" />
          </button>
        )}

        {permission === 'granted' && (
          <button
            onClick={handleToggleNotifications}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              isSubscribed
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-primary hover:bg-secondary text-white'
            }`}
          >
            {isSubscribed ? (
              <>
                Wyłącz powiadomienia&nbsp;
                <BellOff className="w-5 h-5" />
              </>
            ) : (
              <>
                Włącz powiadomienia&nbsp;
                <Bell className="w-5 h-5" />
              </>
            )}
          </button>
        )}

        {isSubscribed && (
          <button
            onClick={sendTestNotification}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Testuj&nbsp;
            <CheckCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}