// components/mail/MessageDetail.tsx
//
// Wiadomość: nagłówek, przyciski „Zadanie” i „Wydarzenie” (jak na pulpicie), zaproszenie, treść (HTML lub tekst)
// i odpowiedź. Odpowiedź: podgląd, a potem potwierdzenie toast.confirm – dopiero wtedy jest wysyłana.

import React, { useState } from "react";
import { Calendar, CalendarCheck, ChevronLeft, ListTodo, MapPin, Video } from "lucide-react";
import { AddSpecificButton, DeleteButton } from "@/components/ui/CommonButtons";
import { useResponsive } from "@/hooks/useResponsive";
import { useToast } from "@/providers/ToastProvider";
import { linkifyText } from "@/lib/noteFormatting";
import { formatMailDate, senderName } from "@/lib/mail/format";
import type { Invitation } from "@/lib/mail/invitations";
import type { MailClient, MailMessageFull } from "@/lib/mail/client";
import MailBody from "./MailBody";

interface Props {
  client: MailClient;
  accountId: string;
  message: MailMessageFull;
  invitation: Invitation | null;
  onBack?: () => void;
  onDelete: () => void;
}

const MAX_REPLY_LENGTH = 10_000;

export default function MessageDetail({ client, accountId, message, invitation, onBack, onDelete }: Readonly<Props>) {
  const { toast } = useToast();
  const isSmallScreen = useResponsive();
  const [body, setBody] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string, failure: string): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : failure, { cause: err });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!(await toast.confirm(`Wysłać odpowiedź do ${message.from}?`))) return;
    const sent = await run(
      () => client.sendReply({ accountId, messageId: message.id, body: body.trim() }),
      "Odpowiedź wysłana.",
      "Nie udało się wysłać odpowiedzi."
    );
    if (sent) {
      setBody("");
      setPreviewing(false);
    }
  };

  const canAddEvent = Boolean(invitation?.start);

  return (
    <article className="card min-w-0 space-y-4 p-4 sm:p-5" aria-labelledby="message-subject">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-text-secondary hover:text-text"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Wiadomości
        </button>
      )}

      <header className="flex min-w-0 items-start justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0 space-y-1">
          <h2 id="message-subject" className="section-title wrap-anywhere">
            {message.subject || "(bez tematu)"}
          </h2>
          <p className="text-sm wrap-anywhere text-text-secondary">
            <span className="font-semibold text-text">{senderName(message.from)}</span>
            {senderName(message.from) !== message.from && <span> · {message.from}</span>}
          </p>
          {message.date && (
            <time dateTime={message.date} className="block text-xs text-text-muted">
              {formatMailDate(message.date)}
            </time>
          )}
        </div>
        <div className="flex shrink-0 items-stretch gap-2">
          <AddSpecificButton
            Icon={ListTodo}
            title="Dodaj zadanie „Odpowiedz: temat”"
            label="Zadanie"
            action={() =>
              void run(
                () => client.createTask(accountId, message.id),
                "Dodano zadanie.",
                "Nie udało się dodać zadania."
              )
            }
            small={isSmallScreen}
            disabled={busy}
          />
          {canAddEvent && (
            <AddSpecificButton
              Icon={Calendar}
              title="Dodaj wydarzenie z zaproszenia"
              label="Wydarzenie"
              action={() =>
                void run(
                  () => client.createEvent(accountId, message.id),
                  "Dodano wydarzenie do kalendarza.",
                  "Nie udało się dodać wydarzenia."
                )
              }
              small={isSmallScreen}
              disabled={busy}
            />
          )}
          <DeleteButton onClick={onDelete} small={isSmallScreen} disabled={busy} ariaLabel="Usuń wiadomość" />
        </div>
      </header>

      {invitation && (
        <section
          aria-labelledby="invitation-heading"
          className="min-w-0 space-y-1.5 rounded-lg border border-primary/30 bg-surface p-3"
        >
          <h3 id="invitation-heading" className="flex items-center gap-2 text-sm font-semibold wrap-anywhere text-text">
            <CalendarCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Zaproszenie: {invitation.title}
          </h3>
          {invitation.start ? (
            <p className="text-sm text-text-secondary">
              {formatMailDate(invitation.start)}
              {invitation.allDay ? " (cały dzień)" : ""}
            </p>
          ) : (
            <p className="text-sm text-text-muted">Brak daty w zaproszeniu – nie można dodać go do kalendarza.</p>
          )}
          {invitation.location && (
            <p className="flex items-start gap-2 text-sm wrap-anywhere text-text-secondary">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {linkifyText(invitation.location, `loc-${message.id}`)}
            </p>
          )}
          {invitation.conferenceLinks.map((link) => (
            <p key={link} className="flex min-w-0 items-center gap-2 text-sm">
              <Video className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-medium text-primary underline"
              >
                {link.replace(/^https?:\/\//, "")}
              </a>
            </p>
          ))}
        </section>
      )}

      <MailBody html={message.html} text={message.text} inlineImages={message.inlineImages} keyPrefix={message.id} />

      <section aria-labelledby="reply-heading" className="space-y-3 border-t border-line pt-4">
        <h3 id="reply-heading" className="text-sm font-semibold text-text">
          Odpowiedz
        </h3>
        <label htmlFor="reply-body" className="sr-only">
          Treść odpowiedzi
        </label>
        <textarea
          id="reply-body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setPreviewing(false);
          }}
          rows={5}
          maxLength={MAX_REPLY_LENGTH}
          className="input-field w-full"
          placeholder="Napisz odpowiedź…"
        />
        {previewing ? (
          <div className="space-y-3 rounded-lg border border-line p-3">
            <p className="text-sm wrap-anywhere text-text-secondary">Do: {message.from}</p>
            <p className="text-sm wrap-anywhere whitespace-pre-wrap text-text">{body.trim()}</p>
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || body.trim().length === 0}
              className="min-h-11 rounded-lg bg-secondary px-4 text-sm font-semibold text-white hover:bg-secondary-hover disabled:opacity-50"
            >
              Wyślij
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPreviewing(true)}
            disabled={body.trim().length === 0}
            className="min-h-11 rounded-lg border border-line-strong px-4 text-sm font-semibold text-text hover:bg-surface disabled:opacity-50"
          >
            Podgląd odpowiedzi
          </button>
        )}
      </section>
    </article>
  );
}
