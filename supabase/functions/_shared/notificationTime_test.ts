import { eventReminderType, plDayBoundsUTC, weekdayIndexPL } from "./notificationTime.ts";
function eq(a: unknown, b: unknown) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`oczekiwano ${JSON.stringify(b)}, jest ${JSON.stringify(a)}`); }

const NOW = Date.parse("2026-10-08T12:00:00Z"); // 14:00 w Polsce
const none = new Set<string>();

Deno.test("wydarzenie jutro → „1day”, nie „7days” (dawny błąd porównania napisów)", () => {
  eq(eventReminderType("2026-10-09T10:00:00+00:00", NOW, none), "1day");
});
Deno.test("za 4 minuty → „5min”", () => {
  eq(eventReminderType("2026-10-08T12:04:00+00:00", NOW, none), "5min");
});
Deno.test("za 3 dni → „7days”; za 8 dni i w przeszłości → brak", () => {
  eq(eventReminderType("2026-10-11T12:00:00+00:00", NOW, none), "7days");
  eq(eventReminderType("2026-10-16T13:00:00+00:00", NOW, none), null);
  eq(eventReminderType("2026-10-08T11:00:00+00:00", NOW, none), null);
});
Deno.test("już wysłane przypomnienie nie jest powtarzane", () => {
  eq(eventReminderType("2026-10-09T10:00:00+00:00", NOW, new Set(["1day"])), null);
});
Deno.test("granice dnia: czas letni (UTC+2) i zimowy (UTC+1)", () => {
  eq(plDayBoundsUTC("2026-07-15"), { start: "2026-07-14T22:00:00.000Z", end: "2026-07-15T22:00:00.000Z" });
  eq(plDayBoundsUTC("2026-12-15"), { start: "2026-12-14T23:00:00.000Z", end: "2026-12-15T23:00:00.000Z" });
});
Deno.test("dzień zmiany czasu (25 października 2026) ma 25 godzin", () => {
  const { start, end } = plDayBoundsUTC("2026-10-25");
  eq((Date.parse(end) - Date.parse(start)) / 3_600_000, 25);
});
Deno.test("dzień tygodnia nie zależy od godziny (dawniej od południa był „jutro”)", () => {
  eq(weekdayIndexPL("2026-10-08"), 3); // czwartek
  eq(weekdayIndexPL("2026-10-12"), 0); // poniedziałek
  eq(weekdayIndexPL("2026-10-11"), 6); // niedziela
});
Deno.test("dzień zmiany na czas letni (29 marca 2026) ma 23 godziny", () => {
  const { start, end } = plDayBoundsUTC("2026-03-29");
  eq(start, "2026-03-28T23:00:00.000Z");
  eq((Date.parse(end) - Date.parse(start)) / 3_600_000, 23);
});
