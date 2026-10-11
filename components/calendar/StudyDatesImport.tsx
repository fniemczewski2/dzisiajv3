// components/calendar/StudyDatesImport.tsx
//
// Import terminów zjazdów: wklejasz harmonogram skopiowany ze strony uczelni,
// aplikacja wyszukuje daty, pokazuje podgląd (terminy już obecne w kalendarzu
// są odznaczone) i tworzy wydarzenia całodniowe. Opcjonalnie dodaje zadania
// „Kup bilety” na 30 dni przed każdym zjazdem.

import React, { useId, useMemo, useState } from "react";
import { GraduationCap, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { parseStudyDates, type StudyDateRange } from "@/lib/zjazdyParser";
import { createTicketReminderTask, TICKET_REMINDER_DAYS_BEFORE } from "@/lib/travelTickets";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import EventCategorySelect from "./EventCategorySelect";

interface Props {
  onImported: () => void;
  onClose: () => void;
}

const fmt = (day: string) => day.split("-").reverse().join(".");
const rangeLabel = (r: StudyDateRange) => (r.start === r.end ? fmt(r.start) : `${fmt(r.start)} – ${fmt(r.end)}`);

export default function StudyDatesImport({ onImported, onClose }: Readonly<Props>) {
  const id = useId();
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const categories = useTaskCategories();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("Zjazd – studia");
  const [place, setPlace] = useState("Wrocław");
  const [category, setCategory] = useState<string | null>(categories.includes("edukacja") ? "edukacja" : null);
  const [tickets, setTickets] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const ranges = useMemo(() => parseStudyDates(text), [text]);
  const key = (r: StudyDateRange) => `${r.start}|${r.end}`;
  const selected = ranges.filter((r) => !excluded.has(key(r)) && r.end >= today);

  const checkExisting = async (found: StudyDateRange[]) => {
    if (!user || found.length === 0) return;
    const { data } = await supabase
      .from("events")
      .select("start_time")
      .eq("user_id", user.id)
      .eq("title", title.trim())
      .gte("start_time", `${found[0].start}T00:00:00+00`)
      .lte("start_time", `${found.at(-1)!.end}T23:59:59+00`);
    const days = new Set((data ?? []).map((e) => String((e as { start_time: string }).start_time).slice(0, 10)));
    const dup = new Set(found.filter((r) => days.has(r.start)).map(key));
    setExisting(dup);
    setExcluded(dup);
  };

  const toggle = (r: StudyDateRange) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key(r))) next.delete(key(r));
      else next.add(key(r));
      return next;
    });

  const importAll = async () => {
    if (!user || selected.length === 0) return;
    setBusy(true);
    try {
      const rows = selected.map((r) => ({
        title: title.trim() || "Zjazd",
        description: "",
        start_time: `${r.start}T00:00:00+00`,
        end_time: `${r.end}T23:59:00+00`,
        place: place.trim(),
        repeat: "none",
        user_id: user.id,
        ...(category ? { category } : {}),
      }));
      const { error } = await supabase.from("events").insert(rows);
      if (error) throw error;

      let ticketErrors = 0;
      if (tickets && category) {
        // Zjazdów jest kilka–kilkanaście na semestr – zadania tworzymy równolegle.
        const results = await Promise.all(
          selected.map((r) =>
            createTicketReminderTask(supabase, user.id, {
              title: `${title.trim()} ${fmt(r.start)}`,
              startDay: r.start,
              category,
            })
          )
        );
        ticketErrors = results.filter((r) => r.error).length;
      }
      toast.success(`Dodano zjazdy: ${selected.length}.`);
      if (ticketErrors > 0) toast.error(`Nie udało się dodać części przypomnień o biletach (${ticketErrors}).`);
      onImported();
      onClose();
    } catch {
      toast.error("Nie udało się zaimportować zjazdów.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby={`${id}-title`} className="form-card max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <h2 id={`${id}-title`} className="flex items-center gap-2 text-lg font-bold text-text">
          <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
          Import zjazdów
        </h2>
        <button type="button" onClick={onClose} aria-label="Zamknij import" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <ol className="list-decimal space-y-1 pl-5 text-sm text-text-secondary">
        <li>Otwórz harmonogram zjazdów na stronie wydziału.</li>
        <li>Zaznacz tabelę lub listę terminów swojego kierunku i skopiuj ją.</li>
        <li>Wklej poniżej – sprawdź podgląd i kliknij „Dodaj do kalendarza”.</li>
      </ol>

      <div>
        <label htmlFor={`${id}-text`} className="form-label">Skopiowany harmonogram:</label>
        <textarea
          id={`${id}-text`}
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => void checkExisting(parseStudyDates(text))}
          placeholder={"np. 17-18.10.2026\n7-8.11.2026\n…"}
          className="input-field"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className="form-label">Nazwa wydarzenia:</label>
          <input id={`${id}-name`} value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
        </div>
        <div>
          <label htmlFor={`${id}-place`} className="form-label">Miejsce:</label>
          <input id={`${id}-place`} value={place} onChange={(e) => setPlace(e.target.value)} className="input-field" />
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
          Przypomnij o biletach {TICKET_REMINDER_DAYS_BEFORE} dni przed każdym zjazdem
          {!category && <span className="block text-sm text-text-secondary">Wybierz kategorię, żeby włączyć.</span>}
        </label>
      </div>

      <div aria-live="polite">
        {text.trim() && ranges.length === 0 && (
          <p className="text-sm text-text-secondary">Nie znalazłem dat w tym tekście. Spróbuj skopiować samą tabelę z terminami.</p>
        )}
        {ranges.length > 0 && (
          <fieldset>
            <legend className="form-label">Znalezione terminy ({selected.length} do dodania):</legend>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {ranges.map((r) => {
                const past = r.end < today;
                const dup = existing.has(key(r));
                return (
                  <li key={key(r)}>
                    <label className={`flex min-h-11 items-center gap-3 px-3 ${past ? "opacity-60" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={!excluded.has(key(r)) && !past}
                        disabled={past}
                        onChange={() => toggle(r)}
                      />
                      <span className="tabular-nums font-medium text-text">{rangeLabel(r)}</span>
                      {past && <span className="text-sm text-text-secondary">minął</span>}
                      {dup && <span className="text-sm text-text-secondary">już w kalendarzu</span>}
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
