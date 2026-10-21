// supabase/functions/process-notifications/index.ts

import { createClient, type SupabaseClient } from "../_shared/supabase.ts";
import { verifyCronSecret, jsonHeaders, preflight, unauthorized } from "../_shared/auth.ts";
import { isBillDueOn } from "../_shared/bills.ts";
import {
  eventReminderType,
  REMINDER_TOLERANCE_MS,
  wallClockDayBounds,
  warsawWallClockNow,
  weekdayIndexPL,
} from "../_shared/notificationTime.ts";
import { getErrorMessage } from "../_shared/errors.ts";
import { usersNotifiedToday, rowsByUser } from "./batch.ts";
import { mapPool } from "../_shared/asyncPool.ts";

interface ScheduleEntry {
  label: string;
  time: string;
  notify?: boolean;
}

interface NotifiableTask {
  id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
}

interface TaskNotifRow {
  user_id: string;
  data: Record<string, unknown> | null;
}

/**
 * Wersja wdrożonej funkcji – widoczna w odpowiedzi, żeby dało się sprawdzić,
 * czy na serwerze działa aktualny kod (np. poprawka stref czasowych z 1.39.9).
 * Podbijaj przy każdej zmianie tej funkcji.
 */
const FUNCTION_VERSION = "1.40.0";

interface EventRow {
  id: string;
  user_id: string | null;
  shared_with_id: string | null;
  title: string;
  start_time: string;
  end_time?: string | null;
}

interface HabitSettingsRow {
  user_id: string;
  habit_pills?: boolean;
  habit_bath?: boolean;
  habit_workout?: boolean;
  habit_friends?: boolean;
  habit_work?: boolean;
  habit_housework?: boolean;
  habit_plants?: boolean;
  habit_duolingo?: boolean;
  custom_habits?: Array<{ id: string; label: string }> | null;
}

interface DailyHabitRow {
  pills?: boolean;
  bath?: boolean;
  workout?: boolean;
  friends?: boolean;
  work?: boolean;
  housework?: boolean;
  plants?: boolean;
  duolingo?: boolean;
  water_amount?: number;
  habits_done?: Record<string, boolean> | null;
}

interface DaySchemaRow {
  id?: string;
  is_default?: boolean | null;
  user_id: string;
  entries: unknown;
  days: unknown;
  name: string;
}

interface PersonRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  priority: number;
  birthday: string | null;
  nameday: string | null;
  last_contact_date: string | null;
  created_at: string | null;
}

interface SettingsPrefRow {
  user_id: string;
  notif_birthdays?: boolean;
  notif_contact?: boolean;
}

interface SentNotifRow {
  user_id: string;
  data: Record<string, unknown> | null;
  created_at: string;
}

function pluralize(count: number, form1: string, form2: string, form5: string): string {
  if (count === 1) return form1;
  if (count % 1 !== 0) return form2;
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return form2;
  return form5;
}

function pluralizeLiters(count: number): string {
  if (count === 1) return "litr";
  if (count % 1 !== 0) return "litra";
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return "litry";
  return "litrów";
}

function getPLTimeStrings(dateObj: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(dateObj);

  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;

  let hour = p.hour;
  if (hour === "24") hour = "00";

  const dateStr = `${p.year}-${p.month}-${p.day}`;
  const timeStr = `${hour}:${p.minute}:${p.second}`;
  return { dateStr, timeStr, hour };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

interface NotifCtx {
  supabase: SupabaseClient;
  today: string;
  currentHour: number;
  realNow: Date;
  plNow: ReturnType<typeof getPLTimeStrings>;
  startOfDayUTC: string;
  sendPushAndLog: (
    userId: string,
    title: string,
    message: string,
    targetUrl: string,
    dataObj?: Record<string, unknown>
  ) => Promise<void>;
  wasAlreadySentToday: (userId: string, notifType: string) => Promise<boolean>;
  incrementProcessed: () => void;
}

async function optedOutUsers(supabase: SupabaseClient, column: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("settings").select("user_id").eq(column, false);
  if (error) {
    console.error(`Nie udało się odczytać ustawienia ${column}:`, error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r: { user_id: string }) => r.user_id));
}

async function processMorningBriefType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, sendPushAndLog } = ctx;
  const { data: users } = await supabase
    .from("settings")
    .select("user_id")
    .eq("notif_morning_brief", true)
    .not("user_id", "is", null);
  const ids = (users ?? []).map((u) => u.user_id as string);
  // Zbiorczo: kto już dostał powiadomienie, zadania i wydarzenia wszystkich osób naraz.
  const notified = await usersNotifiedToday(supabase, "morning_brief", ctx.startOfDayUTC, ids);
  const tasksByUser = await rowsByUser<{ user_id: string }>(supabase, "tasks", "user_id", ids, {
    eq: { due_date: today },
    neq: { status: "done" },
  });
  // start_time to czas ścienny w Polsce zapisany z „+00” – granice dnia w tym samym zapisie.
  const day = wallClockDayBounds(today);
  const eventsByUser = await rowsByUser<{ user_id: string }>(supabase, "events", "user_id", ids, {
    gte: { start_time: day.start },
    lt: { start_time: day.end },
  });
  await mapPool(users || [], 5, async (user) => {
    if (notified.has(user.user_id)) return;
    const tasksCount = tasksByUser.get(user.user_id)?.length ?? 0;
    const eventsCount = eventsByUser.get(user.user_id)?.length ?? 0;

    if ((tasksCount && tasksCount > 0) || (eventsCount && eventsCount > 0)) {
      const msgParts = [];
      if (eventsCount && eventsCount > 0)
        msgParts.push(`${eventsCount} ${pluralize(eventsCount, "wydarzenie", "wydarzenia", "wydarzeń")}`);
      if (tasksCount && tasksCount > 0)
        msgParts.push(`${tasksCount} ${pluralize(tasksCount, "zadanie", "zadania", "zadań")}`);
      await sendPushAndLog(user.user_id, "Dzień dobry!", `Masz dziś ${msgParts.join(" i ")}.`, "/");
    }
  });
}

function groupTasksByUser(tasks: readonly NotifiableTask[]): Map<string, NotifiableTask[]> {
  const grouped = new Map<string, NotifiableTask[]>();
  for (const task of tasks) {
    if (!task.user_id) {
      console.error("[process-notifications] Pominięto zadanie bez user_id:", task.id);
      continue;
    }
    const bucket = grouped.get(task.user_id);
    if (bucket) bucket.push(task);
    else grouped.set(task.user_id, [task]);
  }
  return grouped;
}

function stringifyTaskId(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function isTaskNotifSent(sentNotifs: TaskNotifRow[] | null, userId: string, subType: string, taskId: string): boolean {
  return !!sentNotifs?.some(
    (n) =>
      n.user_id === userId &&
      n.data?.sub_type === subType &&
      stringifyTaskId(n.data?.task_id).split(",").includes(taskId.toString())
  );
}

async function notifyTaskGroup(
  ctx: NotifCtx,
  tasksByUser: Map<string, NotifiableTask[]>,
  subType: string,
  sentNotifs: TaskNotifRow[] | null,
  buildSingle: (t: NotifiableTask) => { title: string; message: string; url: string },
  buildMultiple: (tasks: NotifiableTask[]) => { title: string; message: string; url: string }
): Promise<void> {
  await mapPool(tasksByUser, 5, async ([userId, tasks]) => {
    const unsentTasks = tasks.filter((t) => !isTaskNotifSent(sentNotifs, userId, subType, t.id));

    if (unsentTasks.length === 1) {
      const t = unsentTasks[0];
      const { title, message, url } = buildSingle(t);
      await ctx.sendPushAndLog(userId, title, message, url, { task_id: t.id.toString(), sub_type: subType });
    } else if (unsentTasks.length > 1) {
      const { title, message, url } = buildMultiple(unsentTasks);
      const taskIds = unsentTasks.map((t) => t.id).join(",");
      await ctx.sendPushAndLog(userId, title, message, url, { task_id: taskIds, sub_type: subType });
    }
  });
}

async function processUpcomingTaskType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, plNow, currentHour, realNow, startOfDayUTC } = ctx;
  const { data: optInUsers } = await supabase.from("settings").select("user_id").eq("notif_tasks", true);
  const allowedIds = (optInUsers || []).map((u) => u.user_id);
  if (allowedIds.length === 0) return;

  const { data: sentNotifs } = await supabase
    .from("notifications")
    .select("user_id, data")
    .eq("type", "upcoming_task")
    .gte("created_at", startOfDayUTC);

  const currentHourStartStr = `${today} ${plNow.hour}:00:00`;
  const currentHourEndStr = `${today} ${plNow.hour}:59:59`;

  const { data: tasksNow } = await supabase
    .from("tasks")
    .select("*")
    .in("user_id", allowedIds)
    .neq("status", "done")
    .not("scheduled_time", "is", null)
    .gte("scheduled_time", currentHourStartStr)
    .lte("scheduled_time", currentHourEndStr);

  await notifyTaskGroup(
    ctx,
    groupTasksByUser(tasksNow || []),
    "exact_time",
    sentNotifs,
    (t) => ({ title: t.title, message: "Rozpocznij zadanie.", url: "/tasks" }),
    (tasks) => {
      const titles = tasks.map((t) => t.title).join(", ");
      return {
        title: `${tasks.length} ${pluralize(tasks.length, "zadanie", "zadania", "zadań")}`,
        message: `Rozpocznij: ${titles.substring(0, 50)}${titles.length > 50 ? "..." : ""}`,
        url: "/tasks",
      };
    }
  );

  const lateObj = new Date(realNow.getTime() - 3600000);
  const plLate = getPLTimeStrings(lateObj);
  const lateHourStartStr = `${plLate.dateStr} ${plLate.hour}:00:00`;
  const lateHourEndStr = `${plLate.dateStr} ${plLate.hour}:59:59`;

  const { data: tasksLate } = await supabase
    .from("tasks")
    .select("*")
    .in("user_id", allowedIds)
    .neq("status", "done")
    .not("scheduled_time", "is", null)
    .gte("scheduled_time", lateHourStartStr)
    .lte("scheduled_time", lateHourEndStr);

  await notifyTaskGroup(
    ctx,
    groupTasksByUser(tasksLate || []),
    "late_1h",
    sentNotifs,
    (t) => ({ title: "PILNE", message: `Zadanie ${t.title} nie jest zrobione.`, url: "/tasks" }),
    (tasks) => {
      const titles = tasks.map((t) => t.title).join(", ");
      return {
        title: "PILNE",
        message: `Zadania (${tasks.length}) nie są zrobione: ${titles.substring(0, 50)}${titles.length > 50 ? "..." : ""}`,
        url: "/tasks",
      };
    }
  );

  if (currentHour !== 14) return;

  const { data: tasksNoTime } = await supabase
    .from("tasks")
    .select("*")
    .in("user_id", allowedIds)
    .neq("status", "done")
    .is("scheduled_time", null)
    .eq("due_date", today);

  await notifyTaskGroup(
    ctx,
    groupTasksByUser(tasksNoTime || []),
    "no_time_14",
    sentNotifs,
    (t) => ({ title: "PILNE", message: `Zadanie ${t.title} nie jest zrobione.`, url: "/" }),
    (tasks) => {
      const titles = tasks.map((t) => t.title).join(", ");
      return {
        title: "PILNE",
        message: `Masz ${tasks.length} nieukończone ${pluralize(tasks.length, "zadanie", "zadania", "zadań")}: ${titles.substring(0, 50)}${titles.length > 50 ? "..." : ""}`,
        url: "/",
      };
    }
  );
}

async function notifyEventParticipants(
  ctx: NotifCtx,
  ev: EventRow,
  allowedIds: Set<string>,
  nowMs: number
): Promise<void> {
  const { supabase, sendPushAndLog } = ctx;
  const participants = new Set<string>();

  if (ev.user_id && allowedIds.has(ev.user_id)) participants.add(ev.user_id);
  if (ev.shared_with_id && allowedIds.has(ev.shared_with_id)) participants.add(ev.shared_with_id);

  const { data: existing } = await supabase
    .from("notifications")
    .select("data")
    .eq("type", "upcoming_event")
    .contains("data", { event_id: ev.id });

  const sentReminders = new Set<string>(
    (existing || [])
      .map((n: { data?: { reminder_type?: string } }) => n.data?.reminder_type)
      .filter((t): t is string => Boolean(t))
  );

  await mapPool(participants, 5, async (userId) => {
    const rType = eventReminderType(ev.start_time, nowMs, sentReminders, ev.end_time);
    let title = "",
      message = "";
    if (rType === "5min") {
      title = `Zaraz: ${ev.title}`;
      message = `Zaczynamy za 5 minut.`;
    } else if (rType === "1day") {
      title = `Jutro: ${ev.title}`;
      message = `Przypomnienie o jutrzejszym wydarzeniu.`;
    } else if (rType === "7days") {
      title = `Za tydzień: ${ev.title}`;
      message = `Masz wydarzenie za tydzień.`;
    }

    if (rType) await sendPushAndLog(userId, title, message, "/calendar", { event_id: ev.id, reminder_type: rType });
  });
}

async function processUpcomingEventType(ctx: NotifCtx): Promise<void> {
  const { supabase, realNow } = ctx;
  const { data: optInUsers } = await supabase.from("settings").select("user_id").eq("notif_events", true);
  const allowedIds = new Set((optInUsers || []).map((u) => u.user_id));
  if (allowedIds.size === 0) return;

  // start_time to czas ścienny w Polsce zapisany z „+00” – zakres zapytania
  // liczymy w tym samym układzie, a chwilę startu przelicza eventReminderType.
  const nowMs = realNow.getTime();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .gte("start_time", warsawWallClockNow(nowMs))
    .lte("start_time", warsawWallClockNow(nowMs + 8 * 24 * 60 * 60 * 1000));

  await mapPool(events || [], 5, async (ev) => {
    await notifyEventParticipants(ctx, ev, allowedIds, nowMs);
  });
}

async function processHydrationType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, currentHour, startOfDayUTC, sendPushAndLog } = ctx;
  const { data: users } = await supabase
    .from("settings")
    .select("user_id")
    .eq("show_water_tracker", true)
    .eq("notif_water", true);
  const ids = (users ?? []).map((u) => u.user_id as string);
  const notified = await usersNotifiedToday(supabase, "hydration", startOfDayUTC, ids, currentHour);
  const habitsByUser = await rowsByUser<{ user_id: string; water_amount: number | null }>(
    supabase,
    "daily_habits",
    "user_id, water_amount",
    ids,
    { eq: { date: today } }
  );
  await mapPool(users || [], 5, async (user) => {
    if (notified.has(user.user_id)) return;
    const amount = habitsByUser.get(user.user_id)?.[0]?.water_amount || 0;
    let remind = false;
    if (currentHour <= 10 && amount <= 0) remind = true;
    if (currentHour > 10 && currentHour <= 14 && amount < 1.0) remind = true;
    if (currentHour > 14 && currentHour <= 18 && amount < 1.5) remind = true;

    if (remind) {
      await sendPushAndLog(
        user.user_id,
        "Czas na wodę! 💧",
        `Wypito tylko ${amount} ${pluralizeLiters(amount)}. Uzupełnij płyny!`,
        "/",
        { slot: currentHour }
      );
    }
  });
}

const HABIT_CHECKS: { setting: keyof HabitSettingsRow; habitField: keyof DailyHabitRow; label: string }[] = [
  { setting: "habit_pills", habitField: "pills", label: "Leki" },
  { setting: "habit_bath", habitField: "bath", label: "Higiena" },
  { setting: "habit_workout", habitField: "workout", label: "Trening" },
  { setting: "habit_friends", habitField: "friends", label: "Relacje" },
  { setting: "habit_work", habitField: "work", label: "Praca" },
  { setting: "habit_housework", habitField: "housework", label: "Dom" },
  { setting: "habit_plants", habitField: "plants", label: "Digital" },
  { setting: "habit_duolingo", habitField: "duolingo", label: "Języki" },
];

function buildIncompleteHabitsList(s: HabitSettingsRow, habit: DailyHabitRow | null): string[] {
  const done = (habit?.habits_done ?? {}) as Record<string, boolean>;
  // Od 1.40: własne nawyki użytkownika (settings.custom_habits).
  if (Array.isArray(s.custom_habits)) {
    return s.custom_habits
      .filter((h) => h && typeof h.id === "string" && typeof h.label === "string")
      .filter((h) => {
        if (typeof done[h.id] === "boolean") return !done[h.id];
        const legacy = HABIT_CHECKS.find((c) => c.habitField === h.id);
        return !(legacy && habit?.[legacy.habitField]);
      })
      .map((h) => h.label);
  }
  const incomplete: string[] = [];
  for (const check of HABIT_CHECKS) {
    const isDone = typeof done[check.habitField] === "boolean" ? done[check.habitField] : habit?.[check.habitField];
    if (s[check.setting] !== false && !isDone) incomplete.push(check.label);
  }
  return incomplete;
}

async function processDailyHabitsType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, startOfDayUTC, sendPushAndLog } = ctx;
  const { data: usersSettings } = await supabase.from("settings").select("*").eq("notif_habits", true);
  const ids = (usersSettings ?? []).map((s) => s.user_id as string);
  const notified = await usersNotifiedToday(supabase, "daily_habits", startOfDayUTC, ids);
  const habitsByUser = await rowsByUser<DailyHabitRow & { user_id: string }>(supabase, "daily_habits", "*", ids, {
    eq: { date: today },
  });
  await mapPool(usersSettings || [], 5, async (s) => {
    if (notified.has(s.user_id)) return;
    const incomplete = buildIncompleteHabitsList(s, habitsByUser.get(s.user_id)?.[0] ?? null);

    if (incomplete.length > 0) {
      const actStr = pluralize(incomplete.length, "aktywność", "aktywności", "aktywności");
      const msg = `Masz ${incomplete.length} ${actStr} do zrobienia: ${incomplete.slice(0, 3).join(", ")}${incomplete.length > 3 ? "..." : ""}`;
      await sendPushAndLog(s.user_id, "Nawyki", msg, "/", { incomplete });
    }
  });
}

async function processOneDaySchema(
  ctx: NotifCtx,
  schema: DaySchemaRow,
  currentDayIndex: number,
  currentMinutes: number,
  currentTime: string
): Promise<void> {
  const { supabase, startOfDayUTC, sendPushAndLog } = ctx;

  let activeDays: number[] = [];
  try {
    const rawDays: unknown[] = typeof schema.days === "string" ? JSON.parse(schema.days) : schema.days || [];
    activeDays = rawDays.map(Number);
  } catch {
    return;
  }

  if (!activeDays.includes(currentDayIndex)) return;

  let entries: ScheduleEntry[] = [];
  try {
    entries = typeof schema.entries === "string" ? JSON.parse(schema.entries) : schema.entries || [];
  } catch {
    return;
  }

  const itemsToNotify = entries.filter(
    (item) => item.notify === true && Math.abs(timeToMinutes(item.time) - currentMinutes) <= 1
  );

  await mapPool(itemsToNotify, 5, async (item) => {
    const { data: alreadySent } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", schema.user_id)
      .eq("type", "day_schema")
      .gte("created_at", startOfDayUTC)
      .contains("data", { label: item.label })
      .maybeSingle();

    if (!alreadySent) {
      await sendPushAndLog(schema.user_id, `Teraz: ${item.label} 🕒`, `Zgodnie ze schematem: "${schema.name}"`, "/", {
        label: item.label,
        time: currentTime,
        sub_type: "day_schema_entry",
      });
    }
  });
}

function schemaDays(schema: DaySchemaRow): number[] {
  try {
    const raw: unknown[] = typeof schema.days === "string" ? JSON.parse(schema.days) : (schema.days as unknown[]) || [];
    return raw.map(Number);
  } catch {
    return [];
  }
}

/**
 * Jeden obowiązujący schemat na użytkownika (od 1.40 kilka schematów może
 * obejmować ten sam dzień): ręczny wybór na dziś → domyślny → pierwszy.
 */
function activeSchemasForToday(
  schemas: DaySchemaRow[],
  choices: Array<{ user_id: string; schema_id: string | null }>,
  dayIndex: number
): DaySchemaRow[] {
  const byUser = new Map<string, DaySchemaRow[]>();
  for (const s of schemas) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  const choiceByUser = new Map(choices.map((c) => [c.user_id, c.schema_id]));

  const result: DaySchemaRow[] = [];
  for (const [userId, list] of byUser) {
    if (choiceByUser.has(userId)) {
      const chosenId = choiceByUser.get(userId);
      if (chosenId === null) continue; // „bez schematu” na dziś
      const chosen = list.find((s) => String(s.id) === String(chosenId));
      if (chosen) {
        result.push({ ...chosen, days: [dayIndex] });
        continue;
      }
    }
    const candidates = list.filter((s) => schemaDays(s).includes(dayIndex));
    const active = candidates.find((s) => s.is_default) ?? candidates[0];
    if (active) result.push(active);
  }
  return result;
}

async function processDaySchemaType(ctx: NotifCtx): Promise<void> {
  const { supabase, plNow, today } = ctx;
  // „*”: kolumna is_default dochodzi migracją 1.40.
  const { data: daySchemas } = await supabase.from("day_schemas").select("*");
  const { data: choices } = await supabase.from("day_schema_choices").select("user_id, schema_id").eq("date", today);

  const currentTime = `${plNow.hour}:${plNow.timeStr.split(":")[1]}`;
  const currentMinutes = timeToMinutes(currentTime);
  const currentDayIndex = weekdayIndexPL(plNow.dateStr);

  const optedOut = await optedOutUsers(supabase, "notif_day_schema");
  const active = activeSchemasForToday((daySchemas || []) as DaySchemaRow[], choices || [], currentDayIndex).filter(
    (schema) => !optedOut.has(schema.user_id)
  );

  await mapPool(active, 5, async (schema) => {
    await processOneDaySchema(ctx, schema, currentDayIndex, currentMinutes, currentTime);
  });
}

async function processEveningAuditType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, startOfDayUTC, sendPushAndLog } = ctx;
  const { data: users } = await supabase
    .from("settings")
    .select("user_id")
    .eq("notif_evening", true)
    .not("user_id", "is", null);
  const ids = (users ?? []).map((u) => u.user_id as string);
  const notified = await usersNotifiedToday(supabase, "evening_audit", startOfDayUTC, ids);
  const tasksByUser = await rowsByUser<{ user_id: string; status: string }>(supabase, "tasks", "user_id, status", ids, {
    eq: { due_date: today },
  });
  await mapPool(users || [], 5, async (user) => {
    if (notified.has(user.user_id)) return;
    const tasks = tasksByUser.get(user.user_id) ?? [];
    const done = tasks.filter((t) => t.status === "done").length;
    const pending = tasks.length - done;
    if (pending > 0 || done > 0) {
      let msg = `Zrealizowano dziś ${done} ${pluralize(done, "zadanie", "zadania", "zadań")}.`;
      if (pending > 0) msg += ` Do zrobienia zostało ${pending}.`;
      await sendPushAndLog(user.user_id, "Czas na podsumowanie 🌙", msg, "/");
    }
  });
}

async function processLettersDeadlineType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, startOfDayUTC, sendPushAndLog, incrementProcessed } = ctx;
  const tomorrowStr = getPLTimeStrings(new Date(Date.now() + 86_400_000)).dateStr;
  const { data: letters } = await supabase
    .from("letters")
    .select("id, user_id, signature, recipient, response_date")
    .is("response_file_path", null)
    .not("response_date", "is", null)
    .gte("response_date", today)
    .lte("response_date", tomorrowStr);

  const optedOutLetters = await optedOutUsers(supabase, "notif_letters");
  await mapPool((letters || []).filter((l) => !optedOutLetters.has(l.user_id)), 5, async (letter) => {
    const { data: alreadySent } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", letter.user_id)
      .eq("type", "letters_deadline")
      .gte("created_at", startOfDayUTC)
      .contains("data", { letter_id: letter.id })
      .maybeSingle();
    if (alreadySent) return;

    const dueLabel = letter.response_date === today ? "dziś" : "jutro";
    await sendPushAndLog(
      letter.user_id,
      `Termin odpowiedzi ${dueLabel}: ${letter.signature}`,
      `Pismo do: ${letter.recipient}. Odpowiedź nie została jeszcze załączona.`,
      "/notes/letters",
      { letter_id: letter.id, due: letter.response_date }
    );
    incrementProcessed();
  });
}

async function processPollClosingType(ctx: NotifCtx): Promise<void> {
  const { supabase, startOfDayUTC, sendPushAndLog, incrementProcessed } = ctx;
  const tomorrowStr = getPLTimeStrings(new Date(Date.now() + 86_400_000)).dateStr;
  const { data: pollDates } = await supabase.from("meeting_poll_dates").select("poll_id, date");

  const earliestByPoll = new Map<string, string>();
  for (const row of pollDates || []) {
    const current = earliestByPoll.get(row.poll_id);
    if (!current || row.date < current) earliestByPoll.set(row.poll_id, row.date);
  }
  const closingIds = [...earliestByPoll.entries()].filter(([, date]) => date === tomorrowStr).map(([pollId]) => pollId);
  if (closingIds.length === 0) return;

  const { data: polls } = await supabase
    .from("meeting_polls")
    .select("id, user_id, title")
    .eq("status", "open")
    .in("id", closingIds);

  const optedOutPolls = await optedOutUsers(supabase, "notif_polls");
  await mapPool((polls || []).filter((p) => !optedOutPolls.has(p.user_id)), 5, async (poll) => { 
    const { data: alreadySent } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", poll.user_id)
      .eq("type", "poll_closing")
      .gte("created_at", startOfDayUTC)
      .contains("data", { poll_id: poll.id })
      .maybeSingle();
    if (alreadySent) return;

    const { count } = await supabase
      .from("meeting_poll_responses")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", poll.id);

    await sendPushAndLog(
      poll.user_id,
      `Ankieta „${poll.title}" zamyka się jutro`,
      `Pierwszy proponowany termin jest jutro. Odpowiedzi: ${count ?? 0}. Sfinalizuj termin.`,
      "/meetings",
      { poll_id: poll.id }
    );
    incrementProcessed();
  });
}

function getMMDD(d: Date): string {
  return getPLTimeStrings(d).dateStr.substring(5, 10);
}

function isPeopleNotifSent(
  sentNotifs: SentNotifRow[] | null,
  userId: string,
  subType: string,
  personId: string
): boolean {
  return !!sentNotifs?.some(
    (n) => n.user_id === userId && n.data?.sub_type === subType && n.data?.person_id === personId
  );
}

function isContactRemindedRecently(
  sentNotifs: SentNotifRow[] | null,
  userId: string,
  personId: string,
  sinceISO: string
): boolean {
  return !!sentNotifs?.some(
    (n) =>
      n.user_id === userId &&
      n.data?.sub_type === "contact_reminder" &&
      n.data?.person_id === personId &&
      new Date(n.created_at) >= new Date(sinceISO)
  );
}

async function notifyAnniversary(
  ctx: NotifCtx,
  person: PersonRow,
  dateValue: string | null,
  windows: { todayMMDD: string; plus1MMDD: string; plus7MMDD: string },
  currentYearStr: string,
  sentNotifs: SentNotifRow[] | null,
  kind: "birthday" | "nameday"
): Promise<void> {
  if (!dateValue || dateValue.length < 10) return;
  const mmdd = dateValue.substring(5, 10);
  const name = `${person.first_name} ${person.last_name}`;

  const labels =
    kind === "birthday"
      ? {
          title: "Urodziny 🎂",
          d0: `Dzisiaj są urodziny: ${name}! 🎉`,
          d1: `Jutro są urodziny: ${name}.`,
          d7: `Za 7 dni urodziny obchodzi: ${name}.`,
          prefix: "bday",
        }
      : {
          title: "Imieniny 💐",
          d0: `Dzisiaj są imieniny: ${name}! 💐`,
          d1: `Jutro są imieniny: ${name}.`,
          d7: `Za 7 dni imieniny obchodzi: ${name}.`,
          prefix: "nday",
        };

  let matchedPeriod = "";
  let msg = "";
  if (mmdd === windows.todayMMDD) {
    matchedPeriod = "0";
    msg = labels.d0;
  } else if (mmdd === windows.plus1MMDD) {
    matchedPeriod = "1";
    msg = labels.d1;
  } else if (mmdd === windows.plus7MMDD) {
    matchedPeriod = "7";
    msg = labels.d7;
  }

  if (!matchedPeriod) return;
  const subType = `${labels.prefix}_${matchedPeriod}_${currentYearStr}`;
  if (isPeopleNotifSent(sentNotifs, person.user_id, subType, person.id)) return;

  await ctx.sendPushAndLog(person.user_id, labels.title, msg, "/people", { person_id: person.id, sub_type: subType });
}

function resolveLastContactDate(person: PersonRow): Date | null {
  if (person.last_contact_date) return new Date(person.last_contact_date);
  if (person.created_at) return new Date(person.created_at);
  return null;
}

const CONTACT_THRESHOLD_DAYS: Record<number, number> = { 1: 14, 2: 30, 3: 60, 4: 365 };

function isContactOverdue(priority: number, diffDays: number): boolean {
  const threshold = CONTACT_THRESHOLD_DAYS[priority];
  return threshold !== undefined && diffDays >= threshold;
}

async function notifyContactReminder(
  ctx: NotifCtx,
  person: PersonRow,
  sentNotifs: SentNotifRow[] | null,
  sevenDaysAgoUTC: string
): Promise<void> {
  const lastContact = resolveLastContactDate(person);
  if (!lastContact) return;

  const diffTime = Math.abs(ctx.realNow.getTime() - lastContact.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const shouldContact = isContactOverdue(person.priority, diffDays);
  if (!shouldContact || isContactRemindedRecently(sentNotifs, person.user_id, person.id, sevenDaysAgoUTC)) return;

  await ctx.sendPushAndLog(
    person.user_id,
    "Przypomnienie o kontakcie 📞",
    `Czas odezwać się do: ${person.first_name} ${person.last_name}.`,
    `/people`,
    { person_id: person.id, sub_type: "contact_reminder" }
  );

  const { error: taskError } = await ctx.supabase.from("tasks").insert({
    user_id: person.user_id,
    title: `Kontakt: ${person.first_name} ${person.last_name}`,
    description: person.last_contact_date
      ? `Ostatnio: ${new Date(person.last_contact_date).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })}`
      : "",
    due_date: ctx.plNow.dateStr,
    category: "osobiste",
    priority: 3,
    status: "pending",
  });

  if (taskError) {
    console.error(`Błąd przy dodawaniu zadania dla ${person.id}:`, taskError);
  }
}

async function processOnePerson(
  ctx: NotifCtx,
  person: PersonRow,
  userSettings: SettingsPrefRow[] | null,
  windows: { todayMMDD: string; plus1MMDD: string; plus7MMDD: string },
  currentYearStr: string,
  sentNotifs: SentNotifRow[] | null,
  sevenDaysAgoUTC: string
): Promise<void> {
  const userPref = userSettings?.find((s) => s.user_id === person.user_id);

  if (person.priority >= 0 && person.priority <= 2 && userPref?.notif_birthdays !== false) {
    await notifyAnniversary(ctx, person, person.birthday, windows, currentYearStr, sentNotifs, "birthday");
    await notifyAnniversary(ctx, person, person.nameday, windows, currentYearStr, sentNotifs, "nameday");
  }

  if (person.priority >= 1 && person.priority <= 4 && userPref?.notif_contact !== false) {
    await notifyContactReminder(ctx, person, sentNotifs, sevenDaysAgoUTC);
  }
}

async function processPeopleType(ctx: NotifCtx): Promise<void> {
  const { supabase, realNow, plNow } = ctx;
  const { data: people } = await supabase.from("people").select("*");
  const { data: userSettings } = await supabase.from("settings").select("user_id, notif_birthdays, notif_contact");

  if (!people || people.length === 0) return;

  const todayMMDD = getMMDD(realNow);
  const plus1MMDD = getMMDD(new Date(realNow.getTime() + 86400000));
  const plus7MMDD = getMMDD(new Date(realNow.getTime() + 7 * 86400000));
  const currentYearStr = plNow.dateStr.substring(0, 4);
  const windows = { todayMMDD, plus1MMDD, plus7MMDD };

  const sevenDaysAgoUTC = new Date(realNow.getTime() - 7 * 86400000).toISOString();
  const { data: sentNotifs } = await supabase
    .from("notifications")
    .select("user_id, data, created_at")
    .eq("type", "people")
    .gte("created_at", new Date(realNow.getFullYear(), 0, 1).toISOString());

  await mapPool(people, 5, async (p) => {
    await processOnePerson(ctx, p, userSettings, windows, currentYearStr, sentNotifs, sevenDaysAgoUTC);
  });
}

interface TaskReminderRow {
  id: string;
  task_id: string | number;
  user_id: string;
  remind_at: string;
}

// Spóźnione przypomnienie (np. po przerwie crona) oznaczamy jako wysłane, ale nie
// wysyłamy – ta sama tolerancja co dla wydarzeń.
const TASK_REMINDER_MAX_DELAY_MS = REMINDER_TOLERANCE_MS;

function describeDue(dueDate: string | null, today: string): string {
  if (!dueDate) return "Zadanie czeka na Ciebie.";
  if (dueDate < today) return `Termin minął ${dueDate.split("-").reverse().join(".")}.`;
  if (dueDate === today) return "Termin: dziś.";
  return `Termin: ${dueDate.split("-").reverse().join(".")}.`;
}

// Przypomnienia ustawione ręcznie przy zadaniu (do 5 na zadanie). Uruchamiane
// co minutę: ?type=task_reminder. Wiersze „rezerwujemy” jednym UPDATE ... WHERE
// sent_at IS NULL, więc dwa równoległe wywołania nie wyślą tego samego dwa razy.
async function processTaskReminderType(ctx: NotifCtx): Promise<void> {
  const { supabase, realNow, today, sendPushAndLog } = ctx;
  const nowIso = realNow.toISOString();

  const { data: claimed, error } = await supabase
    .from("task_reminders")
    .update({ sent_at: nowIso })
    .is("sent_at", null)
    .lte("remind_at", nowIso)
    .select("id, task_id, user_id, remind_at");
  if (error) throw error;

  const due = ((claimed ?? []) as TaskReminderRow[]).filter(
    (r) => realNow.getTime() - new Date(r.remind_at).getTime() <= TASK_REMINDER_MAX_DELAY_MS
  );
  if (due.length === 0) return;

  const taskIds = [...new Set(due.map((r) => r.task_id))];
  const { data: tasks } = await supabase.from("tasks").select("id, title, status, due_date").in("id", taskIds);
  const byId = new Map(
    ((tasks ?? []) as Array<{ id: string | number; title: string; status: string; due_date: string | null }>).map(
      (t) => [String(t.id), t]
    )
  );

  await mapPool(due, 5, async (r) => {
    const task = byId.get(String(r.task_id));
    if (!task || task.status === "done") return; // zrobione albo usunięte – nie przeszkadzamy
    await sendPushAndLog(
      r.user_id,
      `Przypomnienie: ${task.title.substring(0, 80)}`,
      describeDue(task.due_date, today),
      "/tasks",
      { task_id: String(r.task_id), reminder_id: r.id }
    );
  });
}

/** Od tej godziny (czas polski) wysyłamy push o dzisiejszych płatnościach. */
const BILL_PUSH_HOUR = 8;

/**
 * Push w dniu terminu płatności (?type=bill_due, np. co godzinę). Jeden push
 * dziennie na osobę z listą rachunków; tylko dla osób z notif_bills
 * i tylko rachunki bez płatności powiązanej w tym miesiącu.
 */
async function processBillDueType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, plNow, wasAlreadySentToday, sendPushAndLog } = ctx;
  if (Number(plNow.hour) < BILL_PUSH_HOUR) return;

  const { data: users } = await supabase
    .from("settings")
    .select("user_id")
    .eq("notif_bills", true)
    .not("user_id", "is", null);
  const userIds = (users ?? []).map((u: { user_id: string }) => u.user_id);
  if (userIds.length === 0) return;

  const { data: bills } = await supabase.from("recurring_bills").select("*").eq("active", true).in("user_id", userIds);
  const due = (
    (bills ?? []) as Array<{
      id: string;
      user_id: string;
      name: string;
      amount: number;
      start_date: string;
      recurrence: unknown;
      active: boolean;
    }>
  ).filter((b) => isBillDueOn(b, today));
  if (due.length === 0) return;

  const { data: paid } = await supabase
    .from("transactions")
    .select("recurring_bill_id")
    .in(
      "recurring_bill_id",
      due.map((b) => b.id)
    )
    .gte("date", `${today.slice(0, 7)}-01`)
    .lte("date", today);
  const paidIds = new Set((paid ?? []).map((p: { recurring_bill_id: string }) => p.recurring_bill_id));

  const byUser = new Map<string, typeof due>();
  for (const b of due) if (!paidIds.has(b.id)) byUser.set(b.user_id, [...(byUser.get(b.user_id) ?? []), b]);

  await mapPool([...byUser.entries()], 5, async ([userId, list]) => {
    if (await wasAlreadySentToday(userId, "bill_due")) return;
    const total = list.reduce((s, b) => s + Number(b.amount), 0);
    const title = list.length === 1 ? `Dziś płatność: ${list[0].name}` : `Dziś płatności: ${list.length}`;
    const message =
      list.length === 1
        ? `${Number(list[0].amount).toFixed(2)} zł`
        : `${list.map((b) => b.name).join(", ")} – razem ${total.toFixed(2)} zł`;
    await sendPushAndLog(userId, title, message.slice(0, 180), "/bills", { bills: list.map((b) => b.id) });
  });
}

const NOTIFICATION_HANDLERS: Record<string, (ctx: NotifCtx) => Promise<void>> = {
  morning_brief: processMorningBriefType,
  upcoming_task: processUpcomingTaskType,
  upcoming_event: processUpcomingEventType,
  hydration: processHydrationType,
  daily_habits: processDailyHabitsType,
  day_schema: processDaySchemaType,
  evening_audit: processEveningAuditType,
  letters_deadline: processLettersDeadlineType,
  poll_closing: processPollClosingType,
  people: processPeopleType,
  task_reminder: processTaskReminderType,
  bill_due: processBillDueType,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return preflight();
  }

  if (!verifyCronSecret(req)) {
    return unauthorized();
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "daily_habits";

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const realNow = new Date();
    const plNow = getPLTimeStrings(realNow);
    const today = plNow.dateStr;
    const currentHour = Number.parseInt(plNow.hour, 10);

    const msSinceMidnightPL =
      (currentHour * 3600 +
        Number.parseInt(plNow.timeStr.split(":")[1], 10) * 60 +
        Number.parseInt(plNow.timeStr.split(":")[2], 10)) *
      1000;
    const startOfDayUTC = new Date(realNow.getTime() - msSinceMidnightPL - realNow.getMilliseconds()).toISOString();

    let processedCount = 0;

    const sendPushAndLog = async (
      userId: string,
      title: string,
      message: string,
      targetUrl: string,
      dataObj: Record<string, unknown> = {}
    ) => {
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: type,
          title,
          message,
          data: dataObj,
        });

        const { error: pushError } = await supabase.functions.invoke("send-push", {
          body: { userId, title, message, url: targetUrl, data: { type, ...dataObj } },
        });

        if (!pushError) {
          processedCount++;
        } else {
          console.error(`Błąd zlecenia wysyłki push (send-push) dla usera ${userId}:`, pushError);
        }
      } catch (err) {
        console.error(`Błąd wysyłki dla usera ${userId}:`, err);
      }
    };

    const wasAlreadySentToday = async (userId: string, notifType: string): Promise<boolean> => {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", notifType)
        .gte("created_at", startOfDayUTC)
        .limit(1)
        .maybeSingle();
      return !!data;
    };

    const ctx: NotifCtx = {
      supabase,
      today,
      currentHour,
      realNow,
      plNow,
      startOfDayUTC,
      sendPushAndLog,
      wasAlreadySentToday,
      incrementProcessed: () => {
        processedCount++;
      },
    };

    const selectedHandler = NOTIFICATION_HANDLERS[type];
    if (selectedHandler) {
      await selectedHandler(ctx);
    }

    return new Response(JSON.stringify({ success: true, type, sentCount: processedCount, version: FUNCTION_VERSION }), {
      headers: jsonHeaders,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Critical error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: jsonHeaders });
  }
});
