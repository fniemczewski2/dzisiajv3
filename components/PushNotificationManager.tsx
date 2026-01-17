import React, { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function PushNotificationManager() {
  const {
    isSupported,
    permission,
    isSubscribed,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const [showDetails, setShowDetails] = useState(false);

  // Automatyczna rejestracja Service Workera
  useEffect(() => {
    if (isSupported && permission === 'granted' && !isSubscribed) {
      subscribe();
    }
  }, [isSupported, permission, isSubscribed]);

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-1">
              Powiadomienia niedostępne
            </h3>
            <p className="text-sm text-yellow-800">
              Twoja przeglądarka nie obsługuje powiadomień push. 
              Spróbuj użyć Chrome, Firefox lub Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow p-6 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="w-6 h-6 text-primary" />
          ) : (
            <BellOff className="w-6 h-6 text-gray-400" />
          )}
          <div>
            <h3 className="text-lg font-semibold">
              Powiadomienia Push
            </h3>
            <p className="text-sm text-gray-600">
              {isSubscribed 
                ? 'Powiadomienia są włączone' 
                : 'Włącz powiadomienia o przypomnieniach i zadaniach'}
            </p>
          </div>
        </div>

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
            <span className="font-medium">Status uprawnień:</span>
            <span className={`px-2 py-1 rounded ${
              permission === 'granted' 
                ? 'bg-green-100 text-green-800'
                : permission === 'denied'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
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
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4" />
            Przyznaj uprawnienia
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
                <BellOff className="w-4 h-4" />
              </>
            ) : (
              <>
                Włącz powiadomienia&nbsp;
                <Bell className="w-4 h-4" />
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
            <CheckCircle className="w-4 h-4" />
            
          </button>
        )}
      </div>
    </div>
  );
}