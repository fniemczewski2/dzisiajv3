// components/settings/SlackListsSection.tsx

import React, { useState } from "react";
import { Hash, Link2, RefreshCw, Loader2, Star, Link2Off } from "lucide-react";
import { useSlackTasks, type SlackListConfig } from "@/hooks/db/useSlackTasks";
import SlackListEditor from "./SlackListEditor";
import { AddButton, DeleteButton, FormButtons } from "../ui/CommonButtons";

export default function SlackListsSection() {
  const slack = useSlackTasks();
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
        <p className="flex items-center gap-2 text-sm text-textSecondary">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Sprawdzam połączenia ze Slackiem…
        </p>
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
            className="px-3 py-1.5 text-sm bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
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
                      <span className="text-xs text-textMuted font-mono">{list.list_id}</span>
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
              <label className="flex items-start gap-2 mt-3 text-xs text-textSecondary">
                <input
                  type="checkbox"
                  checked={inputFor(account.id).syncEnabled}
                  onChange={(e) => setInput(account.id, { syncEnabled: e.target.checked })}
                  className="w-4 h-4 mt-0.5"
                  id={`slack-list-sync-${account.id}`}
                />
                <span>
                  Pobieraj zadania z tej listy
                  <span className="block text-textMuted">
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

      <button
        type="button"
        onClick={() => void slack.connect()}
        disabled={slack.busy}
        aria-busy={slack.busy}
        className="font-semibold px-4 py-2 mt- 4 w-full bg-surface hover:bg-surfaceHover text-textSecondary rounded-lg flex flex-1 justify-center items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        
        {slack.accounts.length === 0 ? "Połącz ze Slackiem" : "Dodaj kolejne konto"}
        <Link2 className="w-5 h-5" aria-hidden="true" />
      </button>
    </section>
  );
}