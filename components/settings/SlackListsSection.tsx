// components/settings/SlackListsSection.tsx

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useToast } from "@/providers/ToastProvider";
import { AlertCircle, Hash, Link2, RefreshCw, Loader2, Star, Link2Off } from "lucide-react";
import { useSlackTasks, type SlackListConfig } from "@/hooks/db/useSlackTasks";
import SlackListEditor from "./SlackListEditor";
import { AddButton, DeleteButton, FormButtons, SecondaryFullButton } from "../ui/CommonButtons";

const CONNECT_ERRORS: Record<string, string> = {
  cancelled: "Anulowano łączenie ze Slackiem.",
  missing_params: "Slack nie zwrócił kodu autoryzacji. Spróbuj połączyć ponownie.",
  invalid_state: "Sesja łączenia wygasła albo została otwarta w innej przeglądarce. Połącz ponownie w tym samym oknie.",
  auth_failed: "Po powrocie ze Slacka nie było aktywnej sesji w aplikacji. Zaloguj się i połącz ponownie w tym samym oknie przeglądarki.",
  token_exchange_failed: "Slack odrzucił wymianę kodu. Sprawdź SLACK_CLIENT_SECRET i adres przekierowania w konfiguracji aplikacji Slack.",
  missing_tables: "Brakuje tabel integracji w bazie danych. Uruchom migracje Supabase.",
  store_failed: "Nie udało się zapisać połączenia w bazie danych.",
  unexpected: "Wystąpił nieoczekiwany błąd podczas łączenia ze Slackiem.",
};

function useSlackConnectResult(onConnected: () => void) {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!router.isReady) return;
    const { slack: connected, slack_error: error, ...rest } = router.query;
    if (!connected && !error) return;

    if (connected === "connected") {
      toast.success("Połączono ze Slackiem. Dodaj listę, którą chcesz synchronizować.");
      onConnected();
    } else if (typeof error === "string") {
      toast.error(CONNECT_ERRORS[error] ?? CONNECT_ERRORS.unexpected);
    }
    void router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
  }, [router, toast, onConnected]);
}

export default function SlackListsSection() {
  const slack = useSlackTasks();
  useSlackConnectResult(slack.refresh);
  const [listInputs, setListInputs] = useState<
    Record<string, { url: string; title: string; syncEnabled: boolean }>
  >({});
  const [showFrom, setShowFrom] = useState(false);

  const inputFor = (accountId: string) =>
    listInputs[accountId] ?? { url: "", title: "", syncEnabled: true };

  const setInput = (
    accountId: string,
    patch: Partial<{ url: string; title: string; syncEnabled: boolean }>
  ) => setListInputs((prev) => ({ ...prev, [accountId]: { ...inputFor(accountId), ...patch } }));

  const handleAddList = async (accountId: string) => {
    const { url, title, syncEnabled } = inputFor(accountId);
    await slack.addList(accountId, url, title, syncEnabled);
    setInput(accountId, { url: "", title: "", syncEnabled: true });
  };

  if (slack.loading) {
    return (
      <section className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4">
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Sprawdzam połączenia ze Slackiem…
        </p>
      </section>
    );
  }

  if (slack.statusError) {
    return (
      <section className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4">
        <div role="alert" className="flex items-start gap-3 text-sm text-red-800 dark:text-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <div className="space-y-2">
            <p className="font-semibold">Nie udało się sprawdzić połączeń ze Slackiem</p>
            <p className="text-text-secondary">{slack.statusError}</p>
            <button
              type="button"
              onClick={() => void slack.refresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-text hover:bg-surface-hover"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </section>
    );
  }

  const listsForAccount = (accountId: string): SlackListConfig[] =>
    slack.lists.filter((list) => list.connection_id === accountId);

  return (
    <section className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4 transition-colors space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3 text-text">
          <Hash className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          <h3 className="text-lg font-bold">Zadania w Slack Lists</h3>
        </div>
        {slack.lists.length > 0 && (
          <button
            type="button"
            onClick={() => void slack.syncNow()}
            disabled={slack.busy}
            aria-busy={slack.busy}
            className="px-3 py-1.5 text-sm bg-surface hover:bg-surface-hover text-text-secondary font-medium rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${slack.busy ? "animate-spin" : ""}`} aria-hidden="true" />
            Synchronizuj
          </button>
        )}
      </div>

      <div className="space-y-4">
        {slack.accounts.map((account) => (
          <div key={account.id} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-surface p-2">
            <div className="flex flex-wrap items-center justify-between">
              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void slack.disconnectAccount(account.id)}
                disabled={slack.busy}
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                <Link2Off className="w-4 h-4" />
              </button>
              <p className="font-medium text-text">{account.team_name ?? account.team_id}</p>
              </div>
              <AddButton
                onClick={() => setShowFrom((prev) => !prev)}
                small
              />
            </div>

            <ul className="space-y-3 my-3">
              {listsForAccount(account.id).map((list) => (
                <li key={list.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm text-text min-w-0">
                      {list.is_default && (
                        <Star
                          className="w-4 h-4 text-primary shrink-0"
                          aria-label="Lista domyślna dla nowych zadań"
                        />
                      )}
                      <span className="truncate">{list.list_title ?? list.list_id}</span>
                      <span className="text-xs text-text-muted font-mono">{list.list_id}</span>
                    </p>
                    <DeleteButton
                      small
                      onClick={() => void slack.removeList(list.id)}
                    />
                  </div>
                  <SlackListEditor
                    list={list}
                    columns={slack.columnsByList[list.id]}
                    busy={slack.busy}
                    onLoadColumns={() => void slack.loadColumns(list.id)}
                    onSave={(columnMap, isDefault, syncEnabled, assigneeEmails) =>
                      void slack.saveList(
                        list.id,
                        columnMap,
                        isDefault,
                        syncEnabled,
                        assigneeEmails
                      )
                    }
                  />
                </li>
              ))}
            </ul>
            {showFrom && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddList(account.id);
              }} 
              className="mt-3 flex flex-col"
            >
              <label htmlFor={`slack-list-url-${account.id}`} className="form-label mt-2">
                Link do listy Slack:
              </label>
              <input
                type="text"
                value={inputFor(account.id).url}
                onChange={(e) => setInput(account.id, { url: e.target.value })}
                placeholder="https://workspace.slack.com/lists/..."
                aria-label="Link do listy Slack"
                className="input-field"
                id={`slack-list-url-${account.id}`}
              />
              <label htmlFor={`slack-list-title-${account.id}`} className="form-label mt-2">
                Nazwa listy (opcjonalnie):
              </label>
              <input
                type="text"
                value={inputFor(account.id).title}
                onChange={(e) => setInput(account.id, { title: e.target.value })}
                placeholder="Nowa lista"
                aria-label="Nazwa listy Slack"
                className="input-field"
                id={`slack-list-title-${account.id}`}
              />
              <label className="flex items-start gap-2 mt-3 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={inputFor(account.id).syncEnabled}
                  onChange={(e) => setInput(account.id, { syncEnabled: e.target.checked })}
                  className="w-4 h-4 mt-0.5"
                  id={`slack-list-sync-${account.id}`}
                />
                <span>
                  Pobieraj zadania z tej listy{" "}
                  <span className="block text-text-muted">
                    Odznaczone: zadania jadą tylko z aplikacji do Slacka, nic nie wraca.
                  </span>
                </span>
              </label>
              <FormButtons
                onClickClose={() => setShowFrom(false)}
                disabled={slack.busy}
              />
            </form>
            )}
          </div>
        ))}
      </div>

      <SecondaryFullButton
        onClick={() => void slack.connect()}
        disabled={slack.busy}
        ariaBusy={slack.busy}
        Icon={Link2}
        className="mt-4"
      >
        {slack.accounts.length === 0 ? "Połącz ze Slackiem" : "Dodaj kolejne konto"}
      </SecondaryFullButton>
    </section>
  );
}