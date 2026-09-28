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

describe("TrainPlanItem", () => {
  it("shows departure, platform, wagon, seat and the live delay", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ delay: 12, platform: "3", status: "Opóźniony", estimatedArrival: "", hide: false }), { status: 200 })
    );
    const train = makeTrain();
    render(<TrainPlanItem train={train} />);

    expect(await screen.findByText("+12 min")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();            // peron
    expect(screen.getByText("12")).toBeInTheDocument();           // wagon
    expect(screen.getByText("45")).toBeInTheDocument();           // miejsce
    expect(screen.getByText(train.departureTime)).toHaveClass("line-through"); // planowa, przekreślona
    expect(screen.getByText("Poznań Główny")).toBeInTheDocument();
  });

  it("does not call PKP for a train far in the future and shows dashes for unknown platform", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<TrainPlanItem train={makeTrain({ ...soon(60 * 24 * 3), wagon: "", seat: "" })} />);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3); // peron, wagon, miejsce
  });

  it("marks a cancelled train", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ delay: 0, platform: "-", status: "Odwołany", estimatedArrival: "", hide: false }), { status: 200 })
    );
    render(<TrainPlanItem train={makeTrain()} />);
    expect(await screen.findByText("Odwołany")).toBeInTheDocument();
  });
});
