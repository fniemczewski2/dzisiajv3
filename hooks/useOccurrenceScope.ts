// hooks/useOccurrenceScope.ts
//
// Zakres wyjątku terminu przy wydarzeniu współdzielonym: wyjątek może obowiązywać tylko autora
// albo obie strony. Pytamy dopiero wtedy, gdy wydarzenie rzeczywiście jest z kimś dzielone –
// przy zwykłym wydarzeniu nie ma o co pytać.

import { useCallback } from "react";
import { useToast } from "@/providers/ToastProvider";
import type { Event } from "@/types/events";

/** Czy wydarzenie jest komuś udostępnione (albo udostępnione nam). */
function isSharedEvent(event: Pick<Event, "shared_with_id" | "display_share_info">): boolean {
  return Boolean(event.shared_with_id || event.display_share_info);
}

export function useOccurrenceScope() {
  const { toast } = useToast();

  /** `shared: true` – zmiana widoczna dla obu stron; przy niedzielonym wydarzeniu bez pytania. */
  return useCallback(
    async (event: Event, action: "move" | "cancel" | "restore"): Promise<{ shared: boolean }> => {
      if (!isSharedEvent(event)) return { shared: false };
      const what = {
        move: "Nowy termin",
        cancel: "Odwołanie terminu",
        restore: "Przywrócenie terminu",
      }[action];
      const both = await toast.confirm(`${what} dotyczy wydarzenia współdzielonego. Dla kogo ma obowiązywać?`, {
        confirmLabel: "Dla obu stron",
        cancelLabel: "Tylko u mnie",
      });
      return { shared: both };
    },
    [toast]
  );
}
