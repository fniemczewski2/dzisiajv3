// components/settings/SlackListsSection.tsx

import React, { useEffect, useState } from "react";
import { Hash, Link2, RefreshCw, Loader2, Link2Off } from "lucide-react";
import { useSlackTasks } from "@/hooks/db/useSlackTasks";
import { AddButton, SaveButton } from "../ui/CommonButtons";
import { SLACK_MAPPABLE_TASK_FIELDS, SLACK_FIELD_LABELS, type SlackMappableTaskField } from "@/config/slack";

export default function SlackListsSection() {
  const { connection, columns, loading, busy, connect, disconnect, selectList, saveColumnMap, syncNow } =
    useSlackTasks();

  const [listInput, setListInput] = useState("");
  const [draftMap, setDraftMap] = useState<Partial<Record<SlackMappableTaskField, string>>>({});

  useEffect(() => {
    setDraftMap(connection?.column_map ?? {});
  }, [connection?.column_map]);

  if (loading) {
    return (
      <section className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4">
        <p className="flex items-center gap-2 text-sm text-textSecondary">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Sprawdzam połączenie ze Slackiem…
        </p>
      </section>
    );
  }

  return (
    <section className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4 transition-colors">
      <div className="flex items-center gap-3 text-text mb-4">
        <Hash className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
        <h3 className="text-lg font-bold">Zadania w Slack Lists</h3>
      </div>

      {!connection && (
        <>
          <p className="text-sm text-textSecondary mb-4">
            Połącz konto Slack, żeby synchronizować zadania z listą.
          </p>
          <button
            type="button"
            onClick={() => void connect()}
            disabled={busy}
            aria-busy={busy}
            className="font-semibold px-4 py-2 w-full bg-surface hover:bg-surfaceHover text-textSecondary rounded-lg flex flex-1 justify-center items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Link2 className="w-5 h-5" aria-hidden="true" />
            Połącz ze Slackiem
          </button>
        </>
      )}

      {connection && (
        <div className="space-y-4">
          <p className="text-sm text-textSecondary">
            Połączono z workspace <strong>{connection.team_name ?? "Slack"}</strong>.
          </p>

          <div>
            <label htmlFor="slack-list" className="block text-sm font-medium text-text mb-1">
              Link do listy lub jej identyfikator
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="slack-list"
                type="text"
                value={listInput}
                onChange={(e) => setListInput(e.target.value)}
                placeholder={connection.list_id ?? "https://app.slack.com/lists/…/F01234ABCD"}
                className="input-field flex-1 min-w-0"
              />
              <SaveButton
                small
                onClick={() => void selectList(listInput)}
                disabled={busy || listInput.trim() === ""}
              />
            </div>
            {connection.list_id && (
              <p className="mt-1 text-xs text-textMuted">Aktualna lista: {connection.list_id}</p>
            )}
          </div>

          {connection.list_id && columns.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-text">Mapowanie kolumn</h4>
              {SLACK_MAPPABLE_TASK_FIELDS.map((field) => (
                <div key={field} className="flex items-center gap-2">
                  <label htmlFor={`slack-col-${field}`} className="w-28 flex-shrink-0 text-sm text-textSecondary">
                    {SLACK_FIELD_LABELS[field]}
                    {field === "title" && <span className="text-primary"> *</span>}
                  </label>
                  <select
                    id={`slack-col-${field}`}
                    value={draftMap[field] ?? ""}
                    onChange={(e) =>
                      setDraftMap((prev) => ({ ...prev, [field]: e.target.value || undefined }))
                    }
                    className="input-field flex-1 min-w-0"
                  >
                    <option value="">— nie synchronizuj —</option>
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.name} ({column.type})
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-2">
                <SaveButton
                  onClick={() => void saveColumnMap(draftMap)}
                  loading={busy}
                  disabled={busy || !draftMap.title}
                />
                <button
                  type="button"
                  onClick={() => void syncNow()}
                  disabled={busy || !connection.column_map.title}
                  aria-busy={busy}
                  className="px-4 py-2 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-5 h-5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
                  Synchronizuj teraz
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={busy}
            aria-busy={busy}
            className="font-semibold px-4 py-2 w-full bg-surface hover:bg-surfaceHover text-textSecondary rounded-lg flex flex-1 justify-center items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Odłącz Slacka
            <Link2Off className="w-5 h-5" />
          </button>
        </div>
      )}
    </section>
  );
}
