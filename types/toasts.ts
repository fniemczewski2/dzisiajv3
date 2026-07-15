export type ToastVariant = "success" | "error" | "info" | "loading";

export interface NotificationToast {
  readonly kind: "notification";
  readonly id: string;
  readonly message: string;
  readonly variant: ToastVariant;
}

export interface ConfirmToast {
  readonly kind: "confirm";
  readonly id: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly resolve: (value: boolean) => void;
}

export type ToastItem = NotificationToast | ConfirmToast;

export type ToastAction =
  | { type: "ADD"; toast: ToastItem }
  | { type: "REMOVE"; id: string }
  | { type: "UPDATE_MESSAGE"; id: string; message: string };

export interface ConfirmOptions {
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}

// Funkcja tłumacząca klucz batch na czytelny komunikat zbiorczy.
// Przykład: "bill" → "Dodano rachunki (12)"
export type BatchLabel = (count: number) => string;

export interface ToastContextValue {
  readonly toast: {
    readonly success: (message: string) => void;
    readonly error:   (message: string) => void;
    readonly info:    (message: string) => void;
    readonly loading: (message?: string) => string;
    readonly dismiss: (id: string) => void;
    readonly confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
    /** Grupuje wielokrotne sukcesy w jeden zbiorczy toast.
     *  @param label  funkcja (count) => string, np. n => `Dodano rachunki (${n})`
     *  @param debounceMs  czas ciszy po ostatnim wywołaniu przed emisją (domyślnie 600 ms)
     *  @returns funkcja którą wywołujesz raz per element */
    readonly batch: (label: BatchLabel, debounceMs?: number) => () => void;
  };
}