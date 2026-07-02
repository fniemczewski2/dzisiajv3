import { useState} from "react";
export function useResponsive(breakpoint: number = 900) {
  const [isMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  return isMobile;
}
