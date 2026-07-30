// hooks/useDragSelectGrid.ts

import { useCallback, useEffect, useRef, useState } from "react";

interface DragSelectGridOptions {
  onBegin: (groupId: string, cellId: string) => void;
  onExtend: (groupId: string, cellId: string) => void;
  onEnd?: () => void;
}

export function useDragSelectGrid({ onBegin, onExtend, onEnd }: DragSelectGridOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const activeGroupRef = useRef<string | null>(null);

  useEffect(() => {
    const stop = () => {
      if (!activeGroupRef.current) return;
      activeGroupRef.current = null;
      setIsDragging(false);
      onEnd?.();
    };
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchend", stop);
    };
  }, [onEnd]);

  const begin = useCallback(
    (groupId: string, cellId: string) => {
      activeGroupRef.current = groupId;
      setIsDragging(true);
      onBegin(groupId, cellId);
    },
    [onBegin]
  );

  const extend = useCallback(
    (groupId: string, cellId: string) => {
      if (activeGroupRef.current !== groupId) return;
      onExtend(groupId, cellId);
    },
    [onExtend]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const groupId = target?.getAttribute("data-drag-group");
      const cellId = target?.getAttribute("data-drag-cell");
      if (groupId && cellId) extend(groupId, cellId);
    },
    [extend]
  );

  const cellHandlers = useCallback(
    (groupId: string, cellId: string) => ({
      "data-drag-group": groupId,
      "data-drag-cell": cellId,
      onMouseDown: () => begin(groupId, cellId),
      onMouseEnter: () => extend(groupId, cellId),
      onTouchStart: (event: React.TouchEvent) => {
        event.preventDefault();
        begin(groupId, cellId);
      },
    }),
    [begin, extend]
  );

  return { isDragging, cellHandlers, handleTouchMove };
}
