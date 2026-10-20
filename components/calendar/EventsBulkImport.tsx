// components/calendar/EventsBulkImport.tsx
//
// Masowe dodawanie wydarzeń: wklejasz listę (harmonogram zjazdów, terminy
// posiedzeń, plan konferencji…), aplikacja rozpoznaje w każdej linii datę,
// godziny i nazwę, pokazuje podgląd i dodaje zaznaczone wydarzenia.
// Wydarzenia o tej samej nazwie w tym samym dniu, które już są w kalendarzu,
// są odznaczone. Opcjonalnie: przypomnienie o biletach 30 dni wcześniej.

import React, { useId, useMemo, useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { eventEndTime, parseBulkEvents, type BulkEvent } from "@/lib/bulkEvents";
import { createTicketReminderTask, TICKET_REMINDER_DAYS_BEFORE } from "@/lib/travelTickets";
import { getAppDate } from "@/lib/dateUtils";
import EventCategorySelect from "./EventCategorySelect";

interface Props {
  onImported: () => void;
  onClose: () => void;
}

const fmt = (day: string) => day.split("-").reverse().join(".");

function whenLabel(e: BulkEvent): string {
  const days = e.start === e.end ? fmt(e.start) : `${fmt(e.start)} – ${fmt(e.end)}`;
  if (!e.startTime) return `${days}, cały dzień`;
  return `${days}, ${e.startTime}–${eventEndTime(e.startTime, e.endTime)}`;
}

const PLACEHOLDER = [
  "15.10.2026 10:00–12:00 Posiedzenie zarządu",
  "Konferencja NGO | 20-22.11.2026",
  "17-18.10 Zjazd",
].join("\n");

export default function EventsBulkImport({ onImported, onClose }: Readonly<Props>) {
  const id = useId();
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [defaultTitle, setDefaultTitle] = useState("Wydarzenie");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tickets, setTickets] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const today = getAppDate();
  const events = useMemo(() => parseBulkEvents(text), [text]);
  const titleOf = (e: BulkEvent) => e.title || defaultTitle.trim() || "Wydarzenie";
  const selected = events.filter((e) => !excluded.has(e.key) && e.end >= today);

  /** Odznacza wydarzenia, które już są w kalendarzu (ta sama nazwa i dzień startu). */
  const checkExisting = async (found: BulkEvent[]) => {
    if (!user || found.length === 0) return;
    const from = found.reduce((m, e) => (e.start < m ? e.start : m), found[0].start);
    const to = found.reduce((m, e) => (e.end > m ? e.end : m), found[0].end);
    const { data } = await supabase
      .from("events")
      .select("title, start_time")
      .eq("user_id", user.id)
      .gte("start_time", `${from}T00:00:00+00`)
      .lte("start_time", `${to}T23:59:59+00`);
    const taken = new Set(
      (data ?? []).map(
        (e) => `${(e as { title: string }).title}|${String((e as { start_time: string }).start_time).slice(0, 10)}`
      )
    );
    const dup = new Set(found.filter((e) => taken.has(`${titleOf(e)}|${e.start}`)).map((e) => e.key));
    setExisting(dup);
    setExcluded(dup);
  };

  const toggle = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const importAll = async () => {
    if (!user || selected.length === 0) return;
    setBusy(true);
    try {
      const rows = selected.map((e) => {
        const start = e.startTime ? `${e.start}T${e.startTime}:00+00` : `${e.start}T00:00:00+00`;
        const end = e.startTime ? `${e.end}T${eventEndTime(e.startTime, e.endTime)}:00+00` : `${e.end}T23:59:00+00`;
        return {
          title: titleOf(e).slice(0, 200),
          description: "",
          start_time: start,
          end_time: end,
          place: place.trim(),
          repeat: "none",
          user_id: user.id,
          ...(category ? { category } : {}),
        };
      });
      const { error } = await supabase.from("events").insert(rows);
      if (error) throw error;

      let ticketErrors = 0;
      if (tickets && category) {
        const results = await Promise.all(
          selected.map((e) =>
            createTicketReminderTask(supabase, user.id, {
              title: `${titleOf(e)} ${fmt(e.start)}`,
              startDay: e.start,
              category,
            })
          )
        );
        ticketErrors = results.filter((r) => r.error).length;
      }
      toast.success(`Dodano wydarzenia: ${selected.length}.`);
      if (ticketErrors > 0) toast.error(`Nie udało się dodać części przypomnień o biletach (${ticketErrors}).`);
      onImported();
      onClose();
    } catch {
      toast.error("Nie udało się dodać wydarzeń.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby={`${id}-title`} className="form-card max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <h2 id={`${id}-title`} className="section-title flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" />
          Dodaj wiele wydarzeń
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij import"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <p className="text-sm text-text-secondary">
        Wklej listę – każda linia to wydarzenie: data lub zakres dat (np. 15.10.2026, 20-22.11, 7 listopada),
        opcjonalnie godziny (10:00–12:00) i nazwa.
      </p>

      <div>
        <label htmlFor={`${id}-text`} className="form-label">
          Lista wydarzeń:
        </label>
        <textarea
          id={`${id}-text`}
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => void checkExisting(parseBulkEvents(text))}
          placeholder={PLACEHOLDER}
          className="input-field"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className="form-label">
            Nazwa, gdy w linii jej brak:
          </label>
          <input
            id={`${id}-name`}
            value={defaultTitle}
            onChange={(e) => setDefaultTitle(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor={`${id}-place`} className="form-label">
            Miejsce (wszystkie):
          </label>
          <input
            id={`${id}-place`}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="input-field"
            placeholder="opcjonalnie"
          />
        </div>
      </div>

      <EventCategorySelect id={`${id}-category`} value={category} onChange={setCategory} />

      <div className="flex items-start gap-3">
        <input
          id={`${id}-tickets`}
          type="checkbox"
          checked={tickets && Boolean(category)}
          disabled={!category}
          onChange={(e) => setTickets(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <label htmlFor={`${id}-tickets`} className="cursor-pointer text-text">
          Przypomnij o biletach {TICKET_REMINDER_DAYS_BEFORE} dni przed każdym wydarzeniem
        </label>
      </div>

      <div aria-live="polite">
        {text.trim() && events.length === 0 && (
          <p className="text-sm text-text-secondary">Nie znalazłem dat w tym tekście.</p>
        )}
        {events.length > 0 && (
          <fieldset className="min-w-0">
            <legend className="form-label">Podgląd ({selected.length} do dodania):</legend>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {events.map((e) => {
                const past = e.end < today;
                const dup = existing.has(e.key);
                return (
                  <li key={e.key}>
                    <label
                      className={`flex min-h-11 items-center gap-3 px-3 py-1.5 ${past ? "opacity-60" : "cursor-pointer"}`}
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0"
                        checked={!excluded.has(e.key) && !past}
                        disabled={past}
                        onChange={() => toggle(e.key)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="sr-only">Importuj wydarzenie: </span>
                        <span className={`block font-medium ${e.title ? "text-text" : "text-text-secondary"}`}>
                          {titleOf(e)}
                        </span>
                        <span className="block text-sm text-text-secondary tabular-nums">
                          {whenLabel(e)}
                          {past && " – minęło"}
                          {dup && " – już w kalendarzu"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}
      </div>

      <button
        type="button"
        onClick={() => void importAll()}
        disabled={busy || selected.length === 0}
        className="min-h-11 rounded-lg bg-secondary px-4 font-semibold text-white hover:bg-secondary-hover disabled:opacity-50"
      >
        {busy ? "Dodaję…" : `Dodaj do kalendarza (${selected.length})`}
      </button>
    </section>
  );
}
