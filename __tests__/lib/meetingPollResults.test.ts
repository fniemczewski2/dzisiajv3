// __tests__/lib/meetingPollResults.test.ts

import { describe, it, expect } from "vitest";
import { summarizeResponses } from "@/lib/meetingPollResults";

describe("summarizeResponses", () => {
  it("liczy osoby dostępne w każdym terminie i łączną liczbę odpowiedzi", () => {
    const result = summarizeResponses(
      ["r1", "r2"],
      [
        { response_id: "r1", date: "2026-10-27", start_time: "10:00:00" },
        { response_id: "r2", date: "2026-10-27", start_time: "10:00:00" },
        { response_id: "r1", date: "2026-10-27", start_time: "11:00:00" },
      ]
    );
    expect(result.respondents).toBe(2);
    expect(result.slots).toEqual([
      { date: "2026-10-27", start_time: "10:00", count: 2 },
      { date: "2026-10-27", start_time: "11:00", count: 1 },
    ]);
  });

  it("ignoruje dostępności z odpowiedzi spoza listy", () => {
    const result = summarizeResponses(["r1"], [{ response_id: "obca", date: "2026-10-27", start_time: "10:00:00" }]);
    expect(result).toEqual({ respondents: 1, slots: [] });
  });

  it("sortuje terminy po dacie i godzinie", () => {
    const result = summarizeResponses(
      ["r1"],
      [
        { response_id: "r1", date: "2026-10-28", start_time: "09:00:00" },
        { response_id: "r1", date: "2026-10-27", start_time: "15:00:00" },
        { response_id: "r1", date: "2026-10-27", start_time: "08:30:00" },
      ]
    );
    expect(result.slots.map((s) => `${s.date} ${s.start_time}`)).toEqual([
      "2026-10-27 08:30",
      "2026-10-27 15:00",
      "2026-10-28 09:00",
    ]);
  });

  it("bez odpowiedzi zwraca zero i pustą listę", () => {
    expect(summarizeResponses([], [])).toEqual({ respondents: 0, slots: [] });
  });
});
