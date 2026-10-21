// components/settings/UserSection.tsx

import { clearLocalUserData } from "@/lib/localUserData";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { CircleUser, LogOut, TriangleAlert, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/config/userData";
import { SecondaryFullButton } from "@/components/ui/CommonButtons";

interface UserSectionProps {
  email: string | undefined;
  onSignOut: () => void;
}

export default function UserSection({ email, onSignOut }: Readonly<UserSectionProps>) {
  const { toast } = useToast();
  const router = useRouter();
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
      await clearLocalUserData();
      await router.replace("/start");
    } catch {
      toast.error("Usuwanie konta nie powiodło się.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card mb-4 p-4 shadow-sm transition-colors sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-text">
          <h3 className="text-lg font-bold">Użytkownik</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          type="button"
          className="text-xs font-bold text-primary transition-colors hover:text-primary-strong"
        >
          {showDetails ? "Ukryj tech." : "Techniczne"}
        </button>
      </div>

      <div className="flex flex-col gap-2 py-4 text-xs sm:text-sm">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-text">
          Zalogowano jako
        </h4>
        <span className="card max-w-full truncate px-2.5 py-1 font-mono font-medium text-text">
          {email || "Brak danych"}
        </span>
      </div>

      <SecondaryFullButton onClick={onSignOut} Icon={LogOut}>
        Wyloguj się
      </SecondaryFullButton>

      <div className="flex flex-col gap-2 py-4 text-xs sm:text-sm">
        <h4 className="my-2 flex items-center gap-2 text-sm font-bold text-text">
          Usunięcie konta
        </h4>
        <p className="mb-3 text-sm text-text-secondary">
          Usuwa konto wraz ze wszystkimi danymi. Operacji nie da się cofnąć.
        </p>
      </div>

      {!showDeletePanel && (
        <SecondaryFullButton onClick={() => setShowDeletePanel(true)} Icon={Trash2} variant="danger">
          Usuń konto
        </SecondaryFullButton>
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
          <p id="delete-confirmation-hint" className="text-xs text-text-muted">
            Po usunięciu nastąpi wylogowanie. Odzyskanie danych nie będzie możliwe.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={!canDelete || deleting}
              aria-busy={deleting}
              className="flex items-center gap-2 rounded-lg bg-danger-solid px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-danger-solid-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {deleting ? "Usuwam konto…" : "Usuń konto na zawsze"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDeletePanel(false);
                setConfirmation("");
              }}
              disabled={deleting}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
