// __tests__/hooks/usePushNotificationsVapid.test.ts
//
// Subskrypcja utworzona ze starym kluczem VAPID: usługa push odrzucała każdą
// wysyłkę, a aplikacja używała jej bez końca. Teraz jest wymieniana na nową.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import urlBase64ToUint8Array from "@/lib/urlBase64ToUint8Array";

const CURRENT = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const OLD = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM";

const db = { rows: [] as { id: string; subscription: { endpoint: string } }[], deleted: [] as string[], inserted: [] as unknown[] };
function query(table: string) {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = (col: string, val: string) => {
    if (b.__op === "delete" && col === "id") { db.deleted.push(val); return Promise.resolve({ error: null }); }
    return b;
  };
  b.then = (res: (v: unknown) => void) => res({ data: db.rows, error: null });
  b.delete = () => { b.__op = "delete"; return b; };
  b.insert = (row: unknown) => { db.inserted.push(row); return Promise.resolve({ error: null }); };
  b.update = () => ({ eq: () => Promise.resolve({ error: null }) });
  void table;
  return b;
}
const auth = { user: { id: "me" }, supabase: { from: query } };
const toastValue = { toast: { success: vi.fn(), error: vi.fn() } };
const retry = (fn: () => unknown) => fn();
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => toastValue }));
vi.mock("@/hooks/useRetry", () => ({ useRetry: () => retry }));

import { usePushNotifications } from "@/hooks/db/usePushNotifications";

function subscription(key: string, endpoint: string) {
  return {
    endpoint,
    options: { applicationServerKey: urlBase64ToUint8Array(key).buffer },
    toJSON: () => ({ endpoint, keys: { p256dh: "x", auth: "y" } }),
    unsubscribe: vi.fn(() => Promise.resolve(true)),
  };
}

let stale: ReturnType<typeof subscription>;
const subscribe = vi.fn((opts: { applicationServerKey: Uint8Array }) => {
  void opts;
  return Promise.resolve(subscription(CURRENT, "https://push/new"));
});

beforeEach(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = CURRENT;
  localStorage.setItem("dzisiaj:push_opt_in", "1");
  db.rows = [{ id: "row-old", subscription: { endpoint: "https://push/old" } }];
  db.deleted = []; db.inserted = [];
  stale = subscription(OLD, "https://push/old");
  let current: unknown = stale;
  stale.unsubscribe.mockImplementation(() => { current = null; return Promise.resolve(true); });
  const registration = {
    update: () => Promise.resolve(),
    pushManager: { getSubscription: () => Promise.resolve(current), subscribe },
  };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register: () => Promise.resolve(registration), ready: Promise.resolve(registration), addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
  (globalThis as unknown as { PushManager: unknown }).PushManager = function PushManager() {};
  (globalThis as unknown as { Notification: unknown }).Notification = { permission: "granted" };
});

describe("usePushNotifications – zmiana klucza VAPID", () => {
  it("subskrypcja ze starym kluczem jest anulowana, usuwana z bazy i tworzona od nowa", async () => {
    const { result } = renderHook(() => usePushNotifications("me"));
    // loading startuje jako false – czekamy na faktyczny koniec inicjalizacji
    await waitFor(() => expect(db.inserted).toHaveLength(1));

    expect(stale.unsubscribe).toHaveBeenCalled();
    expect(db.deleted).toEqual(["row-old"]);
    expect(subscribe).toHaveBeenCalledTimes(1);
    const usedKey = subscribe.mock.calls[0][0].applicationServerKey;
    expect(Array.from(usedKey)).toEqual(Array.from(urlBase64ToUint8Array(CURRENT)));
    expect(db.inserted).toHaveLength(1);
    expect(result.current.isSubscribed).toBe(true);
  });
});
