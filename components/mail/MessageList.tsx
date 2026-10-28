// components/mail/MessageList.tsx

import React from "react";
import NoResultsState from "@/components/ui/NoResultsState";
import { Trash2 } from "lucide-react";
import { SkeletonList } from "@/components/ui/Skeleton";
import type { MailMessageSummary } from "@/lib/mail/client";
import { formatMailDate, senderName } from "@/lib/mail/format";
import { DeleteButton } from "../ui/CommonButtons";

interface Props {
  messages: MailMessageSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (message: MailMessageSummary) => void;
  loading: boolean;
  searching: boolean;
}

export default function MessageList({ messages, selectedId, onSelect, onDelete, loading, searching }: Readonly<Props>) {
  if (loading) return <SkeletonList count={6} variant="row" />;
  if (messages.length === 0) {
    return searching ? (
      <NoResultsState text="wiadomości" isSearch />
    ) : (
      <NoResultsState text="wiadomości" hint="Folder odbiorczy tego konta jest pusty." />
    );
  }
  return (
    <ul className="card divide-y divide-line overflow-hidden p-0" aria-label="Wiadomości">
      {messages.map((m) => {
        const selected = selectedId === m.id;
        return (
          <li key={m.id} className="group flex min-w-0 justify-between">
            <button
              type="button"
              onClick={() => onSelect(m.id)}
              aria-current={selected ? "true" : undefined}
              className={`flex min-h-11 min-w-0 flex-1 flex-col gap-0.5 py-3 pr-2 pl-4 text-left transition-colors hover:bg-surface-hover ${
                selected ? "border-l-4 border-primary bg-surface" : "border-l-4 border-transparent"
              }`}
            >
              <span className="flex w-full min-w-0 items-baseline justify-between gap-3">
                <span className="truncate text-sm font-semibold text-text">
                  {senderName(m.from) || "(nieznany nadawca)"}
                </span>
                <time dateTime={m.date ?? undefined} className="shrink-0 text-xs text-text-muted">
                  {formatMailDate(m.date)}
                </time>
              </span>
              <span className="w-full truncate text-sm text-text-secondary">{m.subject || "(bez tematu)"}</span>
            </button>
            <div className="p-2 flex items-center justify-center w-[20%]">
              <DeleteButton
                onClick={() => onDelete(m)}
                aria-label={`Usuń wiadomość ${m.subject || "bez tematu"}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
