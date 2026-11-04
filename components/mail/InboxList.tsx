// components/mail/InboxList.tsx
//
// Przekierowane wiadomości z bufora: zwinięte do nagłówka, rozwinięcie pokazuje treść (HTML lub tekst).
// Zadanie i wydarzenie tymi samymi przyciskami co na pulpicie; wydarzenie tylko przy zaproszeniu z terminem.

import { MAIL_INBOX_RETENTION_HOURS } from "@/config/limits";
import React, { useState } from "react";
import { Calendar, ChevronDown, ListTodo } from "lucide-react";
import NoResultsState from "@/components/ui/NoResultsState";
import { AddSpecificButton, DeleteButton } from "@/components/ui/CommonButtons";
import { useResponsive } from "@/hooks/useResponsive";

import { formatMailDate, senderName } from "@/lib/mail/format";
import type { InboxItem } from "@/lib/mail/client";
import MailBody from "./MailBody";

interface Props {
  items: InboxItem[];
  searching: boolean;
  onTask: (id: string) => void;
  onEvent: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}

interface RowProps {
  item: InboxItem;
  open: boolean;
  onToggle: () => void;
  onTask: (id: string) => void;
  onEvent: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
  small: boolean;
  /** Etykieta źródła (np. „Przekierowanie”) pod tematem – w widoku wspólnym. */
  sourceLabel?: string;
}

/** Jeden przekierowany list: nagłówek (rozwija treść), zadanie, wydarzenie z zaproszenia, usunięcie. */
export function InboxRow({
  item,
  open,
  onToggle,
  onTask,
  onEvent,
  onDelete,
  busy,
  small,
  sourceLabel,
}: Readonly<RowProps>) {
  const bodyId = `inbox-body-${item.id}`;
  return (
    <li className="card min-w-0 overflow-hidden p-0">
      <div className="flex min-w-0 items-stretch gap-2 p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-h-11 min-w-0 flex-1 items-start gap-2 rounded-lg text-left"
        >
          <ChevronDown
            className={`mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold text-text">{senderName(item.from)}</span>
              <time dateTime={item.receivedAt} className="shrink-0 text-xs text-text-muted">
                {formatMailDate(item.receivedAt)}
              </time>
            </span>
            <span className="truncate text-sm text-text-secondary">{item.subject || "(bez tematu)"}</span>
            {sourceLabel && <span className="truncate text-xs text-text-muted">{sourceLabel}</span>}
            {item.invitation && (
              <span className="truncate text-xs font-semibold text-primary">
                {item.invitation.source === "date" ? "Termin w treści" : "Zaproszenie"}: {item.invitation.title}
              </span>
            )}
          </span>
        </button>
        <div className="flex shrink-0 items-stretch gap-2">
          <AddSpecificButton
            Icon={ListTodo}
            title="Dodaj zadanie „Odpowiedz: temat”"
            label="Zadanie"
            action={() => onTask(item.id)}
            small={small}
            disabled={busy}
          />
          {item.invitation?.start && (
            <AddSpecificButton
              Icon={Calendar}
              title="Dodaj wydarzenie z zaproszenia"
              label="Wydarzenie"
              action={() => onEvent(item.id)}
              small={small}
              disabled={busy}
            />
          )}
          <DeleteButton
            onClick={() => onDelete(item.id)}
            small={small}
            disabled={busy}
            ariaLabel={`Usuń wiadomość ${item.subject || "bez tematu"}`}
          />
        </div>
      </div>
      {open && (
        <div id={bodyId} className="border-t border-line p-3">
          <MailBody html={item.html} text={item.text} keyPrefix={item.id} />
        </div>
      )}
    </li>
  );
}

export default function InboxList({ items, searching, onTask, onEvent, onDelete, busy }: Readonly<Props>) {
  const isSmallScreen = useResponsive();
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return searching ? (
      <NoResultsState text="przekierowanych wiadomości" isSearch />
    ) : (
      <NoResultsState
        text="przekierowanych wiadomości"
        hint={`Przekierowane wiadomości są dostępne przez ${MAIL_INBOX_RETENTION_HOURS} godziny.`}
      />
    );
  }

  return (
    <ul className="space-y-3" aria-label="Przekierowane wiadomości">
      {items.map((item) => (
        <InboxRow
          key={item.id}
          item={item}
          open={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id)}
          onTask={onTask}
          onEvent={onEvent}
          onDelete={onDelete}
          busy={busy}
          small={isSmallScreen}
        />
      ))}
    </ul>
  );
}
