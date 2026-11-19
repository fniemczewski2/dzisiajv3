// components/settings/ObsidianSection.tsx
//
// Vault Obsidiana w OneDrive lub Google Drive: połączenie, folder vaultu (OneDrive), synchronizacja na żądanie,
// duplikaty osób do decyzji, odłączenie.

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderCheck, NotebookPen, Plus, RefreshCw, Unplug } from "lucide-react";
import { IconActionButton, SecondaryFullButton } from "@/components/ui/CommonButtons";
import { useToast } from "@/providers/ToastProvider";
import VaultDuplicates from "@/components/settings/VaultDuplicates";

interface Connection {
  provider: "onedrive" | "gdrive";
  email: string;
  lastSyncedAt: string | null;
  rootPath: string | null;
}

interface Summary {
  uploaded: number;
  updatedInApp: number;
  imported: number;
  conflicts: number;
  skippedImports: number;
  pendingDuplicates: number;
}

const PROVIDER_NAME = { onedrive: "OneDrive", gdrive: "Google Drive" } as const;
const VAULT_LOCATION = { onedrive: "Aplikacje/dzisiaj.fun", gdrive: "Mój dysk/dzisiaj.fun" } as const;
/** Folder vaultu synchronizowanego przez Remotely Save (wersja bezpłatna, OneDrive App Folder). */
const SUGGESTED_ROOT = "Apps/remotely-save/Zeszyt";
const ERRORS: Record<string, string> = {
  denied: "Anulowano łączenie.",
  invalid_state: "Sesja łączenia wygasła. Spróbuj ponownie.",
  auth_failed: "Zaloguj się ponownie.",
  token_failed: "Dostawca odrzucił połączenie.",
  no_refresh: "Dostawca nie przekazał uprawnień. Spróbuj ponownie i zaakceptuj zgody.",
  profile_failed: "Nie udało się odczytać adresu konta.",
  save_failed: "Nie udało się zapisać połączenia.",
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Błąd połączenia.");
  return body;
}

function describeSummary(s: Summary): string {
  const parts = [
    `wysłano ${s.uploaded}`,
    `zaktualizowano w aplikacji ${s.updatedInApp}`,
    `zaimportowano ${s.imported}`,
    `konflikty ${s.conflicts}`,
  ];
  if (s.skippedImports > 0) parts.push(`pominięte pliki ${s.skippedImports}`);
  if (s.pendingDuplicates > 0) parts.push(`duplikaty osób do decyzji ${s.pendingDuplicates}`);
  return `Synchronizacja zakończona: ${parts.join(", ")}.`;
}

export default function ObsidianSection() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [rootDraft, setRootDraft] = useState<string | null>(null);
  const connection = useQuery({
    queryKey: ["vault-connection"],
    queryFn: async () => (await api<{ connection: Connection | null }>("/api/obsidian/connection")).connection,
  });

  useEffect(() => {
    if (!router.isReady) return;
    const { vault, vault_error } = router.query;
    if (typeof vault === "string")
      toast.success(`Połączono ${PROVIDER_NAME[vault as Connection["provider"]] ?? "chmurę"}.`);
    else if (typeof vault_error === "string") toast.error(ERRORS[vault_error] ?? "Wystąpił błąd połączenia.");
    else return;
    void router.replace("/settings#obsidian", undefined, { shallow: true });
  }, [router, toast]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd połączenia.", { cause: err });
    } finally {
      setBusy(false);
    }
  };

  const connect = (provider: Connection["provider"]) =>
    run(async () => {
      window.location.assign((await api<{ url: string }>(`/api/obsidian/${provider}`)).url);
    });

  const sync = () =>
    run(async () => {
      const { summary } = await api<{ summary: Summary }>("/api/obsidian/sync", { method: "POST" });
      toast.success(describeSummary(summary));
      await queryClient.invalidateQueries({ queryKey: ["vault-connection"] });
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
      await queryClient.invalidateQueries({ queryKey: ["vault-duplicates"] });
    });

  const saveRoot = (rootPath: string) =>
    run(async () => {
      const saved = await api<{ rootPath: string | null }>("/api/obsidian/connection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootPath }),
      });
      toast.success(saved.rootPath ? `Folder vaultu: ${saved.rootPath}.` : "Folder vaultu: folder aplikacji.");
      setRootDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["vault-connection"] });
    });

  const disconnect = async () => {
    const ok = await toast.confirm("Odłączyć vault? Pliki w chmurze i dane w aplikacji zostaną bez zmian.", {
      confirmLabel: "Odłącz",
      cancelLabel: "Anuluj",
    });
    if (!ok) return;
    await run(async () => {
      await api<void>("/api/obsidian/connection", { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["vault-connection"] });
    });
  };

  const conn = connection.data ?? null;
  return (
    <section
      id="obsidian"
      aria-labelledby="obsidian-heading"
      className="form-card mb-4 max-w-3xl scroll-mt-20 space-y-3"
    >
      <h2 id="obsidian-heading" className="section-title flex items-center gap-2">
        <NotebookPen className="h-5 w-5" aria-hidden="true" /> Obsidian
      </h2>
      <p className="text-sm text-text-secondary">
        Notatki (z folderami), przepisy, osoby i protokoły jako pliki Markdown w Twoim OneDrive lub Google Drive, w obie
        strony. Otwórz ten folder jako vault w Obsidianie. Zmiana po obu stronach daje kopię „konflikt”; usunięcia nie
        są przenoszone automatycznie.
      </p>
      {conn ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-text">
              {PROVIDER_NAME[conn.provider]} ({conn.email}) · folder{" "}
              <code>{conn.rootPath ?? VAULT_LOCATION[conn.provider]}</code>
              <br />
              <span className="text-text-muted">
                Ostatnia synchronizacja:{" "}
                {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString("pl-PL") : "jeszcze nie"}
              </span>
            </p>
            <IconActionButton
              Icon={Unplug}
              title="Odłącz vault"
              variant="danger"
              onClick={() => void disconnect()}
              disabled={busy}
            />
          </div>
          {conn.provider === "onedrive" && (
            <div className="space-y-1">
              <label htmlFor="vault-root" className="text-sm text-text-secondary">
                Folder vaultu w OneDrive (ścieżka od katalogu głównego; puste – folder aplikacji)
              </label>
              <div className="flex gap-2">
                <input
                  id="vault-root"
                  className="input-field flex-1"
                  maxLength={300}
                  placeholder={SUGGESTED_ROOT}
                  value={rootDraft ?? conn.rootPath ?? ""}
                  onChange={(e) => setRootDraft(e.target.value)}
                />
                <IconActionButton
                  Icon={FolderCheck}
                  title="Sprawdź i zapisz folder"
                  onClick={() => void saveRoot(rootDraft ?? conn.rootPath ?? "")}
                  disabled={busy || rootDraft === null}
                />
              </div>
            </div>
          )}
          <SecondaryFullButton Icon={RefreshCw} onClick={() => void sync()} disabled={busy}>
            Synchronizuj teraz
          </SecondaryFullButton>
          <VaultDuplicates />
        </>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <SecondaryFullButton Icon={Plus} onClick={() => void connect("onedrive")} disabled={busy}>
            Połącz OneDrive
          </SecondaryFullButton>
          <SecondaryFullButton Icon={Plus} onClick={() => void connect("gdrive")} disabled={busy}>
            Połącz Google Drive
          </SecondaryFullButton>
        </div>
      )}
    </section>
  );
}
