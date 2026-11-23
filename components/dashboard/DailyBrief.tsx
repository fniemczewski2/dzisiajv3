// components/dashboard/DailyBrief.tsx
//
// Briefing dnia na planie dnia (tylko dziś): poranny od brief_morning_time, wieczorny od brief_evening_time
// (każdy można wyłączyć: brief_morning_enabled / brief_evening_enabled). Pozycja bez treści (np. dzień bez
// wydarzeń) nie jest pokazywana wcale; gdy pusta jest cała karta, nie pojawia się nawet jej nagłówek.
// (podsumowanie dnia, plan na jutro albo oba – brief_evening_mode). Karta zostaje do zamknięcia przyciskiem;
// zamknięcie zapisuje się w ustawieniach i dotyczy bieżącego dnia. Pociągi bez statusu PKP PLK – dane z bazy.
// Każda część pobiera swoje dane dopiero, gdy jest widoczna.

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { Moon, Sun, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNow } from "@/hooks/useNow";
import { useSettings } from "@/hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { useWeather } from "@/hooks/useWeather";
import { usePeople } from "@/hooks/db/usePeople";
import { useRecurringBills, useTransactions } from "@/hooks/db/useFinance";
import { useTasks } from "@/hooks/db/useTasks";
import { useEvents } from "@/hooks/db/useEvents";
import { useTrainsForDate } from "@/hooks/db/useTrains";
import { appTimeHm, billsDue, briefVisibility, eveningParts } from "@/lib/dailyBrief";
import { formatPln, monthRange } from "@/lib/finance";
import { ownedOrSharedFilter } from "@/lib/postgrestFilters";
import { parseEventDate } from "@/lib/dateUtils";
import type { Task } from "@/types/tasks";
import type { Event } from "@/types/events";
import type { TrackedTrain } from "@/types/transport";

interface Props {
  today: string;
  tasks: readonly Task[];
  events: readonly Event[];
  trains: readonly TrackedTrain[];
}

const timeOf = (ev: Event) => format(parseEventDate(ev.start_time), "HH:mm");

/** Pozycja briefingu: pokazywana tylko wtedy, gdy ma treść. */
interface BriefRow {
  key: string;
  label: string;
  content: React.ReactNode;
}

function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1.5 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="font-semibold text-text-secondary">{label}</dt>
      <dd className="min-w-0 wrap-anywhere text-text">{children}</dd>
    </div>
  );
}

/** Pozycja z listy nazw; pusta lista = brak pozycji w briefingu. */
function listRow(key: string, label: string, items: readonly string[]): BriefRow | null {
  if (items.length === 0) return null;
  return { key, label: `${label} (${items.length})`, content: items.join(", ") };
}

function BriefRows({ rows }: Readonly<{ rows: readonly BriefRow[] }>) {
  return (
    <>
      {rows.map((row) => (
        <Row key={row.key} label={row.label}>
          {row.content}
        </Row>
      ))}
    </>
  );
}

function trainLine(t: TrackedTrain): string {
  return `${t.departureTime} ${t.trainNumber}${t.trainName ? ` ${t.trainName}` : ""}, ${t.from} → ${t.to}`;
}

function BriefCard({
  title,
  Icon,
  onDismiss,
  busy,
  rows,
}: Readonly<{ title: string; Icon: typeof Sun; onDismiss: () => void; busy: boolean; rows: readonly BriefRow[] }>) {
  // Karta bez treści nie ma czego pokazać – lepiej jej nie rysować niż wypełniać słowem „brak”.
  if (rows.length === 0) return null;
  const headingId = `brief-${title.replaceAll(/\s+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className="card w-full max-w-none p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-line pb-2">
        <h2 id={headingId} className="section-title flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          {title}
        </h2>
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-60"
          aria-label={`Zamknij: ${title}`}
          title="Zamknij do jutra"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <dl className="divide-y divide-line">
        <BriefRows rows={rows} />
      </dl>
    </section>
  );
}

function useOverdueTasks(today: string, enabled: boolean) {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const query = useQuery({
    queryKey: ["brief-overdue-tasks", userId ?? null, today],
    enabled: enabled && Boolean(userId),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date")
        .or(ownedOrSharedFilter("user_id", "for_user_id", userId as string))
        .lt("due_date", today)
        .neq("status", "done")
        .order("due_date", { ascending: true })
        .limit(20)
        .abortSignal(signal);
      if (error) throw error;
      return (data ?? []) as Array<Pick<Task, "id" | "title" | "due_date">>;
    },
  });
  return query.data ?? [];
}

function MorningBrief({
  today,
  tasks,
  events,
  trains,
  onDismiss,
  busy,
}: Props & { onDismiss: () => void; busy: boolean }) {
  const { forecast, loading: weatherLoading, error: weatherError } = useWeather();
  const { getPeopleToContact } = usePeople();
  const { bills } = useRecurringBills();
  const range = monthRange(today.slice(0, 7));
  const { transactions } = useTransactions(range);
  const overdue = useOverdueTasks(today, true);
  const due = useMemo(() => billsDue(bills, transactions, today), [bills, transactions, today]);

  const pending = tasks.filter((t) => t.status !== "done" && t.due_date === today);
  const todayIdx = forecast?.daily.time.indexOf(today) ?? -1;
  // Pusty łańcuch = brak pozycji „Pogoda” (brak danych albo wyłączona lokalizacja).
  let weather = "";
  if (weatherLoading) weather = "Wczytywanie…";
  else if (forecast && todayIdx >= 0 && !weatherError) {
    const d = forecast.daily;
    weather = `${Math.round(forecast.current_weather.temperature)}°C teraz, ${Math.round(d.temperature_2m_min[todayIdx])}–${Math.round(d.temperature_2m_max[todayIdx])}°C, opady ${d.precipitation_sum[todayIdx]} mm`;
  }

  const rows: BriefRow[] = [];
  // Pogoda tylko wtedy, gdy są dane – komunikat o ich braku nie jest treścią briefingu.
  if (weather)
    rows.push({
      key: "weather",
      label: "Pogoda",
      content: (
        <Link href="/weather" className="underline-offset-2 hover:underline">
          {weather}
        </Link>
      ),
    });
  const taskRow = listRow(
    "tasks",
    "Zadania",
    pending.map((t) => t.title)
  );
  if (taskRow) rows.push(taskRow);
  const overdueRow = listRow(
    "overdue",
    "Zaległe",
    overdue.map((t) => `${t.title} (${t.due_date})`)
  );
  if (overdueRow) rows.push(overdueRow);
  const eventRow = listRow(
    "events",
    "Spotkania",
    events.map((e) => `${timeOf(e)} ${e.title}`)
  );
  if (eventRow) rows.push(eventRow);
  const billItems = [
    ...due.dueToday.map((b) => `${b.name} ${formatPln(b.amount)} (dziś)`),
    ...due.overdue.map((b) => `${b.name} ${formatPln(b.amount)} (zaległy)`),
  ];
  const billRow = listRow("bills", "Rachunki", billItems);
  if (billRow) rows.push(billRow);
  const trainRow = listRow("trains", "Pociągi", trains.map(trainLine));
  if (trainRow) rows.push(trainRow);
  const contactRow = listRow(
    "contact",
    "Kontakt",
    getPeopleToContact.slice(0, 5).map((p) => `${p.first_name} ${p.last_name}`.trim())
  );
  if (contactRow) rows.push(contactRow);

  return <BriefCard title="Poranny briefing" Icon={Sun} onDismiss={onDismiss} busy={busy} rows={rows} />;
}

/** Pozycje „Jutro” – puste pomijamy, więc dzień bez planów nie dokłada pustych wierszy. */
function useTomorrowRows(today: string, enabled: boolean): BriefRow[] {
  const tomorrow = format(addDays(new Date(`${today}T12:00:00`), 1), "yyyy-MM-dd");
  const { tasks } = useTasks(enabled ? tomorrow : "", enabled ? tomorrow : "");
  const { events } = useEvents(enabled ? tomorrow : "", enabled ? tomorrow : "");
  const { trains } = useTrainsForDate(enabled ? tomorrow : "");
  if (!enabled) return [];
  const pending = tasks.filter((t) => t.status !== "done");
  return [
    listRow(
      "tomorrow-tasks",
      "Jutro: zadania",
      pending.map((t) => t.title)
    ),
    listRow(
      "tomorrow-events",
      "Jutro: spotkania",
      events.map((e) => `${timeOf(e)} ${e.title}`)
    ),
    listRow("tomorrow-trains", "Jutro: pociągi", trains.map(trainLine)),
  ].filter((row): row is BriefRow => row !== null);
}

function EveningBrief({ today, tasks, events, onDismiss, busy }: Props & { onDismiss: () => void; busy: boolean }) {
  const { settings } = useSettings();
  const parts = eveningParts(settings.brief_evening_mode);
  const todays = tasks.filter((t) => t.due_date === today);
  const tomorrowRows = useTomorrowRows(today, parts.tomorrow);

  const summaryRows = parts.summary
    ? [
        listRow(
          "done",
          "Zrobione",
          todays.filter((t) => t.status === "done").map((t) => t.title)
        ),
        listRow(
          "left",
          "Do zrobienia",
          todays.filter((t) => t.status !== "done").map((t) => t.title)
        ),
        listRow(
          "events",
          "Spotkania",
          events.map((e) => e.title)
        ),
      ].filter((row): row is BriefRow => row !== null)
    : [];

  return (
    <BriefCard
      title="Wieczorny briefing"
      Icon={Moon}
      onDismiss={onDismiss}
      busy={busy}
      rows={[...summaryRows, ...tomorrowRows]}
    />
  );
}

export default function DailyBrief(props: Readonly<Props>) {
  const { settings, updateSettings } = useSettings();
  const now = useNow(60_000);
  const [busy, setBusy] = useState(false);
  const visible = briefVisibility(settings, props.today, appTimeHm(now));
  if (!visible.morning && !visible.evening) return null;

  const dismiss = async (key: "brief_dismissed_morning" | "brief_dismissed_evening") => {
    setBusy(true);
    await updateSettings({ [key]: props.today });
    setBusy(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {visible.morning && (
        <MorningBrief {...props} busy={busy} onDismiss={() => void dismiss("brief_dismissed_morning")} />
      )}
      {visible.evening && (
        <EveningBrief {...props} busy={busy} onDismiss={() => void dismiss("brief_dismissed_evening")} />
      )}
    </div>
  );
}
