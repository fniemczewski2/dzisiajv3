// __tests__/lib/pushKeys.test.ts

import { describe, it, expect } from "vitest";
import { subscriptionMatchesVapidKey } from "@/lib/pushKeys";
import urlBase64ToUint8Array from "@/lib/urlBase64ToUint8Array";

const KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const OTHER = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM";
const sub = (key: string | null) =>
  ({ options: { applicationServerKey: key ? urlBase64ToUint8Array(key).buffer : null } }) as unknown as PushSubscription;

describe("subscriptionMatchesVapidKey", () => {
  it("ten sam klucz – zgodna", () => expect(subscriptionMatchesVapidKey(sub(KEY), KEY)).toBe(true));
  it("inny klucz – niezgodna (wysyłki byłyby odrzucane)", () => expect(subscriptionMatchesVapidKey(sub(OTHER), KEY)).toBe(false));
  it("przeglądarka nie podaje klucza – zakładamy zgodność", () => expect(subscriptionMatchesVapidKey(sub(null), KEY)).toBe(true));
});
