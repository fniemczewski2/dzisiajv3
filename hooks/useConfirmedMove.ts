// hooks/useConfirmedMove.ts
//
// Wspólny przebieg przeniesienia na planie dnia i w widoku tygodnia: pytanie „Przenieść…?”, zapis bez
// własnego toastu (hook edycji pokazuje tylko błąd), potwierdzenie z akcją „Cofnij” w oknie UNDO_WINDOW_MS.

import { useCallback } from "react";
import { useToast } from "@/providers/ToastProvider";
import { UNDO_WINDOW_MS } from "@/config/timing";

const MOVE_CONFIRM_OPTIONS = { confirmLabel: "Przenieś", cancelLabel: "Anuluj" } as const;

interface MoveRequest {
  title: string;
  /** Cel w treści komunikatu, np. „14:30” albo „26 listopada”. */
  targetLabel: string;
  /** Zapis przeniesienia; false = zapis odrzucony (bez potwierdzenia sukcesu). */
  apply: () => Promise<boolean>;
  /** Przywrócenie poprzedniego stanu z akcji „Cofnij”. */
  revert: () => Promise<boolean>;
}

export function useConfirmedMove() {
  const { toast } = useToast();

  return useCallback(
    async ({ title, targetLabel, apply, revert }: MoveRequest): Promise<boolean> => {
      const ok = await toast.confirm(`Przenieść „${title}” na ${targetLabel}?`, MOVE_CONFIRM_OPTIONS);
      if (!ok) return false;

      const saved = await apply();
      if (!saved) return false;

      toast.success(`Przeniesiono „${title}” na ${targetLabel}`, {
        durationMs: UNDO_WINDOW_MS,
        action: {
          label: "Cofnij",
          onClick: () => {
            void revert().then((undone) => {
              if (undone) toast.success("Cofnięto przeniesienie");
            });
          },
        },
      });
      return true;
    },
    [toast]
  );
}
