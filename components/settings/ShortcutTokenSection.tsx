// components/settings/ShortcutTokenSection.tsx

import React, { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { CopyButtonSmall } from "@/components/ui/buttons/copyButtonSmall";

interface TokenStatus {
  created_at: string;
  last_used_at: string | null;
}

const BUTTON_CLASS =
  "font-semibold px-4 py-2 w-full bg-surface hover:bg-surface-hover text-text-secondary rounded-lg flex justify-center items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });
}

export default function ShortcutTokenSection() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("shortcut_tokens")
      .select("created_at, last_used_at")
      .eq("user_id", user.id)
      .maybeSingle<TokenStatus>();
    if (!error) setStatus(data ?? null);
  }, [user, supabase]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const generate = async () => {
    if (status) {
      const ok = await toast.confirm(
        "Wygenerowanie nowego tokenu unieważni obecny – skrót na telefonie przestanie działać, dopóki go nie zaktualizujesz. Kontynuować?"
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/worklogs/token", { method: "POST" });
      const body = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !body.token) throw new Error(body.error ?? "Nie udało się wygenerować tokenu.");
      setFreshToken(body.token);
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się wygenerować tokenu.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    const ok = await toast.confirm("Unieważnić token? Skrót Siri przestanie działać.");
    if (!ok) return;
    setBusy(true);
    try {
      const response = await fetch("/api/worklogs/token", { method: "DELETE" });
      if (!response.ok) throw new Error("Nie udało się unieważnić tokenu.");
      setFreshToken(null);
      setStatus(null);
      toast.success("Token unieważniony.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się unieważnić tokenu.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4 transition-colors">
      <div className="flex items-center gap-3 text-text mb-4">
        <KeyRound className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
        <h3 className="text-lg font-bold">Skróty Siri</h3>
      </div>

      <p className="text-sm text-text-secondary mb-3">
        Jeden token obsługuje oba skróty. W aplikacji Skróty użyj akcji „Pobierz zawartość URL”
        z metodą POST, nagłówkiem <code className="font-mono">Authorization: Bearer &lt;token&gt;</code> i treścią JSON:
      </p>
      <dl className="mb-4 space-y-3 text-sm">
        <div>
          <dt className="font-semibold text-text">Szybka notatka</dt>
          <dd className="text-text-secondary">
            <code className="font-mono break-all">POST /api/quick-notes</code> z treścią{" "}
            <code className="font-mono">{`{"text":"…"}`}</code>. Wstaw tam wynik akcji „Podyktuj tekst”
            albo „Poproś o dane wejściowe”. Każda linia to osobny punkt na górze planu dnia.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-text">Czas pracy</dt>
          <dd className="text-text-secondary">
            <code className="font-mono break-all">POST /api/worklogs/auto</code> z treścią{" "}
            <code className="font-mono">{`{"action":"start"}`}</code> lub{" "}
            <code className="font-mono">{`{"action":"end"}`}</code>.
          </dd>
        </div>
      </dl>

      {status && !freshToken && (
        <p className="text-xs text-text-secondary mb-4">
          Token aktywny od {formatDateTime(status.created_at)}
          {status.last_used_at ? `, ostatnio użyty ${formatDateTime(status.last_used_at)}` : ", jeszcze nieużyty"}.
        </p>
      )}

      {freshToken && (
        <div className="mb-4 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
            Skopiuj token teraz – nie pokażemy go ponownie.
          </p>
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs break-all flex-1">{freshToken}</code>
            <CopyButtonSmall text={freshToken} label="token" />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={() => void generate()} disabled={busy} aria-busy={busy} className={BUTTON_CLASS}>
          {busy && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
          Wygeneruj token
        </button>
        {status && (
          <button type="button" onClick={() => void revoke()} disabled={busy} className={BUTTON_CLASS}>
            Unieważnij
          </button>
        )}
      </div>
    </section>
  );
}
