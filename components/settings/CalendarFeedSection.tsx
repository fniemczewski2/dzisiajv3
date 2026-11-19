// components/settings/CalendarFeedSection.tsx
//
// Prywatny adres kanału kalendarza (.ics, WebCal): zadania z terminem, wydarzenia i rutyny planu dnia do subskrypcji
// w Kalendarzu Apple, Thunderbirdzie i innych. Adres zawiera token – pokazywany jednorazowo; nowy token unieważnia
// poprzedni adres.

import React, { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useQueryState } from "@/hooks/useQueryState";
import { CopyButtonSmall } from "@/components/ui/CommonButtons";
import { FEED_FUTURE_DAYS, FEED_PAST_DAYS } from "@/lib/calendarFeed";

interface FeedStatus {
  created_at: string;
  last_used_at: string | null;
}

const BUTTON_CLASS =
  "font-semibold px-4 py-2 min-h-11 w-full bg-surface hover:bg-surface-hover text-text-secondary rounded-lg flex justify-center items-center gap-2 border border-line transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

const fmt = (iso: string) => new Date(iso).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });

export default function CalendarFeedSection() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const queryStatus = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<FeedStatus | null> => {
      const { data, error } = await supabase
        .from("calendar_feed_tokens")
        .select("created_at, last_used_at")
        .eq("user_id", user?.id as string)
        .abortSignal(signal)
        .maybeSingle<FeedStatus>();
      if (error) throw error;
      return data ?? null;
    },
    [user, supabase]
  );
  const {
    data: status,
    setData: setStatus,
    refetch,
  } = useQueryState<FeedStatus | null>({
    queryKey: ["calendar-feed-token", user?.id ?? null],
    queryFn: queryStatus,
    initial: null,
    enabled: Boolean(user),
  });

  const generate = async () => {
    if (status) {
      const ok = await toast.confirm(
        "Nowy adres unieważni obecny – subskrypcje trzeba będzie dodać ponownie. Kontynuować?",
        {
          confirmLabel: "Utwórz nowy",
        }
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/calendar/feed-token", { method: "POST" });
      const body = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !body.token) throw new Error(body.error ?? "Nie udało się utworzyć adresu.");
      setFeedUrl(`${globalThis.location.host}/api/calendar/feed/${body.token}.ics`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się utworzyć adresu.", { cause: err });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    const ok = await toast.confirm("Wyłączyć kanał? Subskrypcje przestaną się odświeżać.", { confirmLabel: "Wyłącz" });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/calendar/feed-token", { method: "DELETE" });
      if (!res.ok) throw new Error("Nie udało się wyłączyć kanału.");
      setFeedUrl(null);
      setStatus(null);
      toast.success("Kanał wyłączony.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się wyłączyć kanału.", { cause: err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card mb-4 p-4 transition-colors sm:p-6" id="webcal" aria-labelledby="webcal-heading">
      <h3 id="webcal-heading" className="mb-3 text-lg font-bold text-text">
        Kanał kalendarza (WebCal)
      </h3>
      <p className="mb-3 text-sm text-text-secondary">
        Subskrypcja w Kalendarzu Apple lub Thunderbirdzie: zadania z terminem, wydarzenia i rutyny planu dnia, od{" "}
        {FEED_PAST_DAYS} dni wstecz do {FEED_FUTURE_DAYS} dni naprzód. Tylko do odczytu. Adres jest tajny – kto go zna,
        widzi Twój plan.
      </p>
      {status && !feedUrl && (
        <p className="mb-3 text-xs text-text-secondary">
          Kanał aktywny od {fmt(status.created_at)}
          {status.last_used_at ? `, ostatnio pobrany ${fmt(status.last_used_at)}` : ", jeszcze niepobrany"}.
        </p>
      )}
      {feedUrl && (
        <div className="mb-4 space-y-2 rounded-lg border border-warning-line bg-warning-soft p-3">
          <p className="text-xs font-semibold text-warning">Zapisz adres teraz, nie pokażemy go ponownie.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs break-all">{`webcal://${feedUrl}`}</code>
            <CopyButtonSmall text={`webcal://${feedUrl}`} label="adres kanału" />
          </div>
          <a
            href={`webcal://${feedUrl}`}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-2"
          >
            Dodaj do kalendarza na tym urządzeniu
          </a>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void generate()} disabled={busy} aria-busy={busy} className={BUTTON_CLASS}>
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {status ? "Utwórz nowy adres" : "Utwórz adres"}
        </button>
        {status && (
          <button type="button" onClick={() => void revoke()} disabled={busy} className={BUTTON_CLASS}>
            Wyłącz kanał
          </button>
        )}
      </div>
    </section>
  );
}
