// __tests__/components/HealthSections.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import HeartRateSection from "@/components/health/HeartRateSection";
import SleepSection from "@/components/health/SleepSection";
import HealthDateNav from "@/components/health/HealthDateNav";
import type { SleepSegment } from "@/lib/health/summary";

// Listopad 2026: czas zimowy (UTC+1) – 08:30 UTC to 09:30 w Warszawie.
const rec = (time: string, bpm: number) => ({ recorded_at: `2026-11-02T${time}:00Z`, bpm });
// „Sen” to też nagłówek sekcji – kafelek wskazujemy po elemencie <dt>.
const tile = (label: string) => screen.getByText(label, { selector: "dt" }).parentElement as HTMLElement;

describe("HeartRateSection", () => {
  const records = [rec("06:10", 60), rec("08:30", 90), rec("07:00", 75)];

  it("kafelki: ostatni pomiar (z godziną), średnia, minimum i maksimum liczone z rejestru", () => {
    render(<HeartRateSection records={records} loading={false} />);
    expect(screen.getByRole("heading", { level: 2, name: "Tętno" })).toBeInTheDocument();
    expect(tile("Aktualne")).toHaveTextContent("90 bpm");
    expect(tile("Aktualne")).toHaveTextContent("o 09:30");
    expect(tile("Średnie")).toHaveTextContent("75 bpm");
    expect(tile("Minimalne")).toHaveTextContent("60 bpm");
    expect(tile("Maksymalne")).toHaveTextContent("90 bpm");
    expect(screen.getByText(/Pomiarów: 3/)).toBeInTheDocument();
  });

  it("średnia z przecinkiem dziesiętnym", () => {
    render(<HeartRateSection records={[rec("06:00", 60), rec("06:05", 61)]} loading={false} />);
    expect(tile("Średnie")).toHaveTextContent("60,5 bpm");
  });

  it("lista pomiarów od najnowszego, z godziną w czasie Warszawy", () => {
    render(<HeartRateSection records={records} loading={false} />);
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.textContent)).toEqual(["09:30" + "90 bpm", "08:00" + "75 bpm", "07:10" + "60 bpm"]);
  });

  it("długa lista: 100 pomiarów naraz, reszta po „Pokaż więcej”", () => {
    const many = Array.from({ length: 150 }, (_, i) => rec("06:00", 60 + (i % 30)).recorded_at).map((_, i) => ({
      recorded_at: new Date(Date.UTC(2026, 10, 2, 6, 0, i)).toISOString(),
      bpm: 60 + (i % 30),
    }));
    render(<HeartRateSection records={many} loading={false} />);
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(101);
    fireEvent.click(screen.getByRole("button", { name: /Pokaż więcej \(50\)/ }));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(151);
    expect(screen.queryByRole("button", { name: /Pokaż więcej/ })).toBeNull();
  });

  it("brak pomiarów: informacja; z podsumowaniem dnia (starsze wysyłki): kafelki z adnotacją", () => {
    const { rerender } = render(<HeartRateSection records={[]} loading={false} />);
    expect(screen.getByText(/Brak pomiarów tętna do wyświetlenia/)).toBeInTheDocument();
    rerender(<HeartRateSection records={[]} loading={false} fallback={{ avg: 72, min: 51, max: 148, resting: 55 }} />);
    expect(tile("Spoczynkowe")).toHaveTextContent("55 bpm");
    expect(screen.getAllByText("Z podsumowania dnia")).toHaveLength(4);
    rerender(
      <HeartRateSection records={[]} loading={false} fallback={{ avg: null, min: null, max: null, resting: null }} />
    );
    expect(screen.getByText(/Brak pomiarów tętna do wyświetlenia/)).toBeInTheDocument();
  });

  it("ładowanie: bez tabeli i bez komunikatu o braku danych", () => {
    render(<HeartRateSection records={[]} loading={true} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText(/Brak pomiarów/)).toBeNull();
  });
});

describe("SleepSection", () => {
  // Noc 2→3 listopada, UTC+1: godziny od 12:00 należą do dnia 2., wcześniejsze do 3.
  const at = (t: string) => `${t >= "12:00" ? "2026-11-02" : "2026-11-03"}T${t}:00+01:00`;
  const seg = (stage: SleepSegment["stage"], from: string, to: string): SleepSegment => ({
    stage,
    started_at: at(from),
    ended_at: at(to),
  });
  const night = [
    seg("deep", "23:00", "00:30"),
    seg("core", "00:30", "02:00"),
    seg("rem", "02:00", "02:30"),
    seg("awake", "02:30", "02:40"),
    seg("core", "02:40", "06:00"),
  ];

  it("kafelki: sen, przebudzenia, czas w łóżku i okno snu", () => {
    render(<SleepSection date="2026-11-03" segments={night} loading={false} />);
    expect(screen.getByRole("heading", { level: 2, name: "Sen" })).toBeInTheDocument();
    expect(tile("Sen")).toHaveTextContent("6 h 50 min");
    expect(tile("Przebudzenia")).toHaveTextContent("10 min");
    expect(tile("Czas w łóżku")).toHaveTextContent("7 h");
    expect(tile("Okno snu")).toHaveTextContent("23:00–06:00");
  });

  it("tabela faz: czas i udział; opis paska dla czytników ekranu", () => {
    render(<SleepSection date="2026-11-03" segments={night} loading={false} />);
    const table = screen.getByRole("table", { name: "Czas w poszczególnych fazach snu" });
    const deepRow = within(table).getByText("Sen głęboki").closest("tr") as HTMLElement;
    expect(deepRow).toHaveTextContent("1 h 30 min");
    expect(deepRow).toHaveTextContent("21%");
    expect(within(table).getByText("REM").closest("tr")).toHaveTextContent("7%");
    expect(within(table).queryByText("W łóżku")).toBeNull();
    expect(screen.getByText(/Udział faz snu: .*Sen głęboki 21%/)).toBeInTheDocument();
  });

  it("przebieg nocy: kolejne fazy z godzinami", () => {
    render(<SleepSection date="2026-11-03" segments={night} loading={false} />);
    const timeline = screen.getByRole("table", { name: "Przebieg nocy: kolejne fazy snu" });
    const rows = within(timeline).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("23:00–00:30");
    expect(rows[0]).toHaveTextContent("Sen głęboki");
    expect(rows[3]).toHaveTextContent("Przebudzenia");
  });

  it("nakładające się odcinki nie zawyżają czasu snu", () => {
    render(
      <SleepSection
        date="2026-11-03"
        segments={[seg("core", "23:00", "07:00"), seg("core", "23:00", "07:00")]}
        loading={false}
      />
    );
    expect(tile("Sen")).toHaveTextContent("8 h");
  });

  it("bez odcinków: czas snu z podsumowania dnia (bez faz) albo informacja o braku danych", () => {
    const { rerender } = render(<SleepSection date="2026-11-03" segments={[]} loading={false} fallbackMinutes={431} />);
    expect(tile("Sen")).toHaveTextContent("7 h 11 min");
    expect(screen.getByText("Bez podziału na fazy")).toBeInTheDocument();
    rerender(<SleepSection date="2026-11-03" segments={[]} loading={false} />);
    expect(screen.getByText(/Brak danych o śnie do wyświetlenia/)).toBeInTheDocument();
  });
});

describe("HealthDateNav", () => {
  it("pokazuje dzień po polsku i przełącza o jeden dzień", () => {
    const onChange = vi.fn();
    render(<HealthDateNav date="2026-11-02" today="2026-11-05" onChange={onChange} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("poniedziałek, 2 lis");
    fireEvent.click(screen.getByRole("button", { name: "Poprzedni dzień" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-01");
    fireEvent.click(screen.getByRole("button", { name: "Następny dzień" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-03");
  });

  it("nie pozwala przejść za dzień bieżący", () => {
    render(<HealthDateNav date="2026-11-05" today="2026-11-05" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Następny dzień" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Poprzedni dzień" })).toBeEnabled();
  });
});

describe("SleepSection – kilka snów w danych (regresja z rzeczywistej bazy)", () => {
  const seg = (stage: SleepSegment["stage"], from: string, to: string): SleepSegment => ({
    stage,
    started_at: from,
    ended_at: to,
  });
  // Sen 1: zegarek, fazy, 2.11 00:32–02:25 (UTC+1). Sen 2: telefon, bez faz, 3.11 01:14–03:25.
  const sleep1 = [
    seg("core", "2026-11-01T23:32:00Z", "2026-11-01T23:51:36Z"),
    seg("deep", "2026-11-01T23:51:36Z", "2026-11-01T23:59:08Z"),
    seg("awake", "2026-11-01T23:59:08Z", "2026-11-02T00:00:09Z"),
    seg("core", "2026-11-02T00:00:09Z", "2026-11-02T00:38:50Z"),
    seg("rem", "2026-11-02T00:38:50Z", "2026-11-02T00:42:21Z"),
    seg("core", "2026-11-02T00:42:21Z", "2026-11-02T01:25:34Z"),
  ];
  const sleep2 = [
    seg("asleep", "2026-11-03T00:14:43Z", "2026-11-03T00:27:17Z"),
    seg("awake", "2026-11-03T00:27:17Z", "2026-11-03T00:27:47Z"),
    seg("asleep", "2026-11-03T00:27:47Z", "2026-11-03T01:31:36Z"),
    seg("awake", "2026-11-03T01:31:36Z", "2026-11-03T01:35:07Z"),
    seg("asleep", "2026-11-03T01:35:07Z", "2026-11-03T01:54:43Z"),
    seg("awake", "2026-11-03T01:54:43Z", "2026-11-03T01:58:14Z"),
    seg("asleep", "2026-11-03T01:58:14Z", "2026-11-03T02:13:49Z"),
    seg("awake", "2026-11-03T02:13:49Z", "2026-11-03T02:15:19Z"),
    seg("asleep", "2026-11-03T02:15:19Z", "2026-11-03T02:25:52Z"),
  ];
  const both = [...sleep1, ...sleep2];

  it("3 listopada: tylko drugi sen (bez faz), bez snu z poprzedniej doby", () => {
    render(<SleepSection date="2026-11-03" segments={both} loading={false} />);
    expect(tile("Sen")).toHaveTextContent("2 h 2 min");
    expect(tile("Przebudzenia")).toHaveTextContent("9 min");
    expect(tile("Czas w łóżku")).toHaveTextContent("2 h 11 min");
    expect(tile("Okno snu")).toHaveTextContent("01:14–03:25");
    const table = screen.getByRole("table", { name: "Czas w poszczególnych fazach snu" });
    expect(within(table).getByText("Sen (bez podziału na fazy)")).toBeInTheDocument();
    expect(within(table).queryByText("Sen głęboki")).toBeNull();
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("2 listopada: tylko pierwszy sen z fazami", () => {
    render(<SleepSection date="2026-11-02" segments={both} loading={false} />);
    expect(tile("Sen")).toHaveTextContent("1 h 53 min");
    expect(tile("Przebudzenia")).toHaveTextContent("1 min");
    expect(tile("Czas w łóżku")).toHaveTextContent("1 h 54 min");
    expect(tile("Okno snu")).toHaveTextContent("00:32–02:25");
    expect(
      within(screen.getByRole("table", { name: "Czas w poszczególnych fazach snu" })).getByText("Sen głęboki")
    ).toBeInTheDocument();
  });

  it("dzień bez snu kończącego się tego dnia: informacja o braku danych", () => {
    render(<SleepSection date="2026-11-04" segments={both} loading={false} />);
    expect(screen.getByText(/Brak danych o śnie do wyświetlenia/)).toBeInTheDocument();
  });

  it("ten sam odcinek zapisany dwa razy (duplikat) nie zmienia wyników", () => {
    render(<SleepSection date="2026-11-02" segments={[...both, ...sleep1]} loading={false} />);
    expect(tile("Sen")).toHaveTextContent("1 h 53 min");
  });

  it("dwa sny kończące się tego samego dnia (noc i drzemka): osobne bloki z nagłówkami, bez sumowania", () => {
    const nap = [seg("core", "2026-11-03T06:00:00Z", "2026-11-03T07:00:00Z")];
    render(<SleepSection date="2026-11-03" segments={[...sleep2, ...nap]} loading={false} />);
    expect(screen.getByRole("heading", { level: 3, name: "Sen 1: 01:14–03:25" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Sen 2: 07:00–08:00" })).toBeInTheDocument();
    expect(screen.getAllByText("Sen", { selector: "dt" })).toHaveLength(2);
  });
});
