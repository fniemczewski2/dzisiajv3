// __tests__/hooks/useDragSelectGrid.test.tsx
//
// Przeciąganie palcem: zdarzenia wskaźnika trafiają w <button> wewnątrz
// komórki, a ruch śledzimy na siatce przez elementFromPoint.

import React, { useState } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useDragSelectGrid, dragCellStyle } from "@/hooks/useDragSelectGrid";

function Grid() {
  const [sel, setSel] = useState<string[]>([]);
  const { cellHandlers, handlePointerMove } = useDragSelectGrid({
    onBegin: (_g, c) => setSel([c]),
    onExtend: (_g, c) => setSel((s) => [...s, c]),
  });
  return (
    <div>
      <table onPointerMove={handlePointerMove}>
        <tbody>
          <tr>
            {["a", "b", "c"].map((c) => (
              <td key={c} {...cellHandlers("g", c)}>
                <button type="button">{c}</button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <output>{sel.join(",")}</output>
    </div>
  );
}

const original = document.elementFromPoint;
afterEach(() => {
  document.elementFromPoint = original;
});

describe("useDragSelectGrid", () => {
  it("przeciąganie palcem po przyciskach w komórkach zaznacza kolejne komórki", () => {
    render(<Grid />);
    fireEvent.pointerDown(screen.getByText("a"), { pointerType: "touch", pointerId: 1 });
    for (const c of ["b", "c", "c"]) {
      document.elementFromPoint = () => screen.getByText(c); // trafienie w <button>, nie w <td>
      fireEvent.pointerMove(screen.getByRole("table"), { pointerType: "touch", pointerId: 1 });
    }
    expect(screen.getByRole("status").textContent).toBe("a,b,c");
  });

  it("po puszczeniu palca ruch już nie zaznacza", () => {
    render(<Grid />);
    fireEvent.pointerDown(screen.getByText("a"), { pointerType: "touch", pointerId: 1 });
    act(() => {
      globalThis.dispatchEvent(new Event("pointerup"));
    });
    document.elementFromPoint = () => screen.getByText("b");
    fireEvent.pointerMove(screen.getByRole("table"), { pointerType: "touch", pointerId: 1 });
    expect(screen.getByRole("status").textContent).toBe("a");
  });

  it("komórki blokują przewijanie gestem (touch-action: none)", () => {
    render(<Grid />);
    expect((screen.getByText("a").closest("td") as HTMLElement).style.touchAction).toBe(dragCellStyle.touchAction);
  });
});
