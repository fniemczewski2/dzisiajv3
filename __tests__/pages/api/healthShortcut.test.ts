// __tests__/pages/api/healthShortcut.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { HEALTH_CONSENT_VERSION } from "@/config/defaults";

const h = vi.hoisted(() => ({
  userId: "u1" as string | null,
  settings: null as Record<string, unknown> | null,
  /** Tabela, w której zapis kończy się błędem bazy. */
  failTable: null as string | null,
  upserts: [] as { table: string; row: unknown; options?: unknown }[],
  deletes: [] as { table: string; filters: [string, unknown][] }[],
  log: [] as string[],
}));

vi.mock("@/lib/server/rateLimit", () => ({ enforceRateLimit: async () => true, clientIp: () => "1.1.1.1" }));
vi.mock("@/lib/server/shortcutTokens", () => ({ looksLikeShortcutToken: (t: unknown) => t === "dobry-token" }));
vi.mock("@/lib/server/shortcutAuth", () => ({
  extractShortcutToken: (req: { headers: Record<string, string> }) => req.headers.authorization ?? null,
  resolveShortcutUser: async () => {
    if (h.userId === "BŁĄD") throw new Error("baza");
    return h.userId;
  },
}));
vi.mock("@/lib/server/supabaseAdmin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.settings }) }) }),
      upsert: async (row: unknown, options?: unknown) => {
        h.upserts.push({ table, row, options });
        h.log.push(`upsert:${table}`);
        return { error: h.failTable === table ? { message: "błąd bazy" } : null };
      },
      delete: () => {
        const filters: [string, unknown][] = [];
        const query = {
          eq: (column: string, value: unknown) => {
            filters.push([`eq:${column}`, value]);
            return query;
          },
          gte: (column: string, value: unknown) => {
            filters.push([`gte:${column}`, value]);
            return query;
          },
          lte: (column: string, value: unknown) => {
            filters.push([`lte:${column}`, value]);
            return query;
          },
          lt: async (column: string, value: unknown) => {
            filters.push([`lt:${column}`, value]);
            h.deletes.push({ table, filters });
            h.log.push(`delete:${table}`);
            return { error: null };
          },
        };
        return query;
      },
    }),
  }),
}));

import handler, { config } from "@/pages/api/health/shortcut";

const CONSENT = { health_consent_at: "2026-11-03T10:00:00Z", health_consent_version: HEALTH_CONSENT_VERSION };

function call(body: unknown, token = "dobry-token") {
  const req = { method: "POST", body, headers: { authorization: token } } as unknown as NextApiRequest;
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(p: unknown) {
      this.payload = p;
      return this;
    },
  };
  return {
    req,
    res: res as unknown as NextApiResponse & { statusCode: number; payload: { message?: string; error?: string } },
  };
}

const sample = (second: number, bpm = 70) => ({
  time: new Date(Date.UTC(2026, 10, 2, 6, 0, second)).toISOString(),
  bpm,
});

beforeEach(() => {
  h.userId = "u1";
  h.settings = CONSENT;
  h.failTable = null;
  h.upserts = [];
  h.deletes = [];
  h.log = [];
});

describe("POST /api/health/shortcut – dzień i treningi", () => {
  it("z aktualną zgodą zapisuje dzień (częściowo) i treningi", async () => {
    const { req, res } = call({
      date: "2026-10-30",
      steps: 9000,
      workouts: [{ type: "Spacer", start: "2026-10-30T12:00:00Z" }],
    });
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(h.upserts.map((u) => u.table)).toEqual(["health_daily", "health_workouts"]);
    expect(h.upserts[0].row).toMatchObject({ user_id: "u1", date: "2026-10-30", steps: 9000 });
    expect(h.upserts[0].row).not.toHaveProperty("sleep_minutes");
  });

  it("bez zgody albo przy nieaktualnej wersji zgody: 403 i nic nie jest zapisywane", async () => {
    for (const settings of [
      { health_consent_at: null, health_consent_version: null },
      { health_consent_at: "2026-01-01T00:00:00Z", health_consent_version: "stara" },
    ]) {
      h.settings = settings;
      const { req, res } = call({
        date: "2026-10-30",
        steps: 1,
        sleepSegments: [{ stage: "core", start: "2026-10-30T01:00:00Z", end: "2026-10-30T02:00:00Z" }],
      });
      await handler(req, res);
      expect(res.statusCode).toBe(403);
    }
    expect(h.upserts).toHaveLength(0);
  });

  it("zły token: 401; złe dane: 400 bez zapisu; błąd bazy przy tokenie: 500", async () => {
    const a = call({ date: "2026-10-30", steps: 1 }, "zły");
    await handler(a.req, a.res);
    expect(a.res.statusCode).toBe(401);
    const b = call({ date: "jutro" });
    await handler(b.req, b.res);
    expect(b.res.statusCode).toBe(400);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.userId = "BŁĄD";
    const c = call({ date: "2026-10-30", steps: 1 });
    await handler(c.req, c.res);
    expect(c.res.statusCode).toBe(500);
    spy.mockRestore();
    expect(h.upserts).toHaveLength(0);
  });

  it("kroki z tej samej daty nadpisują poprzednią wartość (300, potem 1200 → 1200, nie 1500)", async () => {
    for (const steps of [300, 1200]) {
      const { req, res } = call({ date: "2026-11-02", steps });
      await handler(req, res);
      expect(res.statusCode).toBe(201);
    }
    const daily = h.upserts.filter((u) => u.table === "health_daily");
    expect(daily.map((u) => (u.row as { steps: number }).steps)).toEqual([300, 1200]);
    for (const u of daily) expect(u.options).toEqual({ onConflict: "user_id,date" });
  });

  it("treść JSON przesłana jako tekst (np. podwójny Content-Type) jest przyjmowana", async () => {
    const { req, res } = call(JSON.stringify({ date: "2026-11-02", steps: 4321 }));
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(h.upserts[0].row).toMatchObject({ steps: 4321 });
  });

  it("odpowiedź 400 jest logowana z nazwą pola, bez wartości danych", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { req, res } = call({ date: "2026-11-02", steps: "dużo" });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).toContain("steps");
    expect(logged).not.toContain("dużo");
    spy.mockRestore();
  });

  it("limit treści żądania podniesiony dla rejestru tętna", () => {
    expect(config.api.bodyParser.sizeLimit).toBe("2mb");
  });
});

describe("POST /api/health/shortcut – sen (fazy)", () => {
  const night = [
    { stage: "Głęboki", start: "2026-11-01T23:00:00+01:00", end: "2026-11-02T00:30:00+01:00" },
    { stage: "REM", start: "2026-11-02T00:30:00+01:00", end: "2026-11-02T01:00:00+01:00" },
  ];

  it("odcinki są kluczowane czasem, a po zapisie usuwane są stare odcinki z tego samego przedziału czasu", async () => {
    const { req, res } = call({ date: "2026-11-02", sleepSegments: night });
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(h.log).toEqual(["upsert:health_sleep_segments", "delete:health_sleep_segments"]);

    const [{ row, options }] = h.upserts;
    const rows = row as { user_id: string; stage: string; synced_at: string }[];
    expect(rows.map((r) => r.stage)).toEqual(["deep", "rem"]);
    expect(rows.every((r) => r.user_id === "u1")).toBe(true);
    expect(new Set(rows.map((r) => r.synced_at)).size).toBe(1);
    expect(options).toEqual({ onConflict: "user_id,started_at,stage" });
    // Usuwane są tylko wiersze zapisane przed tym wysłaniem, których początek mieści się w przedziale wysłanych odcinków.
    expect(h.deletes[0].filters).toEqual([
      ["eq:user_id", "u1"],
      ["gte:started_at", "2026-11-01T22:00:00.000Z"],
      ["lte:started_at", "2026-11-01T23:30:00.000Z"],
      ["lt:synced_at", rows[0].synced_at],
    ]);
  });

  it("ten sam sen wysłany z inną datą ma ten sam klucz (nie tworzy duplikatu)", async () => {
    for (const date of ["2026-11-02", "2026-11-03"]) {
      const { req, res } = call({ date, sleepSegments: night });
      await handler(req, res);
      expect(res.statusCode).toBe(201);
    }
    const [first, second] = h.upserts;
    expect(second.options).toEqual(first.options);
    const key = (u: typeof first) =>
      (u.row as { started_at: string; stage: string }[]).map((r) => `${r.started_at}|${r.stage}`);
    expect(key(second)).toEqual(key(first));
  });

  it("dwa sny w jednym wysłaniu: czyszczenie obejmuje przedział od pierwszego do ostatniego początku", async () => {
    const two = [
      { stage: "Podstawowy", start: "2026-11-02T00:32:00+01:00", end: "2026-11-02T02:25:00+01:00" },
      { stage: "Nieokreślony", start: "2026-11-03T01:14:43+01:00", end: "2026-11-03T03:25:52+01:00" },
    ];
    const { req, res } = call({ date: "2026-11-03", sleepSegments: two });
    await handler(req, res);
    expect(h.deletes[0].filters.slice(1, 3)).toEqual([
      ["gte:started_at", "2026-11-01T23:32:00.000Z"],
      ["lte:started_at", "2026-11-03T00:14:43.000Z"],
    ]);
  });

  it("dane dnia i sen w jednym wysłaniu: kolejność zapisów", async () => {
    const { req, res } = call({ date: "2026-11-02", steps: 100, sleepSegments: night });
    await handler(req, res);
    expect(h.log).toEqual(["upsert:health_daily", "upsert:health_sleep_segments", "delete:health_sleep_segments"]);
    expect(res.payload.message).toBe("Zapisano dane z 2026-11-02, odcinki snu: 2.");
  });

  it("błąd zapisu snu: 500, a poprzednie dane doby nie są usuwane", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.failTable = "health_sleep_segments";
    const { req, res } = call({ date: "2026-11-02", sleepSegments: night });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.payload.error).toBe("Nie udało się zapisać snu.");
    expect(h.deletes).toHaveLength(0);
    spy.mockRestore();
  });

  it("nieznana faza snu: 400 z nazwą fazy, bez zapisu", async () => {
    const { req, res } = call({
      date: "2026-11-02",
      sleepSegments: [{ stage: "Drzemka", start: "2026-11-02T01:00:00Z", end: "2026-11-02T02:00:00Z" }],
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain("Drzemka");
    expect(h.upserts).toHaveLength(0);
  });
});

describe("POST /api/health/shortcut – rejestr tętna", () => {
  it("zapisuje pomiary porcjami po 1000, łącząc z wcześniejszymi (klucz: użytkownik i czas pomiaru)", async () => {
    const { req, res } = call({
      date: "2026-11-02",
      heartRateSamples: Array.from({ length: 2500 }, (_, i) => sample(i)),
    });
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    const hr = h.upserts.filter((u) => u.table === "health_heart_rate");
    expect(hr.map((u) => (u.row as unknown[]).length)).toEqual([1000, 1000, 500]);
    for (const u of hr) expect(u.options).toEqual({ onConflict: "user_id,recorded_at" });
    expect((hr[0].row as Record<string, unknown>[])[0]).toEqual({
      user_id: "u1",
      recorded_at: "2026-11-02T06:00:00.000Z",
      bpm: 70,
    });
    expect(h.deletes).toHaveLength(0);
    expect(res.payload.message).toBe("Zapisano dane z 2026-11-02, pomiary tętna: 2500.");
  });

  it("sam rejestr tętna nie dotyka tabeli danych dziennych", async () => {
    const { req, res } = call({ date: "2026-11-02", heartRateSamples: [sample(0)] });
    await handler(req, res);
    expect(h.log).toEqual(["upsert:health_heart_rate"]);
  });

  it("błąd bazy w pierwszej porcji: 500 i dalsze porcje nie są wysyłane", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.failTable = "health_heart_rate";
    const { req, res } = call({
      date: "2026-11-02",
      heartRateSamples: Array.from({ length: 2500 }, (_, i) => sample(i)),
    });
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.payload.error).toBe("Nie udało się zapisać pomiarów tętna.");
    expect(h.upserts).toHaveLength(1);
    spy.mockRestore();
  });

  it("niepoprawny pomiar: 400 z numerem, bez żadnego zapisu", async () => {
    const { req, res } = call({
      date: "2026-11-02",
      steps: 10,
      heartRateSamples: [sample(0), { time: "2026-11-02T06:00:01Z", bpm: 999 }],
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain("nr 2");
    expect(h.upserts).toHaveLength(0);
  });

  it("rejestr tętna przesłany jako tekst z obiektami oddzielonymi nową linią (tak Skróty zamieniają listę) jest zapisywany", async () => {
    const asText = `{\n  "bpm" : 63,\n  "time" : "2026-11-02T06:10:00+01:00"\n}\n{\n  "bpm" : 55,\n  "time" : "2026-11-02T06:15:00+01:00"\n}`;
    const { req, res } = call({ date: "2026-11-02", heartRateSamples: asText });
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect((h.upserts[0].row as { bpm: number }[]).map((r) => r.bpm)).toEqual([63, 55]);
  });

  it("pomiar z datą z roku 1 jest odrzucany i nie trafia do bazy", async () => {
    const { req, res } = call({
      date: "2026-11-02",
      heartRateSamples: [{ time: "0001-01-01T00:00:10+01:24", bpm: 63 }],
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain("rok 2000–2100");
    expect(h.upserts).toHaveLength(0);
  });
});
