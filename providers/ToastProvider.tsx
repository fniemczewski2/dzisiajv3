// providers/ToastProvider.tsx

import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useMemo } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X, Loader2 } from "lucide-react";
import {
  ToastItem,
  ToastAction,
  ToastContextValue,
  ToastVariant,
  NotificationToast,
  NotificationOptions,
  ConfirmToast,
  ConfirmOptions,
  BatchLabel,
} from "@/types/toasts";

function toastReducer(state: ToastItem[], action: ToastAction): ToastItem[] {
  switch (action.type) {
    case "ADD": {
      const confirms = state.filter((t) => t.kind === "confirm");
      const notifications = state.filter((t) => t.kind !== "confirm");
      const next =
        action.toast.kind === "confirm"
          ? [...notifications, ...confirms, action.toast]
          : [...notifications.slice(-4), ...confirms, action.toast];
      return next;
    }
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    case "UPDATE_MESSAGE":
      return state.map((t) =>
        t.id === action.id && t.kind === "notification" ? { ...t, message: action.message } : t
      );
    default:
      return state;
  }
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-l-success [--toast-icon:var(--color-green-700)] dark:[--toast-icon:var(--color-green-300)]",
  error: "border-l-danger [--toast-icon:var(--color-red-700)] dark:[--toast-icon:var(--color-red-300)]",
  info: "border-l-info [--toast-icon:var(--color-blue-700)] dark:[--toast-icon:var(--color-blue-300)]",
  loading: "border-l-info [--toast-icon:var(--color-blue-700)] dark:[--toast-icon:var(--color-blue-300)]",
};

function ToastIcon({ variant }: Readonly<{ variant: ToastVariant }>) {
  switch (variant) {
    case "success":
      return <CheckCircle2 aria-hidden="true" className="mt-px h-4.5 w-4.5 shrink-0 text-(--toast-icon)" />;
    case "error":
      return <XCircle aria-hidden="true" className="mt-px h-4.5 w-4.5 shrink-0 text-(--toast-icon)" />;
    case "info":
      return <Info aria-hidden="true" className="mt-px h-4.5 w-4.5 shrink-0 text-(--toast-icon)" />;
    case "loading":
      return <Loader2 aria-hidden="true" className="mt-px h-4.5 w-4.5 shrink-0 animate-spin text-(--toast-icon)" />;
    default:
      return null;
  }
}

function NotificationEl({ item, onRemove }: Readonly<{ item: NotificationToast; onRemove: (id: string) => void }>) {
  const className = `flex items-start gap-3 w-full pl-3.5 pr-2.5 py-3 rounded-xl border border-line border-l-4 bg-card text-text shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4 fade-in duration-300 ${VARIANT_STYLES[item.variant]}`;
  const content = (
    <>
      <ToastIcon variant={item.variant} />
      <span className="flex-1 leading-snug">{item.message}</span>
      {item.action && (
        <button
          onClick={() => {
            item.action?.onClick();
            onRemove(item.id);
          }}
          type="button"
          className="-my-1 shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          {item.action.label}
        </button>
      )}
      <button
        onClick={() => onRemove(item.id)}
        type="button"
        className="-my-1 shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
        aria-label="Zamknij powiadomienie"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </>
  );
  if (item.variant === "error") {
    return (
      <div role="alert" aria-live="assertive" className={className}>
        {content}
      </div>
    );
  }
  return (
    <output aria-live="polite" className={className}>
      {content}
    </output>
  );
}

function ConfirmEl({ item, onRemove }: Readonly<{ item: ConfirmToast; onRemove: (id: string) => void }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const answeredRef = useRef(false);

  const answer = (value: boolean) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    item.resolve(value);
    onRemove(item.id);
  };

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`confirm-msg-${item.id}`}
      onClose={() => answer(false)}
      onCancel={() => answer(false)}
      className="fixed inset-0 m-auto hidden h-fit w-[calc(100%-2rem)] max-w-sm flex-col gap-3 rounded-card border border-line bg-card px-4 py-4 text-sm font-medium shadow-2xl backdrop:bg-navy/50 backdrop:backdrop-blur-sm open:flex open:animate-in open:duration-200 open:fade-in open:zoom-in-95"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-warning" />
        <span id={`confirm-msg-${item.id}`} className="flex-1 text-[15px] leading-snug text-text">
          {item.message}
        </span>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => answer(false)}
          type="button"
          className="min-h-10 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-hover"
        >
          {item.cancelLabel}
        </button>
        <button
          onClick={() => answer(true)}
          type="button"
          className="min-h-10 rounded-lg bg-danger-solid px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger-solid-hover"
        >
          {item.confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

const AUTO_DISMISS_MS = 4000;
const AUTO_DISMISS_WITH_ACTION_MS = 8000;

export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const counter = useRef(0);

  const remove = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const addNotification = useCallback(
    (message: string, variant: ToastVariant, autoDismiss: boolean = true, options?: NotificationOptions) => {
      const id = `toast-${++counter.current}`;
      dispatch({ type: "ADD", toast: { kind: "notification", id, message, variant, action: options?.action } });

      if (autoDismiss) {
        const fallback = options?.action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS;
        setTimeout(() => remove(id), options?.durationMs ?? fallback);
      }

      return id;
    },
    [remove]
  );

  const confirm = useCallback((message: string, options: ConfirmOptions = {}): Promise<boolean> => {
    const id = `toast-${++counter.current}`;
    return new Promise<boolean>((resolve) => {
      dispatch({
        type: "ADD",
        toast: {
          kind: "confirm",
          id,
          message,
          confirmLabel: options.confirmLabel ?? "Usuń",
          cancelLabel: options.cancelLabel ?? "Anuluj",
          resolve,
        },
      });
    });
  }, []);

  const batch = useCallback(
    (label: BatchLabel, debounceMs = 600): (() => void) => {
      let count = 0;
      let toastId: string | undefined;
      let timerId: ReturnType<typeof setTimeout> | undefined;

      return function tick() {
        count += 1;

        if (!toastId) {
          toastId = addNotification(label(count), "success", false);
        } else {
          dispatch({ type: "UPDATE_MESSAGE", id: toastId, message: label(count) });
        }

        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(() => {
          if (toastId) setTimeout(() => remove(toastId!), AUTO_DISMISS_MS);
        }, debounceMs);
      };
    },
    [addNotification, remove]
  );

  const notifications = useMemo(
    () => toasts.filter((t): t is NotificationToast => t.kind === "notification"),
    [toasts]
  );
  const confirms = useMemo(() => toasts.filter((t): t is ConfirmToast => t.kind === "confirm"), [toasts]);

  const value = useMemo(
    () => ({
      toast: {
        success: (m: string, options?: NotificationOptions) => {
          addNotification(m, "success", true, options);
        },
        error: (m: string) => {
          addNotification(m, "error");
        },
        info: (m: string, options?: NotificationOptions) => {
          addNotification(m, "info", true, options);
        },
        loading: (m: string = "Ładowanie...") => addNotification(m, "loading", false),
        dismiss: (id: string) => remove(id),
        confirm,
        batch,
      },
    }),
    [addNotification, remove, confirm, batch]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section
        aria-label="Powiadomienia"
        className="pointer-events-none fixed bottom-28 left-1/2 z-9999 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 sm:bottom-32"
      >
        {notifications.map((item) => (
          <div key={item.id} className="pointer-events-auto w-full">
            <NotificationEl item={item} onRemove={remove} />
          </div>
        ))}
      </section>
      {/* Potwierdzenia renderujemy poza kontenerem powiadomień przyklejonym do
          dołu ekranu – modalny <dialog> trafia do top layer i jest wyśrodkowany. */}
      {confirms.map((item) => (
        <ConfirmEl key={item.id} item={item} onRemove={remove} />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
