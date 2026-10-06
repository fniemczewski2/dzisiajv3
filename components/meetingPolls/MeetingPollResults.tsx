// components/meetingPolls/MeetingPollResults.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarCheck2,
  Calendar,
  Clock,
  Hourglass,
  Sparkles,
  Timer,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMeetingPolls } from "@/hooks/db/useMeetingPolls";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { IconActionButton, CancelButton, CopyButtonSmall, FormButtons, SaveButton } from "../ui/CommonButtons";
import {
  bestRanges,
  contiguousRanges,
  formatDurationMinutes,
  formatPollDay,
  generateTimeSlots,
  slotEndTime,
  slotKey,
  type SlotRange,
} from "@/lib/meetingPollGrid";
import { effectivePollStatus } from "@/lib/meetingPollDeadline";
import { formatTime } from "@/lib/dateUtils";
import type {
  MeetingPollResults as MeetingPollResultsData,
  FinalizeSlotInput,
  FinalizeResultSlot,
} from "@/types/meetingPolls";
import NoResultsState from "../ui/NoResultsState";
import MeetingPollRespondents, { initialsOf } from "./MeetingPollRespondents";
import MeetingPollGrid, { GridLegend, type GridSelection } from "./MeetingPollGrid";
import { SkeletonSlotGrid } from "../ui/Skeleton";

import { mapPool } from "@/lib/asyncPool";
import { exportEventToCalendar, calendarTargetLabel } from "@/lib/calendarExport";
interface MeetingPollResultsProps {
  pollId: string;
}

/** Imiona osób dostępnych w każdym terminie (klucz: slotKey). */
function respondentNamesBySlot(
  data: {
    responses: readonly { id: string; respondent_name: string }[];
    availabilities: readonly { response_id: string; date: string; start_time: string }[];
  } | null | undefined
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  if (!data) return map;
  const nameByResponseId = new Map(data.responses.map((r) => [r.id, r.respondent_name]));
  for (const a of data.availabilities) {
    const name = nameByResponseId.get(a.response_id);
    if (!name) continue;
    const key = slotKey(a.date, a.start_time);
    map[key] ??= [];
    map[key].push(name);
  }
  return map;
}

/** Publiczny link do ankiety (pusty, dopóki nie znamy adresu strony). */
function shareLink(origin: string, token: string): string {
  return origin ? `${origin}/meet/${token}` : "";
}

function calendarDisplayName(cal: ConnectedCalendarOption): string {
  return cal.calendar_name || cal.google_calendar_id;
}

function calendarChoiceLabel(options: readonly ConnectedCalendarOption[], choice: string): string {
  const option = choice === "local" ? undefined : options.find((c) => c.id === choice);
  return option ? calendarTargetLabel(option) : "kalendarz aplikacji";
}

interface ConnectedCalendarOption {
  id: string;
  calendar_name: string | null;
  google_calendar_id: string;
  provider: "google" | "outlook";
}

interface PendingSlot extends FinalizeSlotInput {
  calendarChoice: string;
}

interface Person {
  id: string;
  name: string;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

function MetaChip({ icon: Icon, children }: Readonly<{ icon: LucideIcon; children: React.ReactNode }>) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-medium text-text-secondary">
      <Icon aria-hidden="true" className="h-3.5 w-3.5 text-text-muted" />
      {children}
    </li>
  );
}

function PersonAvatar({ name, size = "md" }: Readonly<{ name: string; size?: "sm" | "md" }>) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-white ${
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-10 w-10 text-sm"
      }`}
    >
      {initialsOf(name)}
    </span>
  );
}

function PersonSummary({
  person,
  email,
  ranges,
  slotCount,
  slotDurationMinutes,
  totalDays,
  onClear,
}: Readonly<{
  person: Person;
  email: string | null;
  ranges: SlotRange[];
  slotCount: number;
  slotDurationMinutes: number;
  totalDays: number;
  onClear: () => void;
}>) {
  const byDate = useMemo(() => {
    const map = new Map<string, SlotRange[]>();
    for (const range of ranges) map.set(range.date, [...(map.get(range.date) ?? []), range]);
    return [...map.entries()];
  }, [ranges]);

  return (
    <section className="card max-w-none rounded-2xl p-4 sm:p-5" aria-labelledby="person-summary-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
          <PersonAvatar name={person.name} />
          <div className="min-w-0">
            <h2 id="person-summary-heading" className="truncate font-display text-lg font-bold text-text">
              {person.name}
            </h2>
            {email && <p className="truncate text-xs text-text-secondary">{email}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 py-1.5 text-sm font-semibold text-text transition-colors hover:bg-surface"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Pokaż wszystkich
        </button>
      </div>

      {slotCount === 0 ? (
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-text-secondary">
          Ta osoba nie zaznaczyła żadnego terminu.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface px-4 py-3">
              <dt className="text-xs text-text-muted">Łączna dostępność</dt>
              <dd className="mt-0.5 font-display text-xl font-bold text-text tabular-nums">
                {formatDurationMinutes(slotCount * slotDurationMinutes)}
              </dd>
            </div>
            <div className="rounded-xl bg-surface px-4 py-3">
              <dt className="text-xs text-text-muted">Dni z dostępnością</dt>
              <dd className="mt-0.5 font-display text-xl font-bold text-text tabular-nums">
                {byDate.length} z {totalDays}
              </dd>
            </div>
          </dl>

          <ul className="mt-4 divide-y divide-line">
            {byDate.map(([date, dayRanges]) => {
              const { weekday, day } = formatPollDay(date);
              return (
                <li key={date} className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-24 shrink-0 whitespace-nowrap text-sm font-semibold text-text tabular-nums">
                    {weekday} {day}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {dayRanges.map((range) => (
                      <span
                        key={range.start}
                        className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 tabular-nums dark:bg-green-900/50 dark:text-green-200"
                      >
                        {range.start}–{range.end}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function BestRangesCard({
  count,
  total,
  ranges,
  slotDurationMinutes,
  onPick,
}: Readonly<{
  count: number;
  total: number;
  ranges: SlotRange[];
  slotDurationMinutes: number;
  onPick: (range: SlotRange) => void;
}>) {
  const everyone = count === total;
  return (
    <section
      aria-labelledby="best-ranges-heading"
      className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5"
    >
      <h2 id="best-ranges-heading" className="flex items-center gap-2 font-display text-lg font-bold text-text">
        <Sparkles aria-hidden="true" className="h-5 w-5 text-primary" />
        Najlepsze terminy
      </h2>
      <p className="mt-0.5 text-sm text-text-secondary">
        {everyone ? "W tych terminach dostępni są wszyscy uczestnicy." : `Najwięcej osób naraz: ${count} z ${total}.`} Kliknij,
        aby wybrać termin.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {ranges.map((range) => {
          const { weekday, day } = formatPollDay(range.date);
          return (
            <li key={`${range.date}-${range.start}`}>
              <button
                type="button"
                onClick={() => onPick(range)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong bg-card px-3 py-1.5 text-sm font-semibold text-text tabular-nums transition-colors hover:border-primary hover:bg-surface"
              >
                {weekday} {day} · {range.start}–{range.end}
                <span className="text-xs font-normal text-text-muted">{formatDurationMinutes(range.slots * slotDurationMinutes)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PeopleChips({ label, people, tone }: Readonly<{ label: string; people: Person[]; tone: "free" | "busy" }>) {
  if (people.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-text-muted">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {people.map((p) => (
          <li
            key={p.id}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              tone === "free"
                ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                : "bg-surface text-text-secondary line-through decoration-text-muted/60"
            }`}
          >
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MeetingPollResults({ pollId }: Readonly<MeetingPollResultsProps>) {
  const { getPollResults, finalizePoll } = useMeetingPolls();
  const { user, supabase } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<MeetingPollResultsData | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [rangeAnchor, setRangeAnchor] = useState<{ date: string; index: number } | null>(null);
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizedResults, setFinalizedResults] = useState<FinalizeResultSlot[] | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const [calendarOptions, setCalendarOptions] = useState<ConnectedCalendarOption[]>([]);

  const [slotTitle, setSlotTitle] = useState("");
  const [slotPlace, setSlotPlace] = useState("");
  const [slotCalendar, setSlotCalendar] = useState("local");

  const gridRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  const openSelection = useCallback(
    (next: GridSelection, anchor: { date: string; index: number } | null) => {
      setSelection(next);
      setRangeAnchor(anchor);
      setSlotTitle(data?.poll.title ?? "");
      setSlotPlace("");
      setSlotCalendar("local");
    },
    [data?.poll.title]
  );

  const activateCell = useCallback(
    (date: string, index: number) => {
      if (rangeAnchor?.date === date) {
        setSelection({
          date,
          startIndex: Math.min(rangeAnchor.index, index),
          endIndex: Math.max(rangeAnchor.index, index),
        });
        setRangeAnchor(null);
        return;
      }
      openSelection({ date, startIndex: index, endIndex: index }, { date, index });
    },
    [rangeAnchor, openSelection]
  );

  const focusPerson = useCallback((id: string | null) => {
    setFocusedId(id);
    if (id) {
      gridRef.current?.scrollIntoView?.({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingResults(true);
    void getPollResults(pollId).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoadingResults(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pollId, getPollResults]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void supabase
      .from("connected_calendars")
      .select("id, calendar_name, google_calendar_id, provider")
      .eq("user_id", user.id)
      .neq("google_calendar_id", "@account_connection")
      .then(({ data: rows }) => {
        if (!cancelled && rows) setCalendarOptions(rows as ConnectedCalendarOption[]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);

  useEffect(() => {
    if (selection) panelRef.current?.scrollIntoView?.({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selection]);

  const times = useMemo(
    () => (data ? generateTimeSlots(data.poll.time_start, data.poll.time_end, data.poll.slot_duration_minutes) : []),
    [data]
  );

  const countsByKey = useMemo(() => {
    const map: Record<string, number> = {};
    if (!data) return map;
    for (const a of data.availabilities) {
      const key = slotKey(a.date, a.start_time);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [data]);

  const respondentsByKey = useMemo(() => respondentNamesBySlot(data), [data]);

  const slotsByResponse = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!data) return map;
    for (const a of data.availabilities) {
      const set = map.get(a.response_id) ?? new Set<string>();
      set.add(slotKey(a.date, a.start_time));
      map.set(a.response_id, set);
    }
    return map;
  }, [data]);

  const totalResponses = data?.responses.length ?? 0;
  const duration = data?.poll.slot_duration_minutes ?? 30;

  const focused = useMemo(
    () => data?.responses.find((r) => r.id === focusedId) ?? null,
    [data, focusedId]
  );
  const personSlots = useMemo(
    () => (focused ? (slotsByResponse.get(focused.id) ?? new Set<string>()) : null),
    [focused, slotsByResponse]
  );
  const personRanges = useMemo(
    () =>
      data && personSlots
        ? contiguousRanges(data.dates, times, duration, (d, t) => personSlots.has(slotKey(d, t)))
        : [],
    [data, personSlots, times, duration]
  );

  const best = useMemo(
    () => (data ? bestRanges(data.dates, times, duration, countsByKey) : { count: 0, ranges: [] }),
    [data, times, duration, countsByKey]
  );

  const selectionAvailability = useMemo(() => {
    const available: Person[] = [];
    const unavailable: Person[] = [];
    if (!selection || !data) return { available, unavailable };

    const requiredKeys = times
      .slice(selection.startIndex, selection.endIndex + 1)
      .map((t) => slotKey(selection.date, t));

    for (const r of data.responses) {
      const slots = slotsByResponse.get(r.id);
      const isFree = requiredKeys.every((k) => slots?.has(k));
      (isFree ? available : unavailable).push({ id: r.id, name: r.respondent_name });
    }
    return { available, unavailable };
  }, [selection, data, times, slotsByResponse]);

  const addSelectionToPending = () => {
    if (!selection || !data || !slotTitle.trim()) return;
    const startTime = times[selection.startIndex];
    const endTime = slotEndTime(times[selection.endIndex], data.poll.slot_duration_minutes);
    setPendingSlots((prev) => [
      ...prev,
      {
        date: selection.date,
        start_time: startTime,
        end_time: endTime,
        title: slotTitle.trim(),
        place: slotPlace.trim() || undefined,
        calendarChoice: slotCalendar,
      },
    ]);
    setSelection(null);
    setRangeAnchor(null);
  };

  const removePending = (index: number) => {
    setPendingSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const calendarLabel = (choice: string): string => calendarChoiceLabel(calendarOptions, choice);

  const exportSlotToCalendar = async (
    slot: PendingSlot,
    result: FinalizeResultSlot,
    accessToken: string
  ): Promise<void> => {
    if (slot.calendarChoice === "local") return;
    const option = calendarOptions.find((c) => c.id === slot.calendarChoice);
    if (!option) return;

    // Helper sprawdza odpowiedź serwera i przekazuje wybrany kalendarz, więc
    // wydarzenie trafia na właściwe konto i zostaje do niego przypięte.
    const ok = await exportEventToCalendar(option, result.organizerEventId, accessToken);
    if (!ok) {
      toast.error(`Nie udało się dodać terminu ${slot.date} do kalendarza ${calendarLabel(slot.calendarChoice)}.`);
    }
  };

  const handleFinalize = async () => {
    if (pendingSlots.length === 0) return;
    setFinalizing(true);
    try {
      const results = await finalizePoll(pollId, pendingSlots);
      if (!results) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await mapPool(pendingSlots, 3, async (slot, i) => {
          const result = results[i];
          if (!result) return;
          await exportSlotToCalendar(slot, result, session.access_token);
        });
      }

      setFinalizedResults(results);
      setPendingSlots([]);
    } finally {
      setFinalizing(false);
    }
  };

  if (loadingResults) {
    return <SkeletonSlotGrid />;
  }
  if (!data) {
    return (
      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-200">
        Nie udało się wczytać wyników ankiety.
      </p>
    );
  }

  const isOpen = effectivePollStatus(data.poll) === "open";
  const link = shareLink(origin, data.poll.share_token);
  const selectionDay = selection ? formatPollDay(selection.date) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="page-title text-xl sm:text-2xl">{data.poll.title}</h1>
        </div>
        {data.poll.description && <p className="max-w-2xl text-sm text-text-secondary">{data.poll.description}</p>}
        <ul className="flex flex-wrap gap-2">
          <MetaChip icon={Users}>
            {totalResponses} {totalResponses === 1 ? "odpowiedź" : "odpowiedzi"}
          </MetaChip>
          <MetaChip icon={Calendar}>
            {data.dates.length} {data.dates.length === 1 ? "dzień" : "dni"}
          </MetaChip>
          <MetaChip icon={Clock}>
            {data.poll.time_start.slice(0, 5)}–{data.poll.time_end.slice(0, 5)}
          </MetaChip>
          <MetaChip icon={Timer}>{data.poll.slot_duration_minutes} min / slot</MetaChip>
          {isOpen && data.poll.closes_at && (
            <MetaChip icon={Hourglass}>Zamknie się: {formatTime(data.poll.closes_at, true)}</MetaChip>
          )}
        </ul>
      </header>

      {totalResponses === 0 ? (
        <NoResultsState
          text="odpowiedzi"
          hint="Wyślij uczestnikom link do ankiety. Ich odpowiedzi pojawią się tutaj."
          action={
            link ? (
              <div className="flex max-w-full items-center gap-2">
                <code className="truncate rounded-lg bg-card px-2.5 py-1.5 text-xs text-text-secondary">{link}</code>
                <CopyButtonSmall text={link} label="link do ankiety" />
              </div>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="sr-only" role="status">
            {focused ? `Pokazano dostępność: ${focused.respondent_name}` : "Pokazano dostępność wszystkich uczestników"}
          </p>

          {focused ? (
            <PersonSummary
              person={{ id: focused.id, name: focused.respondent_name }}
              email={focused.respondent_email}
              ranges={personRanges}
              slotCount={personSlots?.size ?? 0}
              slotDurationMinutes={duration}
              totalDays={data.dates.length}
              onClear={() => setFocusedId(null)}
            />
          ) : (
            best.count > 0 && (
              <BestRangesCard
                count={best.count}
                total={totalResponses}
                ranges={best.ranges}
                slotDurationMinutes={duration}
                onPick={(range) =>
                  openSelection({ date: range.date, startIndex: range.startIndex, endIndex: range.endIndex }, null)
                }
              />
            )
          )}

          <section ref={gridRef} aria-labelledby="grid-heading" className="card max-w-none space-y-3 rounded-2xl p-4 sm:p-5">
            <div className="space-y-1">
              <h2 id="grid-heading" className="font-display text-lg font-bold text-text">
                {focused ? `Dostępność: ${focused.respondent_name}` : "Dostępność zespołu"}
              </h2>
              <p className="text-sm text-text-secondary">
                Aby wybrać termin, kliknij godzinę początkową, a potem końcową w tej samej kolumnie.
              </p>
            </div>
            <GridLegend personMode={Boolean(focused)} />
            <MeetingPollGrid
              dates={data.dates}
              times={times}
              totalResponses={totalResponses}
              countsByKey={countsByKey}
              respondentsByKey={respondentsByKey}
              personSlots={personSlots}
              personName={focused?.respondent_name}
              selection={selection}
              anchor={rangeAnchor}
              onActivate={activateCell}
            />
          </section>
        </>
      )}

      {selection && selectionDay && (
        <section ref={panelRef} aria-labelledby="selection-heading" className="form-card max-w-none space-y-4">
          <div>
            <h2 id="selection-heading" className="font-display text-lg font-bold text-text">
              Wybrany termin
            </h2>
            <p className="text-sm text-text-secondary tabular-nums">
              {selectionDay.weekday} {selectionDay.day} · {times[selection.startIndex]}–
              {slotEndTime(times[selection.endIndex], duration)} ·{" "}
              {formatDurationMinutes((selection.endIndex - selection.startIndex + 1) * duration)}
            </p>
          </div>

          {rangeAnchor && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-text">
              Wybrano początek zakresu. Kliknij godzinę końcową w tej samej kolumnie albo zapisz pojedynczy slot.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <PeopleChips
              label={`Dostępni (${selectionAvailability.available.length} z ${totalResponses})`}
              people={selectionAvailability.available}
              tone="free"
            />
            <PeopleChips
              label={`Niedostępni (${selectionAvailability.unavailable.length})`}
              people={selectionAvailability.unavailable}
              tone="busy"
            />
          </div>

          <div>
            <label htmlFor="slot-title" className="form-label">Tytuł wydarzenia:</label>
            <input
              id="slot-title"
              type="text"
              value={slotTitle}
              onChange={(e) => setSlotTitle(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
            <div>
              <label htmlFor="slot-place" className="form-label">Miejsce:</label>
              <input
                id="slot-place"
                type="text"
                value={slotPlace}
                onChange={(e) => setSlotPlace(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="slot-calendar" className="form-label">Dodaj do:</label>
              <select
                id="slot-calendar"
                value={slotCalendar}
                onChange={(e) => setSlotCalendar(e.target.value)}
                className="input-field"
              >
                <option value="local">Aplikacja – kalendarz domyślny</option>
                {calendarOptions.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.provider === "google" ? "Google: " : "Outlook: "}
                    {calendarDisplayName(cal)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SaveButton onClick={addSelectionToPending} disabled={!slotTitle.trim()} />
            <CancelButton onClick={() => { setSelection(null); setRangeAnchor(null); }} />
          </div>
        </section>
      )}

      {pendingSlots.length > 0 && (
        <section aria-labelledby="pending-heading" className="form-card max-w-none space-y-3">
          <h2 id="pending-heading" className="font-display text-lg font-bold text-text">Ustalone terminy</h2>
          <ul className="space-y-1.5">
            {pendingSlots.map((s, i) => (
              <li key={`${s.date}-${s.start_time}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold text-text">{s.title}</span> – {s.date}, {s.start_time}–{s.end_time}
                  <span className="text-text-muted"> • {calendarLabel(s.calendarChoice)}</span>
                </span>
                <IconActionButton onClick={() => removePending(i)} Icon={Trash2} title="Usuń z listy" variant="danger" />
              </li>
            ))}
          </ul>
          <FormButtons
            onClickSave={() => void handleFinalize()}
            onClickClose={() => setPendingSlots([])}
            loading={finalizing}
          />
        </section>
      )}

      {finalizedResults && finalizedResults.length > 0 && (
        <section aria-labelledby="finalized-heading" className="form-card max-w-none space-y-2">
          <h2 id="finalized-heading" className="flex items-center gap-2 text-sm font-bold text-text">
            <CalendarCheck2 aria-hidden="true" className="h-4 w-4 text-primary" /> Zapisano w kalendarzu:
          </h2>
          <ul className="space-y-1 text-sm">
            {finalizedResults.map((r) => (
              <li key={`${r.date}-${r.start_time}`}>
                {r.date}, {r.start_time}–{r.end_time} – zaproszono {r.invitedParticipants} zalogowanych uczestników.
              </li>
            ))}
          </ul>
        </section>
      )}

      <MeetingPollRespondents
        responses={data.responses}
        availabilities={data.availabilities}
        slotDurationMinutes={duration}
        selectedId={focusedId}
        onSelect={focusPerson}
      />
    </div>
  );
}
