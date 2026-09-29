import { describe, expect, it } from "vitest";
import { currentTrainStop, formatHm, relativeStopTime } from "@/lib/trainPlan";

const train = { date: "2026-09-29", departureTime: "14:10", from: "Poznań Główny", to: "Warszawa Centralna" };
const live = { departurePlatform: "4", departureDelay: 10, arrivalPlatform: "2", arrivalDelay: 15, plannedArrival: "16:55" };
const at = (hm: string, day = 29) => {
  const [h, m] = hm.split(":").map(Number);
  return new Date(2026, 8, day, h, m);
};

describe("currentTrainStop", () => {
  it("przed faktycznym odjazdem pokazuje stację wyjazdu z opóźnieniem", () => {
    const stop = currentTrainStop(train, live, at("14:15"));
    expect(stop.phase).toBe("departure");
    expect(stop.station).toBe("Poznań Główny");
    expect(stop.platform).toBe("4");
    expect(formatHm(stop.expected!)).toBe("14:20");
  });

  it("po faktycznym odjeździe przełącza się na stację przyjazdu", () => {
    const stop = currentTrainStop(train, live, at("14:21"));
    expect(stop.phase).toBe("arrival");
    expect(stop.station).toBe("Warszawa Centralna");
    expect(stop.platform).toBe("2");
    expect(formatHm(stop.planned!)).toBe("16:55");
    expect(formatHm(stop.expected!)).toBe("17:10");
    expect(stop.delay).toBe(15);
  });

  it("rzeczywisty odjazd z danych na żywo ma pierwszeństwo przed wyliczonym", () => {
    const actualDeparture = at("14:25").toISOString();
    expect(currentTrainStop(train, { ...live, actualDeparture }, at("14:22")).phase).toBe("departure");
    expect(currentTrainStop(train, { ...live, actualDeparture }, at("14:26")).phase).toBe("arrival");
  });

  it("kurs przez północ ma przyjazd następnego dnia", () => {
    const night = { ...train, departureTime: "23:30" };
    const stop = currentTrainStop(night, { ...live, departureDelay: 0, plannedArrival: "02:05" }, at("23:45"));
    expect(stop.phase).toBe("arrival");
    expect(stop.planned!.getDate()).toBe(30);
  });

  it("po odjeździe bez godziny przyjazdu pokazuje przyjazd z pustą godziną, a nie odjazd", () => {
    const stop = currentTrainStop(train, { departurePlatform: "4" }, at("15:00"));
    expect(stop.phase).toBe("arrival");
    expect(stop.planned).toBeNull();
    expect(stop.expected).toBeNull();
  });

  it("bez żadnych danych z serwera zostaje przy stacji wyjazdu", () => {
    const stop = currentTrainStop(train, {}, at("15:00"));
    expect(stop.phase).toBe("departure");
  });

  it("opisuje czas względem bieżącej stacji", () => {
    const stop = currentTrainStop(train, live, at("16:30"));
    expect(relativeStopTime(stop, at("16:30"))).toBe("przyjazd za 40 min");
    expect(relativeStopTime(stop, at("17:20"))).toBe("na miejscu");
  });
});
