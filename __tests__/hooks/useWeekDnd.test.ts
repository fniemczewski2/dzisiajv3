// __tests__/hooks/useWeekDnd.test.ts
//
// Przeniesienie w widoku tygodnia: zadanie i wydarzenie dostają nowy dzień (godzina bez zmian), toast z „Cofnij”;
// seria wydarzeń nie jest zapisywana; upuszczenie w tym samym dniu lub poza kolumną – brak zmian.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const h = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn(), confirm: vi.fn(async () => true) }));
vi.mock("@/providers/ToastProvider", () => ({
  useToast: () => ({ toast: { success: h.success, error: vi.fn(), info: h.info, confirm: h.confirm } }),
}));

import { useWeekDnd } from "@/hooks/useWeekDnd";

const task = {
  id: 7,
  title: "Trening",
  status: "pending",
  due_date: "2026-11-19",
  scheduled_time: "2026-11-19T18:00:00+00",
} as never;
const event = {
  id: "e1",
  title: "Spotkanie",
  start_time: "2026-11-19T09:00:00+00",
  end_time: "2026-11-19T10:00:00+00",
  repeat: "none",
} as never;
const series = { ...(event as object), id: "s1_2026-11-19", repeat: "weekly" } as never;

const drop = (kind: "task" | "event", itemId: string, day: string, overId: string | null) =>
  ({
    active: { id: `week-${kind}-${itemId}`, data: { current: { kind, itemId, day, type: kind } } },
    over: overId ? { id: overId } : null,
  }) as never;

beforeEach(() => {
  h.success.mockReset();
  h.info.mockReset();
  h.confirm.mockReset();
  h.confirm.mockResolvedValue(true);
});

describe("useWeekDnd", () => {
  it("zadanie na inny dzień: nowy termin, ta sama godzina, toast z „Cofnij”", async () => {
    const editTask = vi.fn(async () => true);
    const { result } = renderHook(() => useWeekDnd({ tasks: [task], events: [], editTask, editEvent: vi.fn() }));
    await act(async () => {
      await result.current.handleDragEnd(drop("task", "7", "2026-11-19", "day-2026-11-21"));
    });
    expect(editTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, due_date: "2026-11-21", scheduled_time: "2026-11-21T18:00:00+00" }),
      { silent: true }
    );
    expect(h.success).toHaveBeenCalledWith(
      "Przeniesiono „Trening” na 21 listopada",
      expect.objectContaining({ action: expect.objectContaining({ label: "Cofnij" }) })
    );
  });

  it("„Cofnij” przywraca poprzedni termin i godzinę", async () => {
    const editTask = vi.fn(async () => true);
    const { result } = renderHook(() => useWeekDnd({ tasks: [task], events: [], editTask, editEvent: vi.fn() }));
    await act(async () => {
      await result.current.handleDragEnd(drop("task", "7", "2026-11-19", "day-2026-11-21"));
    });
    const [, options] = h.success.mock.calls[0] as [string, { action: { onClick: () => void } }];
    await act(async () => {
      options.action.onClick();
    });
    expect(editTask).toHaveBeenLastCalledWith(
      expect.objectContaining({ due_date: "2026-11-19", scheduled_time: "2026-11-19T18:00:00+00" }),
      { silent: true }
    );
  });

  it("wydarzenie na inny dzień: przesunięcie o różnicę dni, godziny bez zmian", async () => {
    const editEvent = vi.fn(async () => true);
    const { result } = renderHook(() => useWeekDnd({ tasks: [], events: [event], editTask: vi.fn(), editEvent }));
    await act(async () => {
      await result.current.handleDragEnd(drop("event", "e1", "2026-11-19", "day-2026-11-18"));
    });
    expect(editEvent).toHaveBeenCalledWith(
      expect.objectContaining({ start_time: "2026-11-18T09:00:00+00", end_time: "2026-11-18T10:00:00+00" }),
      { silent: true }
    );
  });

  it("wystąpienie serii: bez zapisu i bez pytania, komunikat informacyjny", async () => {
    const editEvent = vi.fn(async () => true);
    const { result } = renderHook(() => useWeekDnd({ tasks: [], events: [series], editTask: vi.fn(), editEvent }));
    await act(async () => {
      await result.current.handleDragEnd(drop("event", "s1_2026-11-19", "2026-11-19", "day-2026-11-20"));
    });
    expect(editEvent).not.toHaveBeenCalled();
    expect(h.confirm).not.toHaveBeenCalled();
    expect(h.info).toHaveBeenCalled();
  });

  it("ten sam dzień, upuszczenie poza kolumną lub odmowa: brak zapisu", async () => {
    const editTask = vi.fn(async () => true);
    const { result } = renderHook(() => useWeekDnd({ tasks: [task], events: [], editTask, editEvent: vi.fn() }));
    await act(async () => {
      await result.current.handleDragEnd(drop("task", "7", "2026-11-19", "day-2026-11-19"));
      await result.current.handleDragEnd(drop("task", "7", "2026-11-19", "slot-09:00"));
      await result.current.handleDragEnd(drop("task", "7", "2026-11-19", null));
    });
    h.confirm.mockResolvedValueOnce(false);
    await act(async () => {
      await result.current.handleDragEnd(drop("task", "7", "2026-11-19", "day-2026-11-20"));
    });
    expect(editTask).not.toHaveBeenCalled();
    expect(h.success).not.toHaveBeenCalled();
  });
});
