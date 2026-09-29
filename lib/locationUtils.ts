// lib/locationUtils.ts

export type GpsPermission = 'granted' | 'denied' | null;

const POSITION_STORAGE_KEY = 'dzisiaj:last_position';
const PERMISSION_COOKIE = 'gps_permission';
const PERMISSION_COOKIE_DAYS = 365;

export const getGpsCookie = (): GpsPermission => {
  if (typeof document === 'undefined') return null;
  const match = new RegExp(`(^| )${PERMISSION_COOKIE}=([^;]+)`).exec(document.cookie);
  return match ? (match[2] as GpsPermission) : null;
};

export const setGpsCookie = (value: 'granted' | 'denied') => {
  const d = new Date();
  d.setTime(d.getTime() + PERMISSION_COOKIE_DAYS * 24 * 60 * 60 * 1000);
  document.cookie = `${PERMISSION_COOKIE}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
};

interface StoredPosition {
  lat: number;
  lon: number;
  accuracy: number;
  at: number;
}

const readStoredPosition = (): StoredPosition | null => {
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPosition;
    return Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lon) && Number.isFinite(parsed?.at) ? parsed : null;
  } catch {
    return null;
  }
};

const storePosition = (position: GeolocationPosition) => {
  try {
    const value: StoredPosition = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      accuracy: position.coords.accuracy,
      at: position.timestamp || Date.now(),
    };
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* prywatny tryb przeglądarki – działamy bez pamięci podręcznej */
  }
};

export const clearStoredPosition = () => {
  try {
    localStorage.removeItem(POSITION_STORAGE_KEY);
  } catch {
    /* brak dostępu do localStorage */
  }
};

const toPosition = (stored: StoredPosition): GeolocationPosition =>
  ({
    timestamp: stored.at,
    coords: {
      latitude: stored.lat,
      longitude: stored.lon,
      accuracy: stored.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
  }) as GeolocationPosition;

/**
 * Stan uprawnienia bez wywoływania okna zgody. Safari w aplikacji z ekranu
 * początkowego potrafi zwracać „prompt” mimo wcześniejszej zgody, dlatego
 * zapamiętana decyzja użytkownika ma pierwszeństwo przed tym odczytem.
 */
export const getGeolocationPermission = async (): Promise<PermissionState | 'unsupported'> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported';
  const remembered = getGpsCookie();
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' });
    if (status?.state === 'granted' || status?.state === 'denied') return status.state;
  } catch {
    /* Permissions API niedostępne */
  }
  return remembered === 'granted' ? 'granted' : 'prompt';
};

interface SmartLocationOptions {
  /** Wywołanie z przycisku użytkownika: pomija zapamiętaną odmowę i świeży odczyt z pamięci. */
  forcePrompt?: boolean;
  /** Jak stara może być pozycja z pamięci, zanim poprosimy urządzenie o nową. */
  maxAgeMs?: number;
  highAccuracy?: boolean;
  onSuccess: (position: GeolocationPosition) => void;
  onError: (error: { code: number; message: string }) => void;
}

export const requestSmartLocation = ({
  forcePrompt = false,
  maxAgeMs = 5 * 60 * 1000,
  highAccuracy = true,
  onSuccess,
  onError,
}: SmartLocationOptions) => {
  if (typeof window === 'undefined' || !navigator?.geolocation) {
    onError({ code: 0, message: 'Twoja przeglądarka nie obsługuje geolokalizacji.' });
    return;
  }

  if (!forcePrompt) {
    const stored = readStoredPosition();
    if (stored && Date.now() - stored.at <= maxAgeMs) {
      onSuccess(toPosition(stored));
      return;
    }
    if (getGpsCookie() === 'denied') {
      onError({ code: 1, message: 'Lokalizacja wyłączona. Włączysz ją w Ustawieniach.' });
      return;
    }
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setGpsCookie('granted');
      storePosition(position);
      onSuccess(position);
    },
    (err) => {
      if (err.code === 1) {
        setGpsCookie('denied');
        clearStoredPosition();
      } else {
        const stored = readStoredPosition();
        if (stored) {
          onSuccess(toPosition(stored));
          return;
        }
      }
      onError(err);
    },
    { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: forcePrompt ? 0 : maxAgeMs }
  );
};
