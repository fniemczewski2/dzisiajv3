// components/dashboard/DailyBrief.tsx
//
// Briefing dnia na planie dnia (tylko dziś): poranny od brief_morning_time, wieczorny od brief_evening_time
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

function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1.5 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="font-semibold text-text-secondary">{label}</dt>
      <dd className="min-w-0 wrap-anywhere text-text">{children}</dd>
    </div>
  );
}

function names(items: readonly string[], empty: string): string {
  return items.length > 0 ? items.join(", ") : empty;
}

function trainLine(t: TrackedTrain): string {
  return `${t.departureTime} ${t.trainNumber}${t.trainName ? ` ${t.trainName}` : ""}, ${t.from} → ${t.to}`;
}

function BriefCard({
  title,
  Icon,
  onDismiss,
  busy,
  children,
}: Readonly<{ title: string; Icon: typeof Sun; onDismiss: () => void; busy: boolean; children: React.ReactNode }>) {
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
      <dl className="divide-y divide-line">{children}</dl>
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
  let weather = "Brak danych (włącz lokalizację w ustawieniach).";
  if (weatherLoading) weather = "Wczytywanie…";
  else if (forecast && todayIdx >= 0 && !weatherError) {
    const d = forecast.daily;
    weather = `${Math.round(forecast.current_weather.temperature)}°C teraz, ${Math.round(d.temperature_2m_min[todayIdx])}–${Math.round(d.temperature_2m_max[todayIdx])}°C, opady ${d.precipitation_sum[todayIdx]} mm`;
  }

  return (
    <BriefCard title="Poranny briefing" Icon={Sun} onDismiss={onDismiss} busy={busy}>
      <Row label="Pogoda">
        <Link href="/weather" className="underline-offset-2 hover:underline">
          {weather}
        </Link>
      </Row>
      <Row label={`Zadania (${pending.length})`}>
        {names(
          pending.map((t) => t.title),
          "brak na dziś"
        )}
      </Row>
      <Row label={`Zaległe (${overdue.length})`}>
        {names(
          overdue.map((t) => `${t.title} (${t.due_date})`),
          "brak"
        )}
      </Row>
      <Row label={`Spotkania (${events.length})`}>
        {names(
          events.map((e) => `${timeOf(e)} ${e.title}`),
          "brak"
        )}
      </Row>
      <Row label="Rachunki">
        {due.dueToday.length + due.overdue.length === 0
          ? "brak płatności na dziś"
          : [
              ...due.dueToday.map((b) => `${b.name} ${formatPln(b.amount)} (dziś)`),
              ...due.overdue.map((b) => `${b.name} ${formatPln(b.amount)} (zaległy)`),
            ].join(", ")}
      </Row>
      <Row label={`Pociągi (${trains.length})`}>{names(trains.map(trainLine), "brak")}</Row>
      <Row label="Kontakt">
        {names(
          getPeopleToContact.slice(0, 5).map((p) => `${p.first_name} ${p.last_name}`.trim()),
          "nikt nie czeka na kontakt"
        )}
      </Row>
    </BriefCard>
  );
}

function TomorrowRows({ today }: Readonly<{ today: string }>) {
  const tomorrow = format(addDays(new Date(`${today}T12:00:00`), 1), "yyyy-MM-dd");
  const { tasks } = useTasks(tomorrow, tomorrow);
  const { events } = useEvents(tomorrow, tomorrow);
  const { trains } = useTrainsForDate(tomorrow);
  const pending = tasks.filter((t) => t.status !== "done");
  return (
    <>
      <Row label={`Jutro: zadania (${pending.length})`}>
        {names(
          pending.map((t) => t.title),
          "brak"
        )}
      </Row>
      <Row label={`Jutro: spotkania (${events.length})`}>
        {names(
          events.map((e) => `${timeOf(e)} ${e.title}`),
          "brak"
        )}
      </Row>
      <Row label={`Jutro: pociągi (${trains.length})`}>{names(trains.map(trainLine), "brak")}</Row>
    </>
  );
}

function EveningBrief({ today, tasks, events, onDismiss, busy }: Props & { onDismiss: () => void; busy: boolean }) {
  const { settings } = useSettings();
  const parts = eveningParts(settings.brief_evening_mode);
  const todays = tasks.filter((t) => t.due_date === today);
  const done = todays.filter((t) => t.status === "done");
  const left = todays.filter((t) => t.status !== "done");
  return (
    <BriefCard title="Wieczorny briefing" Icon={Moon} onDismiss={onDismiss} busy={busy}>
      {parts.summary && (
        <>
          <Row label={`Zrobione (${done.length})`}>
            {names(
              done.map((t) => t.title),
              "brak"
            )}
          </Row>
          <Row label={`Do zrobienia (${left.length})`}>
            {names(
              left.map((t) => t.title),
              "brak"
            )}
          </Row>
          <Row label={`Spotkania (${events.length})`}>
            {names(
              events.map((e) => e.title),
              "brak"
            )}
          </Row>
        </>
      )}
      {parts.tomorrow && <TomorrowRows today={today} />}
    </BriefCard>
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
