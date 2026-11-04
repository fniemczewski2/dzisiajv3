// __tests__/lib/sharedNotifyRules.test.ts
//
// Reguły powiadomień o współdzieleniu: odbiorca zawsze z bazy, nigdy z danych klienta.

import { describe, it, expect } from "vitest";
import {
  listChangeText,
  notificationText,
  pozycjaForm,
  resolveRecipient,
  summarizeListChange,
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

describe("pozycje wspólnej listy – odbiorca", () => {
  it("właściciel zmienia listę – odbiorcą jest osoba, z którą lista jest dzielona", () => {
    expect(resolveRecipient("list_item", list(), ME)).toEqual({ ok: true, recipientId: OTHER });
  });

  it("osoba, z którą lista jest dzielona, zmienia listę – odbiorcą jest właściciel", () => {
    expect(resolveRecipient("list_item", list(), OTHER)).toEqual({ ok: true, recipientId: ME });
  });

  it("obca osoba nie może powiadomić członków listy", () => {
    expect(resolveRecipient("list_item", list(), STRANGER)).toEqual({ ok: false, reason: "not_member" });
  });

  it("prywatna lista nie generuje powiadomień", () => {
    expect(resolveRecipient("list_item", list({ shared_with_id: null }), ME)).toEqual({
      ok: false,
      reason: "not_shared",
    });
  });
});

describe("summarizeListChange – liczby potwierdzone stanem listy w bazie", () => {
  it("dodane pozycje muszą być na liście, usunięte nie mogą na niej być", () => {
    expect(summarizeListChange(list(), { added: ["mleko", "chleb"], removed: ["masło", "ser"] })).toEqual({
      added: 2,
      removed: 2,
    });
  });

  it("klient nie wyprodukuje fałszywych liczb: pozycje bez pokrycia w bazie są pomijane", () => {
    expect(summarizeListChange(list(), { added: ["szampan", "mleko"], removed: ["chleb"] })).toEqual({
      added: 1,
      removed: 0,
      label: "mleko",
    });
    expect(summarizeListChange(list(), { added: ["szampan"], removed: ["chleb"] })).toEqual({ added: 0, removed: 0 });
  });

  it("jedna zmiana niesie etykietę, więcej – tylko liczby", () => {
    expect(summarizeListChange(list(), { added: [], removed: ["masło"] })).toEqual({
      added: 0,
      removed: 1,
      label: "masło",
    });
    expect(summarizeListChange(list(), { added: ["mleko"], removed: ["masło"] })).toEqual({ added: 1, removed: 1 });
  });

  it("powtórzone pozycje (np. dwa razy mleko) liczą się osobno", () => {
    expect(summarizeListChange(list(), { added: ["mleko", "mleko"], removed: [] })).toEqual({ added: 2, removed: 0 });
  });
});

describe("pozycjaForm", () => {
  it.each([
    [1, "pozycję"],
    [2, "pozycje"],
    [4, "pozycje"],
    [5, "pozycji"],
    [12, "pozycji"],
    [14, "pozycji"],
    [22, "pozycje"],
    [25, "pozycji"],
    [100, "pozycji"],
    [101, "pozycji"],
    [102, "pozycje"],
  ])("%i → %s", (n, form) => {
    expect(pozycjaForm(n)).toBe(form);
  });
});

describe("listChangeText – treść powiadomienia o zmianach listy", () => {
  it("jedna dodana pozycja: z nazwą pozycji i listy", () => {
    expect(listChangeText("Zakupy", { added: 1, removed: 0, label: "mleko" })).toEqual({
      title: "Nowa pozycja na wspólnej liście",
      message: "Dodano „mleko” do listy „Zakupy”",
    });
  });

  it("kilka dodanych: zbiorczo, z poprawną odmianą", () => {
    expect(listChangeText("Zakupy", { added: 3, removed: 0 })).toEqual({
      title: "Nowe pozycje na wspólnej liście",
      message: "Dodano 3 pozycje do listy „Zakupy”",
    });
    expect(listChangeText("Zakupy", { added: 5, removed: 0 }).message).toBe("Dodano 5 pozycji do listy „Zakupy”");
  });

  it("usunięte: jedna z nazwą, kilka zbiorczo", () => {
    expect(listChangeText("Zakupy", { added: 0, removed: 1, label: "chleb" }).message).toBe(
      "Usunięto „chleb” z listy „Zakupy”"
    );
    expect(listChangeText("Zakupy", { added: 0, removed: 2 })).toEqual({
      title: "Zmiany na wspólnej liście",
      message: "Usunięto 2 pozycje z listy „Zakupy”",
    });
  });

  it("dodane i usunięte razem: jedno zdanie z obiema liczbami", () => {
    expect(listChangeText("Zakupy", { added: 3, removed: 2 })).toEqual({
      title: "Zmiany na wspólnej liście",
      message: "Dodano 3 i usunięto 2 pozycje na liście „Zakupy”",
    });
    expect(listChangeText("Zakupy", { added: 1, removed: 1 }).message).toBe(
      "Dodano 1 i usunięto 1 pozycję na liście „Zakupy”"
    );
  });

  it("lista bez nazwy dostaje nazwę zastępczą; zbyt długa treść jest ucinana", () => {
    expect(listChangeText("", { added: 2, removed: 0 }).message).toContain("„Lista”");
    expect(listChangeText("x".repeat(300), { added: 2, removed: 0 }).message.length).toBeLessThanOrEqual(120);
  });
});

describe("treść i ustawienia", () => {
  it("każdy rodzaj ma osobny przełącznik i typ powiadomienia", () => {
    const prefs = Object.values(PREFERENCE_BY_KIND);
    expect(new Set(prefs).size).toBe(3);
    for (const p of prefs) expect(p).toMatch(/^notif_shared_(lists|tasks|events)$/);
    expect(new Set(Object.values(NOTIFICATION_TYPE_BY_KIND)).size).toBe(3);
  });

  it("powiadomienie dla listy korzysta ze zbiorczej treści", () => {
    expect(notificationText("list_item", list(), { added: 3, removed: 0 }).message).toBe(
      "Dodano 3 pozycje do listy „Zakupy”"
    );
    expect(notificationText("list_item", list()).message).toBe("Dodano 1 pozycję do listy „Zakupy”");
  });

  it("zbyt długi tytuł jest ucinany", () => {
    const long = "a".repeat(300);
    const { message } = notificationText("task", task({ for_user_id: OTHER }) as never, undefined);
    expect(message.length).toBeLessThanOrEqual(120);
    expect(notificationText("event", event({ shared_with_id: OTHER }) as never).message).toBe("Spotkanie");
    expect(notificationText("event", { ...event(), title: long } as never).message.length).toBe(120);
  });
});
