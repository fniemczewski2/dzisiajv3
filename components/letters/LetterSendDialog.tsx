// components/letters/LetterSendDialog.tsx
//
// Wysyłka pisma e-mailem z połączonej skrzynki. Treść jest edytowalna; wysyłka wymaga drugiego potwierdzenia
// (toast.confirm) i trafia do /api/letters/send z confirm: true.

import React, { useEffect, useId, useState } from "react";
import { Send } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { CancelButton } from "@/components/ui/CommonButtons";
import { useToast } from "@/providers/ToastProvider";
import { createMailClient, type MailAccount } from "@/lib/mail/client";
import type { Letter } from "@/types/letters";

interface Props {
  letter: Letter;
  body: string;
  subject: string;
  open: boolean;
  onClose: () => void;
}

const mail = createMailClient();

export default function LetterSendDialog({
  letter,
  body: initialBody,
  subject: initialSubject,
  open,
  onClose,
}: Readonly<Props>) {
  const id = useId();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    mail
      .listAccounts()
      .then((list) => {
        if (!active) return;
        setAccounts(list);
        setAccountId((current) => current || list[0]?.id || "");
      })
      .catch(() => active && setAccounts([]));
    return () => {
      active = false;
    };
  }, [open]);

  const send = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const from = accounts.find((a) => a.id === accountId)?.email ?? "";
    const ok = await toast.confirm(`Wysłać pismo ${letter.signature} z ${from} do ${to}?`, {
      confirmLabel: "Wyślij",
      cancelLabel: "Anuluj",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/letters/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, to: to.trim(), subject, body, confirm: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Nie udało się wysłać pisma.");
      toast.success(`Wysłano pismo ${letter.signature}.`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się wysłać pisma.", { cause: err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy={`${id}-title`}>
      <form onSubmit={(e) => void send(e)} className="flex flex-col gap-3" aria-busy={busy}>
        <h2 id={`${id}-title`} className="section-title">
          Wyślij pismo {letter.signature}
        </h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-text-secondary">Połącz skrzynkę w module Poczta, żeby wysyłać pisma.</p>
        ) : (
          <>
            <div>
              <label htmlFor={`${id}-from`} className="form-label">
                Nadawca:
              </label>
              <select
                id={`${id}-from`}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="input-field"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-to`} className="form-label">
                Adres organu:
              </label>
              <input
                id={`${id}-to`}
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="input-field"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label htmlFor={`${id}-subject`} className="form-label">
                Temat:
              </label>
              <input
                id={`${id}-subject`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-field"
                maxLength={200}
                required
              />
            </div>
            <div>
              <label htmlFor={`${id}-body`} className="form-label">
                Treść:
              </label>
              <textarea
                id={`${id}-body`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="input-field"
                rows={10}
                maxLength={10_000}
                required
              />
            </div>
            <p className="text-xs text-text-muted">
              Wniosek o informację publiczną można złożyć e-mailem. Podanie w trybie KPA wysłane zwykłym e-mailem nie
              spełnia formy z art. 63 § 1 KPA (adres do doręczeń elektronicznych, ePUAP) – organ może wezwać do jej
              uzupełnienia (art. 64 § 2 KPA).
            </p>
          </>
        )}
        <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row">
          <CancelButton onClick={onClose} />
          {accounts.length > 0 && (
            <button
              type="submit"
              disabled={busy || !accountId || !to.trim()}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-4 font-semibold text-white transition-colors hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Wyślij
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
