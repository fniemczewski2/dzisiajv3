// hooks/useDragSelectGrid.ts
//
// Zaznaczanie komórek siatki przeciąganiem – myszą, palcem i rysikiem.
//
// Na telefonie nie działało z trzech powodów:
// 1. elementFromPoint zwracał <button> w komórce, a atrybuty data-drag-* ma
//    <td> – teraz szukamy najbliższej komórki przez closest();
// 2. React rejestruje touchstart/touchmove jako pasywne, więc preventDefault()
//    nie blokował przewijania: przeglądarka zaczynała przewijać i przerywała
//    gest. Teraz komórki mają `touch-action: none` (patrz cellStyle);
// 3. dotyk „przechwytuje” wskaźnik na pierwszym elemencie, więc kolejne
//    komórki nie dostawały zdarzeń – zwalniamy przechwycenie i śledzimy
//    ruch na całej siatce (onPointerMove + elementFromPoint).

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

interface DragSelectGridOptions {
  onBegin: (groupId: string, cellId: string) => void;
  onExtend: (groupId: string, cellId: string) => void;
  onEnd?: () => void;
}

/**
 * Styl komórek: bez przewijania i powiększania gestem na komórce (inaczej
 * przeciąganie palcem przewija stronę) i bez menu po przytrzymaniu na iOS.
 * Siatkę przewija się, przesuwając nagłówki dat lub godzin.
 */
export const dragCellStyle: React.CSSProperties = {
  touchAction: "none",
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
};

function cellFromPoint(x: number, y: number): { groupId: string; cellId: string } | null {
  const hit = document.elementFromPoint(x, y);
  const cell = hit instanceof Element ? hit.closest<HTMLElement>("[data-drag-cell]") : null;
  const groupId = cell?.dataset.dragGroup;
  const cellId = cell?.dataset.dragCell;
  return groupId && cellId ? { groupId, cellId } : null;
}

export function useDragSelectGrid({ onBegin, onExtend, onEnd }: DragSelectGridOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const activeGroupRef = useRef<string | null>(null);
  const lastCellRef = useRef<string | null>(null);

  useEffect(() => {
    const stop = () => {
      if (!activeGroupRef.current) return;
      activeGroupRef.current = null;
      lastCellRef.current = null;
      setIsDragging(false);
      onEnd?.();
    };
    globalThis.addEventListener("pointerup", stop);
    globalThis.addEventListener("pointercancel", stop);
    return () => {
      globalThis.removeEventListener("pointerup", stop);
      globalThis.removeEventListener("pointercancel", stop);
    };
  }, [onEnd]);

  const begin = useCallback(
    (groupId: string, cellId: string) => {
      activeGroupRef.current = groupId;
      lastCellRef.current = cellId;
      setIsDragging(true);
      onBegin(groupId, cellId);
    },
    [onBegin]
  );

  const extend = useCallback(
    (groupId: string, cellId: string) => {
      if (activeGroupRef.current !== groupId || lastCellRef.current === cellId) return;
      lastCellRef.current = cellId;
      onExtend(groupId, cellId);
    },
    [onExtend]
  );

  /** Ruch po siatce (podpinany do kontenera): działa dla myszy, palca i rysika. */
  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!activeGroupRef.current) return;
      const cell = cellFromPoint(event.clientX, event.clientY);
      if (cell) extend(cell.groupId, cell.cellId);
    },
    [extend]
  );

  const cellHandlers = useCallback(
    (groupId: string, cellId: string) => ({
      "data-drag-group": groupId,
      "data-drag-cell": cellId,
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        // Dotyk przechwytuje wskaźnik na pierwszej komórce – zwalniamy, żeby
        // ruch nad kolejnymi komórkami był widoczny.
        const target = event.target as Element;
        if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
        begin(groupId, cellId);
      },
      style: dragCellStyle,
    }),
    [begin]
  );

  return { isDragging, cellHandlers, handlePointerMove, /** @deprecated użyj handlePointerMove */ handleTouchMove: handlePointerMove };
}
