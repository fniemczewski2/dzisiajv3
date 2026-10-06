import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestSmartLocation, setGpsCookie } from "@/lib/locationUtils";

const position = (lat: number, lon: number) => ({
  timestamp: Date.now(),
  coords: { latitude: lat, longitude: lon, accuracy: 10 },
});

describe("requestSmartLocation", () => {
  const getCurrentPosition = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    document.cookie = "gps_permission=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    getCurrentPosition.mockReset();
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
  });

  afterEach(() => vi.useRealTimers());

  it("zapamiętuje pozycję i nie pyta urządzenia ponownie w oknie ważności", () => {
    getCurrentPosition.mockImplementation((ok: (p: unknown) => void) => ok(position(52.4, 16.9)));
    const first = vi.fn();
    requestSmartLocation({ onSuccess: first, onError: vi.fn() });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    const second = vi.fn();
    requestSmartLocation({ onSuccess: second, onError: vi.fn(), maxAgeMs: 60_000 });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(second.mock.calls[0][0].coords.latitude).toBeCloseTo(52.4);
  });

  it("nie wywołuje okna zgody po zapamiętanej odmowie", () => {
    setGpsCookie("denied");
    const onError = vi.fn();
    requestSmartLocation({ onSuccess: vi.fn(), onError });
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 1 }));
  });

  it("przycisk użytkownika zawsze pobiera świeżą pozycję", () => {
    getCurrentPosition.mockImplementation((ok: (p: unknown) => void) => ok(position(50, 19)));
    requestSmartLocation({ onSuccess: vi.fn(), onError: vi.fn() });
    requestSmartLocation({ forcePrompt: true, onSuccess: vi.fn(), onError: vi.fn() });
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });
});
