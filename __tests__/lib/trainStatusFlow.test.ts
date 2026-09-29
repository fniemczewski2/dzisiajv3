import { describe, expect, it } from "vitest";
import { buildStationDetails } from "@/lib/trainStatusDetails";
import { arrivalTimes, currentTrainStop, formatHm, parsePlkTime } from "@/lib/trainPlan";
import type { OperationStation, RouteStation } from "@/types/pkpplk";

const train = { date: "2026-09-29", departureTime: "14:10", from: "Poznań Główny", to: "Warszawa Centralna" };
const at = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return new Date(2026, 8, 29, h, m);
};

// Rozkład z filtrem stations=<wyjazd> bez fullRoutes: w trasie tylko stacja wyjazdu.
const scheduleFrom: RouteStation = { stationId: "POZ", departurePlatform: "4", departureTime: "14:10:00" };

const opFrom = (over: Partial<OperationStation> = {}): OperationStation => ({
  stationId: "POZ", departurePlatform: "3", departureDelayMinutes: 10, actualDeparture: "2026-09-29T14:20:00", ...over,
});
const opTo = (over: Partial<OperationStation> = {}): OperationStation => ({
  stationId: "WCE", arrivalPlatform: "7", arrivalDelayMinutes: 15, actualArrival: "2026-09-29T17:10:00", ...over,
});

describe("rozkład bez pełnej trasy (tylko stacja wyjazdu)", () => {
  const live = () =>
    buildStationDetails({ plannedFrom: scheduleFrom, plannedTo: undefined, opFrom: opFrom(), opTo: opTo(), arrivalStation: "Warszawa Centralna" });

  it("przed odjazdem: stacja wyjazdu, peron z danych na żywo, czas z opóźnieniem", () => {
    const stop = currentTrainStop(train, live(), at("14:15"));
    expect(stop.phase).toBe("departure");
    expect(stop.platform).toBe("3");
    expect(formatHm(stop.expected!)).toBe("14:20");
  });

  it("po odjeździe: przyjazd wyliczony z danych na żywo mimo braku godziny w rozkładzie", () => {
    const stop = currentTrainStop(train, live(), at("14:21"));
    expect(stop.phase).toBe("arrival");
    expect(stop.platform).toBe("7");
    expect(formatHm(stop.expected!)).toBe("17:10");
    expect(formatHm(stop.planned!)).toBe("16:55");
    expect(stop.delay).toBe(15);
  });

  it("po odjeździe bez żadnych danych o przyjeździe zostaje na przyjeździe z pustą godziną", () => {
    const details = buildStationDetails({ plannedFrom: scheduleFrom, opFrom: opFrom(), opTo: undefined });
    const stop = currentTrainStop(train, details, at("14:30"));
    expect(stop.phase).toBe("arrival");
    expect(stop.planned).toBeNull();
    expect(stop.expected).toBeNull();
  });

  it("flaga serwera „departed” przełącza widok nawet gdy zegar telefonu się spóźnia", () => {
    const details = { ...live(), departed: true };
    expect(currentTrainStop(train, details, at("14:12")).phase).toBe("arrival");
  });
});

describe("rozkład z pełną trasą", () => {
  it("planowa godzina z rozkładu ma pierwszeństwo przed wyliczoną", () => {
    const details = buildStationDetails({
      plannedFrom: scheduleFrom,
      plannedTo: { stationId: "WCE", arrivalTime: "16:56:00", arrivalPlatform: "5" },
      opFrom: opFrom(),
      opTo: opTo({ arrivalPlatform: undefined }),
    });
    const { planned, expected } = arrivalTimes(train, details);
    expect(formatHm(planned!)).toBe("16:56");
    expect(formatHm(expected!)).toBe("17:10");
    expect(currentTrainStop(train, details, at("15:00")).platform).toBe("5");
  });
});

describe("parsePlkTime", () => {
  it("czas bez przesunięcia to czas ścienny w Polsce (lato, UTC+2)", () => {
    expect(parsePlkTime("2026-09-29T14:20:00")!.toISOString()).toBe("2026-09-29T12:20:00.000Z");
  });

  it("czas ścienny zimą (UTC+1)", () => {
    expect(parsePlkTime("2026-01-15T14:20:00")!.toISOString()).toBe("2026-01-15T13:20:00.000Z");
  });

  it("czas z przesunięciem czytany dosłownie", () => {
    expect(parsePlkTime("2026-09-29T14:20:00+02:00")!.toISOString()).toBe("2026-09-29T12:20:00.000Z");
    expect(parsePlkTime("2026-09-29T12:20:00Z")!.toISOString()).toBe("2026-09-29T12:20:00.000Z");
  });

  it("obie formy tego samego momentu dają ten sam wynik", () => {
    expect(parsePlkTime("2026-09-29T14:20:00")!.getTime()).toBe(parsePlkTime("2026-09-29T14:20:00+02:00")!.getTime());
  });

  it("zmiana czasu: po przestawieniu zegara w marcu i w październiku", () => {
    expect(parsePlkTime("2026-03-29T04:00:00")!.toISOString()).toBe("2026-03-29T02:00:00.000Z");
    expect(parsePlkTime("2026-10-25T04:00:00")!.toISOString()).toBe("2026-10-25T03:00:00.000Z");
  });

  it("pusta i błędna wartość to null", () => {
    expect(parsePlkTime("")).toBeNull();
    expect(parsePlkTime(undefined)).toBeNull();
    expect(parsePlkTime("nie-data")).toBeNull();
  });
});
