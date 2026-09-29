// __tests__/components/TrainPlanItem.test.tsx

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrainPlanItem } from "@/components/dashboard/TrainPlanItem";
import type { TrackedTrain } from "@/types/transport";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));

function soon(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, departureTime: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

const makeTrain = (over: Partial<TrackedTrain> = {}): TrackedTrain => ({
  id: "t1", userId: "u", createdAt: "", trainNumber: "5320", trainName: "IC Kasztelan",
  from: "Poznań Główny", to: "Warszawa Centralna", wagon: "12", seat: "45", ...soon(40), ...over,
});

afterEach(() => vi.restoreAllMocks());

const hm = (minutes: number) => soon(minutes).departureTime;

describe("TrainPlanItem", () => {
  it("przed odjazdem pokazuje stację wyjazdu: czas z opóźnieniem, peron, miejsce", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ delay: 12, platform: "3", status: "Opóźniony", estimatedArrival: "", hide: false }), { status: 200 })
    );
    const train = makeTrain();
    render(<TrainPlanItem train={train} />);

    expect(await screen.findByText("+12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("12 | 45")).toBeInTheDocument();
    expect(screen.getByText(hm(52))).toBeInTheDocument();
    expect(screen.getByText("Odjazd z: Poznań Główny")).toBeInTheDocument();
  });

  it("po faktycznym odjeździe pokazuje stację przyjazdu: czas przyjazdu i peron przyjazdu", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          delay: 3, platform: "3", status: "W trasie", estimatedArrival: "", hide: false,
          departurePlatform: "3", departureDelay: 5, arrivalPlatform: "7", arrivalDelay: 3, plannedArrival: hm(60),
        }),
        { status: 200 }
      )
    );
    render(<TrainPlanItem train={makeTrain(soon(-20))} />);

    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
    expect(screen.getByText(hm(63))).toBeInTheDocument();
    expect(screen.getByText("Przyjazd do: Warszawa Centralna")).toBeInTheDocument();
  });

  it("does not call PKP for a train far in the future and shows dashes for unknown platform", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<TrainPlanItem train={makeTrain({ ...soon(60 * 24 * 3), wagon: "", seat: "" })} />);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2); // peron, miejsce
  });

  it("marks a cancelled train", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ delay: 0, platform: "-", status: "Odwołany", estimatedArrival: "", hide: false }), { status: 200 })
    );
    render(<TrainPlanItem train={makeTrain()} />);
    expect(await screen.findByText("Odwołany")).toBeInTheDocument();
  });
});
