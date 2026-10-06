// providers/ToastProvider.tsx

import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useMemo } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X, Loader2 } from "lucide-react";
import { ToastItem, ToastAction, ToastContextValue, ToastVariant, NotificationToast, NotificationOptions, ConfirmToast, ConfirmOptions, BatchLabel } from "@/types/toasts";

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
        t.id === action.id && t.kind === "notification"
          ? { ...t, message: action.message }
          : t
      );
    default:
      return state;
  }
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-l-green-600 dark:border-l-green-400 [--toast-icon:var(--color-green-700)] dark:[--toast-icon:var(--color-green-300)]",
  error:   "border-l-red-600 dark:border-l-red-400 [--toast-icon:var(--color-red-700)] dark:[--toast-icon:var(--color-red-300)]",
  info:    "border-l-blue-600 dark:border-l-blue-400 [--toast-icon:var(--color-blue-700)] dark:[--toast-icon:var(--color-blue-300)]",
  loading: "border-l-blue-600 dark:border-l-blue-400 [--toast-icon:var(--color-blue-700)] dark:[--toast-icon:var(--color-blue-300)]",
};

function ToastIcon({ variant }: Readonly<{ variant: ToastVariant }>) {
  switch (variant) {
    case "success": return <CheckCircle aria-hidden="true" className="w-4.5 h-4.5 mt-px shrink-0 text-(--toast-icon)" />;
    case "error":   return <XCircle aria-hidden="true" className="w-4.5 h-4.5 mt-px shrink-0 text-(--toast-icon)" />;
    case "info":    return <Info aria-hidden="true" className="w-4.5 h-4.5 mt-px shrink-0 text-(--toast-icon)" />;
    case "loading": return <Loader2 aria-hidden="true" className="w-4.5 h-4.5 mt-px shrink-0 animate-spin text-(--toast-icon)" />;
    default:        return null;
  }
}

function NotificationEl({ item, onRemove }: Readonly<{ item: NotificationToast; onRemove: (id: string) => void }>) {
  return (
    <div
      role={item.variant === "error" ? "alert" : "status"}
      aria-live={item.variant === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-3 w-full pl-3.5 pr-2.5 py-3 rounded-xl border border-line border-l-4 bg-card text-text shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4 fade-in duration-300 ${VARIANT_STYLES[item.variant]}`}
    >
      <ToastIcon variant={item.variant} />
      <span className="flex-1 leading-snug">{item.message}</span>
      {item.action && (
        <button
          onClick={() => { item.action?.onClick(); onRemove(item.id); }}
          type='button'
          className="shrink-0 -my-1 px-2.5 py-1 rounded-md text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          {item.action.label}
        </button>
      )}
      <button
        onClick={() => onRemove(item.id)}
        type='button'
        className="shrink-0 -my-1 p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface transition-colors"
        aria-label="Zamknij powiadomienie"
      >
        <X aria-hidden="true" className="w-4 h-4" />
      </button>
    </div>
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
      // Tailwind preflight zeruje marginesy (`* { margin: 0 }`), przez co <dialog>
      // otwarty przez showModal() traci domyślne `margin: auto` i ląduje w lewym
      // górnym rogu. `fixed inset-0 m-auto h-fit` przywraca wyśrodkowanie w pionie
      // i poziomie. `open:flex` zamiast `flex`, żeby nie nadpisywać ukrywania
      // zamkniętego dialogu (`dialog:not([open]) { display: none }`).
      className="fixed inset-0 m-auto h-fit hidden open:flex flex-col gap-3 w-[calc(100%-2rem)] max-w-sm px-4 py-4 rounded-2xl border shadow-2xl text-sm font-medium bg-card border-line backdrop:bg-navy/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 open:duration-200"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-300" />
        <span id={`confirm-msg-${item.id}`} className="flex-1 leading-snug text-text text-[15px]">{item.message}</span>
      </div>
      <div className="flex gap-2 justify-end">
        {/* Bez autoFocus: showModal() sam ustawia fokus na pierwszym
            interaktywnym elemencie dialogu, czyli na tym (bezpiecznym) przycisku. */}
        <button
          onClick={() => answer(false)}
          type='button'
          className="min-h-10 px-4 py-2 rounded-lg text-sm font-semibold bg-surface hover:bg-surface-hover text-text-secondary transition-colors border border-line"
        >
          {item.cancelLabel}
        </button>
        <button
          onClick={() => answer(true)}
          type='button'
          className="min-h-10 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
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

  const confirm = useCallback(
    (message: string, options: ConfirmOptions = {}): Promise<boolean> => {
      const id = `toast-${++counter.current}`;
      return new Promise<boolean>((resolve) => {
        dispatch({
          type: "ADD",
          toast: {
            kind: "confirm",
            id,
            message,
            confirmLabel: options.confirmLabel ?? "Usuń",
            cancelLabel:  options.cancelLabel  ?? "Anuluj",
            resolve,
          },
        });
      });
    },
    []
  );

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
  const confirms = useMemo(
    () => toasts.filter((t): t is ConfirmToast => t.kind === "confirm"),
    [toasts]
  );

  const value = useMemo(() => ({
    toast: {
      success: (m: string, options?: NotificationOptions) => { addNotification(m, "success", true, options); },
      error:   (m: string) => { addNotification(m, "error"); },
      info:    (m: string, options?: NotificationOptions) => { addNotification(m, "info", true, options); },
      loading: (m: string = "Ładowanie...") => addNotification(m, "loading", false),
      dismiss: (id: string) => remove(id),
      confirm,
      batch,
    }
  }), [addNotification, remove, confirm, batch]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section
        aria-label="Powiadomienia"
        className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-9999 flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none"
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