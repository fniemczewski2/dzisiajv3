// types/toasts.ts

export type ToastVariant = "success" | "error" | "info" | "loading";

export interface ToastActionButton {
  readonly label: string;
  readonly onClick: () => void;
}

export interface NotificationOptions {
  readonly action?: ToastActionButton;
  readonly durationMs?: number;
}

export interface NotificationToast {
  readonly kind: "notification";
  readonly id: string;
  readonly message: string;
  readonly variant: ToastVariant;
  readonly action?: ToastActionButton;
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

export type BatchLabel = (count: number) => string;

export interface ToastContextValue {
  readonly toast: {
    readonly success: (message: string, options?: NotificationOptions) => void;
    readonly error:   (message: string) => void;
    readonly info:    (message: string, options?: NotificationOptions) => void;
    readonly loading: (message?: string) => string;
    readonly dismiss: (id: string) => void;
    readonly confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
    readonly batch: (label: BatchLabel, debounceMs?: number) => () => void;
  };
}