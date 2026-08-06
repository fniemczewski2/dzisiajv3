// components/settings/SlackListEditor.tsx

import React, { useEffect, useState } from "react";
import { SaveButton } from "../ui/CommonButtons";
import {
  SLACK_MAPPABLE_TASK_FIELDS,
  SLACK_FIELD_LABELS,
  formatAssigneeEmails,
  type SlackMappableTaskField,
} from "@/config/slack";
import type { SlackColumnOption, SlackListConfig } from "@/hooks/db/useSlackTasks";

type ColumnMap = Partial<Record<SlackMappableTaskField, string>>;

interface SlackListEditorProps {
  list: SlackListConfig;
  columns: SlackColumnOption[] | undefined;
  busy: boolean;
  onLoadColumns: () => void;
  onSave: (
    columnMap: ColumnMap,
    isDefault: boolean,
    syncEnabled: boolean,
    assigneeEmails: string
  ) => void;
}

export default function SlackListEditor({
  list,
  columns,
  busy,
  onLoadColumns,
  onSave,
}: Readonly<SlackListEditorProps>) {
  const [expanded, setExpanded] = useState(false);
  const [draftMap, setDraftMap] = useState<ColumnMap>(list.column_map ?? {});
  const [isDefault, setIsDefault] = useState(list.is_default);
  const [syncEnabled, setSyncEnabled] = useState(list.sync_enabled);
  const [assigneeEmails, setAssigneeEmails] = useState(
    formatAssigneeEmails(list.assignee_emails)
  );

  useEffect(() => {
    setDraftMap(list.column_map ?? {});
    setIsDefault(list.is_default);
    setSyncEnabled(list.sync_enabled);
    setAssigneeEmails(formatAssigneeEmails(list.assignee_emails));
  }, [list.column_map, list.is_default, list.sync_enabled, list.assignee_emails]);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && columns === undefined) onLoadColumns();
  };

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary transition-colors"
      >
        {expanded ? "Ukryj mapowanie" : "Mapowanie kolumn"}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 rounded-lg bg-surface p-3">
          {columns === undefined && <p className="text-xs text-textMuted">Wczytuję kolumny…</p>}
          {columns?.length === 0 && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Nie udało się odczytać kolumn tej listy.
            </p>
          )}

          {columns && columns.length > 0 && (
            <>
              {SLACK_MAPPABLE_TASK_FIELDS.map((field) => (
                <div key={field} className="flex items-center gap-2">
                  <label
                    htmlFor={`col-${list.id}-${field}`}
                    className="w-24 shrink-0 text-xs text-textSecondary"
                  >
                    {SLACK_FIELD_LABELS[field]}
                    {field === "title" && <span className="text-primary"> *</span>}
                  </label>
                  <select
                    id={`col-${list.id}-${field}`}
                    value={draftMap[field] ?? ""}
                    onChange={(e) =>
                      setDraftMap((prev) => ({ ...prev, [field]: e.target.value || undefined }))
                    }
                    className="input-field flex-1 min-w-0 text-sm"
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

              <label className="flex items-center gap-2 text-xs text-textSecondary">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4"
                />
                Nowe zadania z aplikacji trafiają na tę listę
              </label>

              <label className="flex items-start gap-2 text-xs text-textSecondary">
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => setSyncEnabled(e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                />
                <span>
                  Pobieraj zadania z tej listy
                  <span className="block text-textMuted">
                    Odznaczone: zadania jadą tylko z aplikacji do Slacka, nic nie wraca.
                  </span>
                </span>
              </label>

              {syncEnabled && (
                <div>
                  <label
                    htmlFor={`slack-emails-${list.id}`}
                    className="block text-xs text-textSecondary"
                  >
                    Pobieraj tylko zadania przypisane do (adresy e-mail):
                  </label>
                  <input
                    type="text"
                    id={`slack-emails-${list.id}`}
                    value={assigneeEmails}
                    onChange={(e) => setAssigneeEmails(e.target.value)}
                    placeholder="jan@firma.pl, anna@firma.pl"
                    className="input-field w-full text-sm mt-1"
                  />
                  <span className="block text-xs text-textMuted mt-1">
                    Puste = pobieraj wszystkie zadania z listy.
                  </span>
                </div>
              )}

              <SaveButton
                onClick={() => onSave(draftMap, isDefault, syncEnabled, assigneeEmails)}
                loading={busy}
                disabled={busy || !draftMap.title}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}