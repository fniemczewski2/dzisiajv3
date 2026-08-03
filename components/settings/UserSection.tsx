// components/settings/UserSection.tsx

import React, { useState } from "react";
import { CircleUser, LogOut, TriangleAlert, Loader2, Trash, Trash2 } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/config/userData";

interface UserSectionProps {
  email: string | undefined;
  onSignOut: () => void;
}

export default function UserSection({ email, onSignOut }: Readonly<UserSectionProps>) {
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmation.trim() === ACCOUNT_DELETE_CONFIRMATION;

  const handleDeleteAccount = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmation.trim() }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(body.error ?? "Usuwanie konta nie powiodło się.");
        return;
      }

      toast.success("Konto i wszystkie dane zostały usunięte.");
      globalThis.location.href = "/start";
    } catch {
      toast.error("Usuwanie konta nie powiodło się.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-text">
          <div>
            <CircleUser className="w-5 h-5 text-primary flex-shrink-0" />
          </div>
          <h3 className="text-lg font-bold">Użytkownik</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          type="button"
          className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary transition-colors"
        >
          {showDetails ? "Ukryj tech." : "Techniczne"}
        </button>
      </div>


          <div className="flex flex-col text-xs sm:text-sm gap-2 py-4">
            <h4 className="flex items-center gap-2 text-sm font-bold text-text mb-2">
              <CircleUser className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
              Zalogowano jako
            </h4>
            <span className="px-2.5 py-1 font-mono font-medium rounded-md card text-text truncate max-w-full">
              {email || "Brak danych"}
            </span>
          </div>

      <button
        onClick={onSignOut}
        type="button"
        className="font-semibold px-4 py-2 w-full bg-surface hover:bg-surfaceHover text-textSecondary rounded-lg flex flex-1 justify-center items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span>Wyloguj się</span>
        <LogOut className="w-5 h-5" />
      </button>

      <div className="flex flex-col text-xs sm:text-sm gap-2 py-4">
        <h4 className="flex items-center gap-2 text-sm font-bold text-text my-2">
          <TriangleAlert className="w-4 h-4  text-red-600 dark:text-red-400 flex-shrink-0" aria-hidden="true" />
          Usunięcie konta
        </h4>
        <p className="text-sm text-textSecondary mb-3">
          Usuwa konto wraz ze wszystkimi danymi.
          Operacji nie da się cofnąć.
        </p>
      </div>

        {!showDeletePanel && (
          <button
            onClick={() => setShowDeletePanel(true)}
            type="button"
            className="font-semibold px-4 py-2 w-full bg-surface hover:bg-surfaceHover text-red-600 dark:text-red-400 rounded-lg flex flex-1 justify-center items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
            Usuń konto
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </button>
        )}

        {showDeletePanel && (
          <div className="space-y-3">
            <label htmlFor="delete-confirmation" className="block text-sm text-text">
              Wpisz <strong>{ACCOUNT_DELETE_CONFIRMATION}</strong>, aby potwierdzić:
            </label>
            <input
              id="delete-confirmation"
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              className="input-field w-full"
              aria-describedby="delete-confirmation-hint"
            />
            <p id="delete-confirmation-hint" className="text-xs text-textMuted">
              Po usunięciu nastąpi wylogowanie. Odzyskanie danych nie będzie możliwe.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={!canDelete || deleting}
                aria-busy={deleting}
                className="px-4 py-2 text-sm font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {deleting ? "Usuwam konto…" : "Usuń konto na zawsze"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeletePanel(false);
                  setConfirmation("");
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-surface hover:bg-surfaceHover text-textSecondary border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-50"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}
      </div>
  );
}
