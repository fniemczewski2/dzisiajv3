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
  | { type: "REMOVE"; id: string };

export interface ConfirmOptions {
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}

export interface ToastContextValue {
  readonly toast: {
    readonly success: (message: string) => void;
    readonly error:   (message: string) => void;
    readonly info:    (message: string) => void;
    readonly loading: (message?: string) => string;
    readonly dismiss: (id: string) => void;
    readonly confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  };
}