// lib/locationUtils.ts

export type GpsPermission = 'granted' | 'denied' | null;

export const getGpsCookie = (): GpsPermission => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )gps_permission=([^;]+)'));
  return match ? (match[2] as GpsPermission) : null;
};

export const setGpsCookie = (value: 'granted' | 'denied') => {
  const d = new Date();
  d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000)); // Ważne przez 30 dni
  document.cookie = `gps_permission=${value};expires=${d.toUTCString()};path=/`;
};

interface SmartLocationOptions {
  forcePrompt?: boolean;
  onSuccess: (position: GeolocationPosition) => void;
  onError: (error: { code: number; message: string }) => void;
}

export const requestSmartLocation = ({ forcePrompt = false, onSuccess, onError }: SmartLocationOptions) => {
  if (typeof window === 'undefined' || !navigator?.geolocation) {
    onError({ code: 0, message: "Twoja przeglądarka nie obsługuje geolokalizacji." });
    return;
  }

  const savedStatus = getGpsCookie();

  if (savedStatus === 'denied' && !forcePrompt) {
    onError({ code: 1, message: "Lokalizacja wyłączona. Użyj przycisku w ustawieniach, aby włączyć." });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setGpsCookie('granted');
      onSuccess(position);
    },
    (err) => {
      if (err.code === 1) {
        setGpsCookie('denied');
      }
      onError(err);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};