// components/mail/UnifiedMailList.tsx
//
// Wspólny widok skrzynek: wiadomości ze wszystkich kont i przekierowane w jednej liście, z etykietą źródła.
// Wiadomość konta otwiera się w panelu szczegółów (rodzic), przekierowana rozwija się w wierszu.

import React, { useState } from "react";
import NoResultsState from "@/components/ui/NoResultsState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { DeleteButton } from "@/components/ui/CommonButtons";
import { formatMailDate, senderName } from "@/lib/mail/format";
import type { MailMessageSummary } from "@/lib/mail/client";
import type { UnifiedMailItem } from "@/lib/mail/unified";
import { InboxRow } from "./InboxList";

interface Props {
  items: UnifiedMailItem[];
  loading: boolean;
  searching: boolean;
  selected: { accountId: string; id: string } | null;
  onSelect: (accountId: string, id: string) => void;
  onDeleteMessage: (accountId: string, message: MailMessageSummary) => void;
  onTask: (id: string) => void;
  onEvent: (id: string) => void;
  onDeleteInbox: (id: string) => void;
  busy: boolean;
}

export default function UnifiedMailList({
  items,
  loading,
  searching,
  selected,
  onSelect,
  onDeleteMessage,
  onTask,
  onEvent,
  onDeleteInbox,
  busy,
}: Readonly<Props>) {
  const [openInboxId, setOpenInboxId] = useState<string | null>(null);

  if (loading) return <SkeletonList count={6} variant="row" />;
  if (items.length === 0) {
    return searching ? (
      <NoResultsState text="wiadomości" isSearch />
    ) : (
      <NoResultsState text="wiadomości" hint="Skrzynki odbiorcze połączonych kont i przekierowania są puste." />
    );
  }

  return (
    <ul className="space-y-2" aria-label="Wszystkie wiadomości">
      {items.map((entry) => {
        if (entry.kind === "forwarded") {
          return (
            <InboxRow
              key={entry.key}
              item={entry.item}
              open={openInboxId === entry.item.id}
              onToggle={() => setOpenInboxId(openInboxId === entry.item.id ? null : entry.item.id)}
              onTask={onTask}
              onEvent={onEvent}
              onDelete={onDeleteInbox}
              busy={busy}
              sourceLabel="Przekierowanie"
            />
          );
        }
        const { message, accountId, accountLabel } = entry;
        const isSelected = selected?.accountId === accountId && selected.id === message.id;
        return (
          <li key={entry.key} className="card flex min-w-0 items-stretch overflow-hidden p-0">
            <button
              type="button"
              onClick={() => onSelect(accountId, message.id)}
              aria-current={isSelected ? "true" : undefined}
              className={`flex min-h-11 min-w-0 flex-1 flex-col gap-0.5 py-3 pr-2 pl-4 text-left transition-colors hover:bg-surface ${
                isSelected ? "border-l-4 border-primary bg-surface" : "border-l-4 border-transparent"
              }`}
            >
              <span className="flex w-full min-w-0 items-baseline justify-between gap-3">
                <span className="truncate text-sm font-semibold text-text">
                  {senderName(message.from) || "(nieznany nadawca)"}
                </span>
                <time dateTime={message.date ?? undefined} className="shrink-0 text-xs text-text-muted">
                  {formatMailDate(message.date)}
                </time>
              </span>
              <span className="w-full truncate text-sm text-text-secondary">{message.subject || "(bez tematu)"}</span>
              <span className="w-full truncate text-xs text-text-muted">{accountLabel}</span>
            </button>
            <div className="flex shrink-0 items-center pr-2">
              <DeleteButton
                onClick={() => onDeleteMessage(accountId, message)}
                small
                ariaLabel={`Usuń wiadomość ${message.subject || "bez tematu"}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
