// components/letters/LetterNoticeScan.tsx
//
// Powiadomienia ePUAP / e-Doręczeń z wybranych skrzynek jako propozycje pism. Wybór skrzynek zapisuje się
// w ustawieniach (letter_mail_accounts). Wpis powstaje dopiero po zatwierdzeniu formularza pisma.

import React, { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useSettings } from "@/hooks/db/useSettings";
import { useToast } from "@/providers/ToastProvider";
import { createMailClient, type MailAccount } from "@/lib/mail/client";
import type { LetterNotice } from "@/lib/mail/letterNotices";
import { SecondaryFullButton } from "@/components/ui/CommonButtons";

export interface LetterProposal {
  issueDate: string;
  description: string;
}

interface Props {
  onPropose: (proposal: LetterProposal) => void;
}

const mail = createMailClient();

export default function LetterNoticeScan({ onPropose }: Readonly<Props>) {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<MailAccount[] | null>(null);
  const [notices, setNotices] = useState<LetterNotice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = settings.letter_mail_accounts ?? [];

  useEffect(() => {
    let active = true;
    mail
      .listAccounts()
      .then((list) => active && setAccounts(list))
      .catch(() => active && setAccounts([]));
    return () => {
      active = false;
    };
  }, []);

  const toggle = async (id: string, on: boolean) => {
    const next = on ? [...new Set([...selected, id])] : selected.filter((x) => x !== id);
    await updateSettings({ letter_mail_accounts: next.length > 0 ? next : null });
  };

  const scan = async () => {
    setBusy(true);
    try {
      const results = await Promise.all(
        selected.map(async (accountId) => {
          const res = await fetch(`/api/letters/scan?accountId=${encodeURIComponent(accountId)}`);
          const body = (await res.json()) as { notices?: LetterNotice[]; error?: string };
          if (!res.ok) throw new Error(body.error ?? "Nie udało się przeszukać skrzynki.");
          return body.notices ?? [];
        })
      );
      const all = results.flat().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      setNotices(all);
      if (all.length === 0) toast.info("Nie znaleziono powiadomień ePUAP ani e-Doręczeń.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się przeszukać skrzynki.", { cause: err });
    } finally {
      setBusy(false);
    }
  };

  if (accounts === null) return null;

  return (
    <section aria-labelledby="letter-scan-heading" className="card mb-6 space-y-3 p-4">
      <h2 id="letter-scan-heading" className="section-title">
        Powiadomienia ePUAP i e-Doręczeń
      </h2>
      {accounts.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Połącz skrzynkę w module Poczta, żeby wyszukiwać potwierdzenia UPO i UPP.
        </p>
      ) : (
        <>
          <fieldset className="space-y-1">
            <legend className="form-label">Przeszukiwane skrzynki:</legend>
            {accounts.map((a) => (
              <label key={a.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-primary"
                  checked={selected.includes(a.id)}
                  onChange={(e) => void toggle(a.id, e.target.checked)}
                />
                <span className="wrap-anywhere">{a.email}</span>
              </label>
            ))}
          </fieldset>
          <SecondaryFullButton
            Icon={busy ? Loader2 : Search}
            onClick={() => void scan()}
            disabled={busy || selected.length === 0}
            ariaBusy={busy}
          >
            Szukaj potwierdzeń
          </SecondaryFullButton>
        </>
      )}
      {notices && notices.length > 0 && (
        <ul className="space-y-2" aria-label="Propozycje pism">
          {notices.map((n) => (
            <li
              key={`${n.accountId}-${n.messageId}`}
              className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold wrap-anywhere text-text">{n.subject || "(bez tematu)"}</p>
                <p className="text-xs text-text-secondary">
                  {n.kind} · {n.date ?? "brak daty"} · <span className="wrap-anywhere">{n.from}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onPropose({
                    issueDate: n.date ?? "",
                    description: `Na podstawie powiadomienia ${n.kind}: ${n.subject}`.slice(0, 500),
                  })
                }
                className="min-h-11 rounded-lg border border-line-strong px-4 text-sm font-medium text-text hover:bg-surface-hover"
              >
                Utwórz pismo
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-text-muted">
        Odczytywane są tylko nagłówki wiadomości; nic nie jest zapisywane bez zatwierdzenia formularza. Sprawdź datę:
        termin biegnie od dnia złożenia pisma (doręczenia organowi).
      </p>
    </section>
  );
}
