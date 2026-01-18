import React, { useState } from 'react';
import { Bell, BellOff, CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function PushNotificationManager() {
  const {
    isSupported,
    permission,
    isSubscribed,
    error,
    platform,
    isStandalone,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const [showDetails, setShowDetails] = useState(false);

  // Combined action: request permission AND subscribe
  const handleEnableNotifications = async () => {
    console.log('🔔 Enable notifications clicked');
    
    // First request permission if needed
    if (permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') {
        console.error('Permission denied');
        return;
      }
    }
    
    // Then subscribe
    await subscribe();
  };

  const handleDisableNotifications = async () => {
    console.log('🔕 Disable notifications clicked');
    await unsubscribe();
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">
              Powiadomienia niedostępne
            </h3>
            <p className="text-sm text-yellow-800">
              Twoja przeglądarka nie obsługuje powiadomień.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow p-6 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="text-xl font-semibold">Powiadomienia Push</h3>
          {platform !== 'unknown' && (
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {platform === 'ios' ? '📱 iOS' : 
               platform === 'android' ? '🤖 Android' : 
               '💻 Desktop'}
              {isStandalone && ' • PWA'}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-primary hover:underline"
        >
          {showDetails ? 'Ukryj' : 'Szczegóły'}
        </button>
      </div>

      {/* Status Message */}
      <p className="text-sm text-gray-600 mb-4">
        {isSubscribed 
          ? '✅ Powiadomienia są włączone'
          : permission === 'denied'
          ? '❌ Uprawnienia zostały odrzucone'
          : '⏸️ Włącz powiadomienia o przypomnieniach i zadaniach'}
      </p>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">Błąd</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Details Panel */}
      {showDetails && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Platforma:</span>
            <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
              {platform === 'ios' ? 'iOS' : 
               platform === 'android' ? 'Android' : 
               platform === 'desktop' ? 'Desktop' : 'Nieznana'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Tryb:</span>
            <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
              {isStandalone ? 'Standalone (PWA)' : 'Przeglądarka'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Uprawnienia:</span>
            <span className={`px-2 py-1 rounded ${
              permission === 'granted' 
                ? 'bg-green-100 text-green-800'
                : permission === 'denied'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {permission === 'granted' ? 'Przyznane' : 
               permission === 'denied' ? 'Odrzucone' : 
               'Nie przyznane'}
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

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {!isSubscribed && permission !== 'denied' && (
          <button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-secondary disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isLoading ? (
              <>
                Włączanie...
                <Loader2 className="w-4 h-4 animate-spin" />
              </>
            ) : (
              <>
                Włącz powiadomienia
                <Bell className="w-4 h-4" />
              </>
            )}
          </button>
        )}

        {isSubscribed && (
          <>
            <button
              onClick={handleDisableNotifications}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isLoading ? (
                <>
                  Wyłączanie...
                  <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  Wyłącz powiadomienia
                  <BellOff className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={sendTestNotification}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Testuj
              <CheckCircle className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}