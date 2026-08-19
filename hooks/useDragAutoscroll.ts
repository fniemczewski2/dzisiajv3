// hooks/useDragAutoscroll.ts

import { useEffect, useRef } from "react";

/**
 * Extracted from DayView.tsx: while any drag is active, scrolls the window
 * when the pointer nears the top/bottom edge so long day plans stay
 * reachable during drag & drop. `active` gates the whole effect so listeners
 * are only attached for the duration of a drag.
 */
export function useDragAutoscroll(active: boolean): void {
  const lastMouseY = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    let animationFrameId: number;
    const scrollSpeed = 10;
    const edgeThreshold = 100;

    const autoScroll = () => {
      const y = lastMouseY.current;
      const h = window.innerHeight;
      if (y > h - edgeThreshold) window.scrollBy(0, scrollSpeed);
      else if (y < edgeThreshold) window.scrollBy(0, -scrollSpeed);
      animationFrameId = requestAnimationFrame(autoScroll);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (e instanceof MouseEvent) lastMouseY.current = e.clientY;
      else if (e.touches.length > 0) lastMouseY.current = e.touches[0].clientY;
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", handleMove);
    animationFrameId = requestAnimationFrame(autoScroll);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("touchmove", handleMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active]);
}
