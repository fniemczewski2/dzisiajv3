"use client";
import React, { createContext, useCallback, useContext, useReducer, useRef } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X, Loader2 } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "loading";

interface NotificationToast {
  kind: "notification";
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ConfirmToast {
  kind: "confirm";
  id: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (value: boolean) => void;
}

type ToastItem = NotificationToast | ConfirmToast;

type ToastAction =
  | { type: "ADD"; toast: ToastItem }
  | { type: "REMOVE"; id: string };

export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error:   (message: string) => void;
    info:    (message: string) => void;
    loading: (message?: string) => string;
    dismiss: (id: string) => void;
    confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  };
}

function toastReducer(state: ToastItem[], action: ToastAction): ToastItem[] {
  switch (action.type) {
    case "ADD":
      return [...state.slice(-4), action.toast];
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "bg-green-50 dark:bg-green-900/80 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300",
  error:   "bg-red-50 dark:bg-red-900/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
  info:    "bg-blue-50 dark:bg-blue-900/80 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300",
  loading: "bg-blue-50 dark:bg-blue-900/80 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300",
};

// ZMIANA: Zastąpienie stałej obiektowej na funkcję zwracającą nowe elementy (żeby animacje CSS się resetowały)
function ToastIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case "success": return <CheckCircle className="w-4 h-4 shrink-0" />;
    case "error":   return <XCircle className="w-4 h-4 shrink-0" />;
    case "info":    return <Info className="w-4 h-4 shrink-0" />;
    case "loading": return <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary" />;
    default:        return null;
  }
}

function NotificationEl({ item, onRemove }: { item: NotificationToast; onRemove: (id: string) => void }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 w-full px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 fade-in duration-300 ${VARIANT_STYLES[item.variant]}`}
    >
      {/* ZMIANA: Wywołanie ikony jako komponentu */}
      <ToastIcon variant={item.variant} />
      <span className="flex-1 leading-snug">{item.message}</span>
      <button
        onClick={() => onRemove(item.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Zamknij"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ConfirmEl({ item, onRemove }: { item: ConfirmToast; onRemove: (id: string) => void }) {
  const answer = (value: boolean) => {
    item.resolve(value);
    onRemove(item.id);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="false"
      className="flex flex-col gap-3 w-full px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 fade-in duration-300 bg-card border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
        <span className="flex-1 leading-snug text-text">{item.message}</span>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => answer(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-surface hover:bg-surfaceHover text-textSecondary transition-colors border border-gray-200 dark:border-gray-700"
        >
          {item.cancelLabel}
        </button>
        <button
          onClick={() => answer(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          {item.confirmLabel}
        </button>
      </div>
    </div>
  );
}

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const counter = useRef(0);

  const remove = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const addNotification = useCallback(
    (message: string, variant: ToastVariant, autoDismiss: boolean = true) => {
      const id = `toast-${++counter.current}`;
      dispatch({ type: "ADD", toast: { kind: "notification", id, message, variant } });
      
      if (autoDismiss) {
        setTimeout(() => remove(id), AUTO_DISMISS_MS);
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

  const toast = {
    success: (m: string) => { addNotification(m, "success"); },
    error:   (m: string) => { addNotification(m, "error"); },
    info:    (m: string) => { addNotification(m, "info"); },
    loading: (m: string = "Ładowanie...") => addNotification(m, "loading", false),
    dismiss: (id: string) => remove(id),
    confirm,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-label="Powiadomienia"
        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none"
      >
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto w-full">
            {item.kind === "confirm"
              ? <ConfirmEl item={item} onRemove={remove} />
              : <NotificationEl item={item} onRemove={remove} />
            }
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}