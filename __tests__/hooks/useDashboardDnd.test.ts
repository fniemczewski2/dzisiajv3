// __tests__/hooks/useDashboardDnd.test.ts
//
// Przesunięcie zadania lub wydarzenia na planie dnia: po udanym zapisie konkretny toast z tytułem i godziną,
// po odrzuceniu zapisu brak potwierdzenia (komunikat o błędzie pokazuje hook edycji).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const occ = vi.hoisted(() => ({
  move: vi.fn(async () => true),
  reset: vi.fn(async () => true),
  find: vi.fn(() => undefined),
}));

const h = vi.hoisted(() => ({ success: vi.fn(), confirm: vi.fn(async () => true), info: vi.fn() }));
vi.mock("@/providers/ToastProvider", () => ({
  useToast: () => ({ toast: { success: h.success, error: vi.fn(), info: h.info, confirm: h.confirm } }),
}));

import { useDashboardDnd } from "@/hooks/useDashboardDnd";

const date = new Date(2026, 10, 4);
const task = { id: 7, title: "Trening" } as never;
const event = {
  id: "e1",
  title: "Spotkanie",
  start_time: "2026-11-04T09:00:00+00",
  end_time: "2026-11-04T10:00:00+00",
} as never;
const dropAt = (time: string) => ({ over: { id: `slot-${time}`, data: { current: { time } } }, active: {} });

/** Zapis wyjątku terminu serii – podstawiany we wszystkich wywołaniach hooka. */
const occurrenceProps: Pick<
  Parameters<typeof useDashboardDnd>[0],
  "moveOccurrence" | "resetOccurrence" | "overrideFor"
> = {
  moveOccurrence: occ.move,
  resetOccurrence: occ.reset,
  overrideFor: occ.find,
};

beforeEach(() => {
  occ.move.mockClear();
  occ.reset.mockClear();
  h.success.mockReset();
  h.info.mockReset();
  h.confirm.mockReset();
  h.confirm.mockResolvedValue(true);
});

describe("useDashboardDnd – potwierdzenie przesunięcia", () => {
  it("zadanie przeniesione: toast z tytułem i nową godziną; zapis bez własnego toastu", async () => {
    const editTask = vi.fn(async () => true);
    const editEvent = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useDashboardDnd({ tasks: [task], events: [], userId: "u1", date, editTask, editEvent, ...occurrenceProps })
    );
    await act(async () => {
      await result.current.handleDragEnd({ ...dropAt("14:30"), active: { id: "plan-task-7" } } as never);
    });
    expect(editTask).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }), { silent: true });
    expect(h.success).toHaveBeenCalledWith(
      "Przeniesiono „Trening” na 14:30",
      expect.objectContaining({ action: expect.objectContaining({ label: "Cofnij" }) })
    );
  });

  it("wydarzenie przeniesione: toast z tytułem i nową godziną", async () => {
    const editTask = vi.fn(async () => true);
    const editEvent = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useDashboardDnd({ tasks: [], events: [event], userId: "u1", date, editTask, editEvent, ...occurrenceProps })
    );
    await act(async () => {
      await result.current.handleDragEnd({ ...dropAt("08:00"), active: { id: "plan-event-e1" } } as never);
    });
    expect(editEvent).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }), { silent: true });
    expect(h.success).toHaveBeenCalledWith(
      "Przeniesiono „Spotkanie” na 08:00",
      expect.objectContaining({ action: expect.objectContaining({ label: "Cofnij" }) })
    );
  });

  it("odrzucony zapis: brak potwierdzenia sukcesu", async () => {
    const editTask = vi.fn(async () => false);
    const { result } = renderHook(() =>
      useDashboardDnd({
        tasks: [task],
        events: [],
        userId: "u1",
        date,
        editTask,
        editEvent: vi.fn(async () => false),
        ...occurrenceProps,
      })
    );
    await act(async () => {
      await result.current.handleDragEnd({ ...dropAt("14:30"), active: { id: "plan-task-7" } } as never);
    });
    expect(h.success).not.toHaveBeenCalled();
  });

  it("upuszczenie poza siatką godzin lub bez użytkownika: nic nie zapisujemy i nic nie potwierdzamy", async () => {
    const editTask = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useDashboardDnd({
        tasks: [task],
        events: [],
        userId: undefined,
        date,
        editTask,
        editEvent: vi.fn(async () => true),
        ...occurrenceProps,
      })
    );
    await act(async () => {
      await result.current.handleDragEnd({ ...dropAt("14:30"), active: { id: "plan-task-7" } } as never);
    });
    expect(editTask).not.toHaveBeenCalled();
    expect(h.success).not.toHaveBeenCalled();
  });

  it("wydarzenie z czasem „…+00” (stan po 1. przesunięciu) da się przesunąć ponownie – poprawne godziny, bez NaN", async () => {
    const editEvent = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useDashboardDnd({
        tasks: [],
        events: [event],
        userId: "u1",
        date,
        editTask: vi.fn(),
        editEvent,
        ...occurrenceProps,
      })
    );
    await act(async () => {
      await result.current.handleDragEnd({ ...dropAt("15:00"), active: { id: "plan-event-e1" } } as never);
    });
    expect(editEvent).toHaveBeenCalledWith(
      expect.objectContaining({ start_time: "2026-11-04T15:00:00+00", end_time: "2026-11-04T16:00:00+00" }),
      { silent: true }
    );
  });

  it("odmowa w toaście confirm: brak zapisu", async () => {
    h.confirm.mockResolvedValue(false);
    const editTask = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useDashboardDnd({
        tasks: [task],
        events: [],
        userId: "u1",
        date,
        editTask,
        editEvent: vi.fn(),
        ...occurrenceProps,
      })
    );
    await act(async () => {
      await result.current.handleDragEnd({ ...dropAt("14:30"), active: { id: "plan-task-7" } } as never);
    });
    expect(h.confirm).toHaveBeenCalled();
    expect(editTask).not.toHaveBeenCalled();
  });

  it("Cofnij przywraca poprzednie godziny wydarzenia", async () => {
    const editEvent = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useDashboardDnd({
        tasks: [],
        events: [event],
        userId: "u1",
        date,
        editTask: vi.fn(),
        editEvent,
        ...occurrenceProps,
      })
    );
    await act(async () => {
      await result.current.handleDragEnd({ ...dropAt("15:00"), active: { id: "plan-event-e1" } } as never);
    });
    const options = h.success.mock.calls[0][1] as { action: { onClick: () => void } };
    await act(async () => {
      options.action.onClick();
    });
    expect(editEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ start_time: "2026-11-04T09:00:00+00", end_time: "2026-11-04T10:00:00+00" }),
      { silent: true }
    );
  });

  it("Cofnij przywraca poprzednią godzinę zadania (także brak godziny)", async () => {
    const editTask = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useDashboardDnd({
        tasks: [task],
        events: [],
        userId: "u1",
        date,
        editTask,
        editEvent: vi.fn(),
        ...occurrenceProps,
      })
    );
    await act(async () => {
      await result.current.handleDragEnd({ ...dropAt("14:30"), active: { id: "plan-task-7" } } as never);
    });
    const options = h.success.mock.calls[0][1] as { action: { onClick: () => void } };
    await act(async () => {
      options.action.onClick();
    });
    expect(editTask).toHaveBeenLastCalledWith(expect.objectContaining({ id: 7, scheduled_time: null }), {
      silent: true,
    });
  });

  it("upuszczenie w tym samym slocie godzinowym: bez confirm i bez zapisu", async () => {
    const editEvent = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useDashboardDnd({
        tasks: [],
        events: [event],
        userId: "u1",
        date,
        editTask: vi.fn(),
        editEvent,
        ...occurrenceProps,
      })
    );
    await act(async () => {
      await result.current.handleDragEnd({ ...dropAt("09:00"), active: { id: "plan-event-e1" } } as never);
    });
    expect(h.confirm).not.toHaveBeenCalled();
    expect(editEvent).not.toHaveBeenCalled();
  });
});

describe("useDashboardDnd – wystąpienie serii", () => {
  const seriesInstance = {
    id: "e1_2026-11-04",
    title: "Trening",
    recurrence: { freq: "weekly", interval: 1 },
    start_time: "2026-11-04T09:00:00+00",
    end_time: "2026-11-04T10:00:00+00",
  } as never;

  it("zapisuje wyjątek terminu, a nie wiersz serii", async () => {
    const editTask = vi.fn(async () => true);
    const editEvent = vi.fn(async () => true);
    const { result } = renderHook(() =>
      useDashboardDnd({
        tasks: [],
        events: [seriesInstance],
        userId: "u1",
        date,
        editTask,
        editEvent,
        ...occurrenceProps,
      })
    );
    await act(async () => {
      await result.current.handleDragEnd({ ...dropAt("08:00"), active: { id: "plan-event-e1_2026-11-04" } } as never);
    });
    expect(editEvent).not.toHaveBeenCalled();
    expect(occ.move).toHaveBeenCalledWith(
      expect.objectContaining({ id: "e1_2026-11-04" }),
      "2026-11-04",
      expect.any(Date),
      expect.any(Date),
      { shared: false }
    );
    const [, , start, end] = occ.move.mock.calls[0] as unknown as [unknown, string, Date, Date];
    expect(start.getHours()).toBe(8);
    expect(end.getTime() - start.getTime()).toBe(60 * 60 * 1000);
  });
});
