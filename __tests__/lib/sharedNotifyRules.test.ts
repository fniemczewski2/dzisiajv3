// __tests__/lib/sharedNotifyRules.test.ts
//
// Reguły powiadomień o współdzieleniu: odbiorca zawsze z bazy, nigdy z danych klienta.

import { describe, it, expect } from "vitest";
import {
  notificationText,
  resolveRecipient,
  PREFERENCE_BY_KIND,
  NOTIFICATION_TYPE_BY_KIND,
  type ListRow,
} from "../../supabase/functions/_shared/sharedNotifyRules";

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const STRANGER = "33333333-3333-4333-8333-333333333333";

const task = (over: Partial<{ user_id: string; for_user_id: string | null }> = {}) => ({
  id: "t1",
  user_id: ME,
  for_user_id: OTHER,
  title: "Raport",
  ...over,
});
const event = (over: Partial<{ user_id: string; shared_with_id: string | null }> = {}) => ({
  id: "e1",
  user_id: ME,
  shared_with_id: OTHER,
  title: "Spotkanie",
  ...over,
});
const list = (over: Partial<ListRow> = {}): ListRow => ({
  id: "l1",
  user_id: ME,
  shared_with_id: OTHER,
  name: "Zakupy",
  elements: [{ text: "mleko" }, { text: "chleb" }],
  ...over,
});

describe("zadania", () => {
  it("właściciel przydziela zadanie innej osobie – odbiorcą jest przydzielona osoba", () => {
    expect(resolveRecipient("task", task(), ME)).toEqual({ ok: true, recipientId: OTHER });
  });

  it("nie wysyła, gdy nadawca nie jest właścicielem zadania", () => {
    expect(resolveRecipient("task", task({ user_id: OTHER }), ME)).toEqual({ ok: false, reason: "not_owner" });
  });

  it("nie wysyła, gdy zadanie przydzielono samemu sobie lub nikomu", () => {
    expect(resolveRecipient("task", task({ for_user_id: ME }), ME).ok).toBe(false);
    expect(resolveRecipient("task", task({ for_user_id: null }), ME).ok).toBe(false);
  });
});

describe("wydarzenia", () => {
  it("udostępnienie wydarzenia odbiorcy z shared_with_id", () => {
    expect(resolveRecipient("event", event(), ME)).toEqual({ ok: true, recipientId: OTHER });
  });

  it("nie wysyła, gdy wydarzenie nie jest udostępnione albo nadawca nie jest właścicielem", () => {
    expect(resolveRecipient("event", event({ shared_with_id: null }), ME).ok).toBe(false);
    expect(resolveRecipient("event", event({ user_id: OTHER }), ME).ok).toBe(false);
  });
});

describe("pozycje wspólnej listy", () => {
  it("właściciel dodaje pozycję – odbiorcą jest osoba, z którą lista jest dzielona", () => {
    expect(resolveRecipient("list_item", list(), ME, "mleko")).toEqual({ ok: true, recipientId: OTHER });
  });

  it("osoba, z którą lista jest dzielona, dodaje pozycję – odbiorcą jest właściciel", () => {
    expect(resolveRecipient("list_item", list(), OTHER, "chleb")).toEqual({ ok: true, recipientId: ME });
  });

  it("obca osoba nie może powiadomić członków listy", () => {
    expect(resolveRecipient("list_item", list(), STRANGER, "mleko")).toEqual({ ok: false, reason: "not_member" });
  });

  it("prywatna lista nie generuje powiadomień", () => {
    expect(resolveRecipient("list_item", list({ shared_with_id: null }), ME, "mleko")).toEqual({
      ok: false,
      reason: "not_shared",
    });
  });

  it("klient nie może wymyślić pozycji, której nie ma na liście", () => {
    expect(resolveRecipient("list_item", list(), ME, "szampan")).toEqual({ ok: false, reason: "item_not_found" });
    expect(resolveRecipient("list_item", list(), ME, undefined)).toEqual({ ok: false, reason: "item_not_found" });
  });
});

describe("treść i ustawienia", () => {
  it("każdy rodzaj ma osobny przełącznik i typ powiadomienia", () => {
    const prefs = Object.values(PREFERENCE_BY_KIND);
    expect(new Set(prefs).size).toBe(3);
    for (const p of prefs) expect(p).toMatch(/^notif_shared_(lists|tasks|events)$/);
    expect(new Set(Object.values(NOTIFICATION_TYPE_BY_KIND)).size).toBe(3);
  });

  it("tekst pozycji zawiera nazwę elementu i listy", () => {
    expect(notificationText("list_item", list(), "mleko").message).toBe("Dodano „mleko” do listy „Zakupy”");
  });

  it("zbyt długi tytuł jest ucinany", () => {
    const long = "a".repeat(300);
    const { message } = notificationText("task", task({ for_user_id: OTHER }) as never, undefined);
    expect(message.length).toBeLessThanOrEqual(120);
    expect(notificationText("event", event({ shared_with_id: OTHER }) as never).message).toBe("Spotkanie");
    expect(notificationText("event", { ...event(), title: long } as never).message.length).toBe(120);
  });
});
