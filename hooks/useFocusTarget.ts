// hooks/useFocusTarget.ts
//
// Otwarcie wpisu z adresu `?focus=<id>` (powiązania @/!/$): po wczytaniu listy przewija do elementu
// `id="item-<id>"`, ustawia na nim fokus i na chwilę wyróżnia. Parametr jest usuwany z adresu, żeby odświeżenie
// strony nie powtarzało przewinięcia. Gdy wpisu nie ma w bieżącym widoku – komunikat.

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useToast } from "@/providers/ToastProvider";
import { FOCUS_HIGHLIGHT_MS } from "@/config/timing";

export function focusElementId(id: string): string {
  return `item-${id}`;
}

/** `ready` – lista wczytana (element może już istnieć w DOM). */
export function useFocusTarget(ready: boolean): string | null {
  const router = useRouter();
  const { toast } = useToast();
  const raw = router.query.focus;
  const focus = typeof raw === "string" && /^[\w-]{1,80}$/.test(raw) ? raw : null;

  useEffect(() => {
    if (!focus || !ready) return;
    const el = document.getElementById(focusElementId(focus));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
      el.classList.add("focus-highlight");
      globalThis.setTimeout(() => el.classList.remove("focus-highlight"), FOCUS_HIGHLIGHT_MS);
    } else {
      toast.info("Wpis nie jest widoczny w tym widoku (sprawdź filtry).");
    }
    const { focus: _omit, ...rest } = router.query;
    void router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true, scroll: false });
  }, [focus, ready, router, toast]);

  return focus;
}
