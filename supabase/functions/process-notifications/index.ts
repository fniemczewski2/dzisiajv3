// supabase/functions/process-notifications/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { verifyCronSecret, corsHeaders, jsonHeaders, unauthorized } from '../_shared/auth.ts'
import { getErrorMessage } from '../_shared/errors.ts';

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

interface EventRow {
  id: string;
  user_id: string | null;
  shared_with_id: string | null;
  title: string;
  start_time: string;
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
}

interface DaySchemaRow {
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
  if (count === 1) return 'litr';
  if (count % 1 !== 0) return 'litra';
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return 'litry';
  return 'litrów';
}

function getPLTimeStrings(dateObj: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(dateObj);

  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;

  let hour = p.hour;
  if (hour === '24') hour = '00';

  const dateStr = `${p.year}-${p.month}-${p.day}`;
  const timeStr = `${hour}:${p.minute}:${p.second}`;
  return { dateStr, timeStr, hour };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

interface NotifCtx {
  supabase: ReturnType<typeof createClient>;
  today: string;
  currentHour: number;
  realNow: Date;
  plNow: ReturnType<typeof getPLTimeStrings>;
  startOfDayUTC: string;
  sendPushAndLog: (userId: string, title: string, message: string, targetUrl: string, dataObj?: Record<string, unknown>) => Promise<void>;
  wasAlreadySentToday: (userId: string, notifType: string) => Promise<boolean>;
  incrementProcessed: () => void;
}

async function processMorningBriefType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, wasAlreadySentToday, sendPushAndLog } = ctx;
  const { data: users } = await supabase.from('settings').select('user_id').eq('notif_morning_brief', true).not('user_id', 'is', null)
  for (const user of users || []) {
    if (await wasAlreadySentToday(user.user_id, 'morning_brief')) continue;

    const { count: tasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).eq('due_date', today).neq('status', 'done')
    const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).like('start_time', `${today}%`)

    if ((tasksCount && tasksCount > 0) || (eventsCount && eventsCount > 0)) {
      const msgParts = [];
      if (eventsCount && eventsCount > 0) msgParts.push(`${eventsCount} ${pluralize(eventsCount, 'wydarzenie', 'wydarzenia', 'wydarzeń')}`);
      if (tasksCount && tasksCount > 0) msgParts.push(`${tasksCount} ${pluralize(tasksCount, 'zadanie', 'zadania', 'zadań')}`);
      await sendPushAndLog(user.user_id, 'Dzień dobry!', `Masz dziś ${msgParts.join(' i ')}.`, '/')
    }
  }
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

function isTaskNotifSent(sentNotifs: TaskNotifRow[] | null, userId: string, subType: string, taskId: string): boolean {
  return !!sentNotifs?.some(n =>
    n.user_id === userId &&
    n.data?.sub_type === subType &&
    String(n.data?.task_id ?? '').split(',').includes(taskId.toString())
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
  for (const [userId, tasks] of tasksByUser) {
    const unsentTasks = tasks.filter(t => !isTaskNotifSent(sentNotifs, userId, subType, t.id));

    if (unsentTasks.length === 1) {
      const t = unsentTasks[0];
      const { title, message, url } = buildSingle(t);
      await ctx.sendPushAndLog(userId, title, message, url, { task_id: t.id.toString(), sub_type: subType });
    } else if (unsentTasks.length > 1) {
      const { title, message, url } = buildMultiple(unsentTasks);
      const taskIds = unsentTasks.map(t => t.id).join(',');
      await ctx.sendPushAndLog(userId, title, message, url, { task_id: taskIds, sub_type: subType });
    }
  }
}

async function processUpcomingTaskType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, plNow, currentHour, realNow, startOfDayUTC } = ctx;
  const { data: optInUsers } = await supabase.from('settings').select('user_id').eq('notif_tasks', true)
  const allowedIds = (optInUsers || []).map(u => u.user_id)
  if (allowedIds.length === 0) return;

  const { data: sentNotifs } = await supabase.from('notifications')
    .select('user_id, data')
    .eq('type', 'upcoming_task')
    .gte('created_at', startOfDayUTC);

  const currentHourStartStr = `${today} ${plNow.hour}:00:00`;
  const currentHourEndStr = `${today} ${plNow.hour}:59:59`;

  const { data: tasksNow } = await supabase.from('tasks')
    .select('*')
    .in('user_id', allowedIds)
    .neq('status', 'done')
    .not('scheduled_time', 'is', null)
    .gte('scheduled_time', currentHourStartStr)
    .lte('scheduled_time', currentHourEndStr);

  await notifyTaskGroup(ctx, groupTasksByUser(tasksNow || []), 'exact_time', sentNotifs,
    (t) => ({ title: t.title, message: 'Rozpocznij zadanie.', url: '/tasks' }),
    (tasks) => {
      const titles = tasks.map(t => t.title).join(', ');
      return {
        title: `${tasks.length} ${pluralize(tasks.length, 'zadanie', 'zadania', 'zadań')}`,
        message: `Rozpocznij: ${titles.substring(0, 50)}${titles.length > 50 ? '...' : ''}`,
        url: '/tasks',
      };
    }
  );

  const lateObj = new Date(realNow.getTime() - 3600000);
  const plLate = getPLTimeStrings(lateObj);
  const lateHourStartStr = `${plLate.dateStr} ${plLate.hour}:00:00`;
  const lateHourEndStr = `${plLate.dateStr} ${plLate.hour}:59:59`;

  const { data: tasksLate } = await supabase.from('tasks')
    .select('*')
    .in('user_id', allowedIds)
    .neq('status', 'done')
    .not('scheduled_time', 'is', null)
    .gte('scheduled_time', lateHourStartStr)
    .lte('scheduled_time', lateHourEndStr);

  await notifyTaskGroup(ctx, groupTasksByUser(tasksLate || []), 'late_1h', sentNotifs,
    (t) => ({ title: 'PILNE', message: `Zadanie ${t.title} nie jest zrobione.`, url: '/tasks' }),
    (tasks) => {
      const titles = tasks.map(t => t.title).join(', ');
      return {
        title: 'PILNE',
        message: `Zadania (${tasks.length}) nie są zrobione: ${titles.substring(0, 50)}${titles.length > 50 ? '...' : ''}`,
        url: '/tasks',
      };
    }
  );

  if (currentHour !== 14) return;

  const { data: tasksNoTime } = await supabase.from('tasks')
    .select('*')
    .in('user_id', allowedIds)
    .neq('status', 'done')
    .is('scheduled_time', null)
    .eq('due_date', today);

  await notifyTaskGroup(ctx, groupTasksByUser(tasksNoTime || []), 'no_time_14', sentNotifs,
    (t) => ({ title: 'PILNE', message: `Zadanie ${t.title} nie jest zrobione.`, url: '/' }),
    (tasks) => {
      const titles = tasks.map(t => t.title).join(', ');
      return {
        title: 'PILNE',
        message: `Masz ${tasks.length} nieukończone ${pluralize(tasks.length, 'zadanie', 'zadania', 'zadań')}: ${titles.substring(0, 50)}${titles.length > 50 ? '...' : ''}`,
        url: '/',
      };
    }
  );
}

async function notifyEventParticipants(
  ctx: NotifCtx,
  ev: EventRow,
  allowedIds: Set<string>,
  windows: { nowStr: string; in5MinsStr: string; in1DayStr: string; in7DaysStr: string }
): Promise<void> {
  const { supabase, sendPushAndLog } = ctx;
  const evTime = ev.start_time;
  const participants = new Set<string>()

  if (ev.user_id && allowedIds.has(ev.user_id)) participants.add(ev.user_id)
  if (ev.shared_with_id && allowedIds.has(ev.shared_with_id)) participants.add(ev.shared_with_id)

  const { data: existing } = await supabase.from('notifications')
    .select('data').eq('type', 'upcoming_event').contains('data', { event_id: ev.id })

  const sentReminders = new Set((existing || []).map(n => n.data?.reminder_type).filter(Boolean))

  const { nowStr, in5MinsStr, in1DayStr, in7DaysStr } = windows;

  for (const userId of participants) {
    let title = '', message = '', rType = ''

    if (evTime <= in5MinsStr && evTime > nowStr && !sentReminders.has('5min')) {
      title = `Zaraz: ${ev.title}`; message = `Zaczynamy za 5 minut.`; rType = '5min'
    } else if (evTime <= in1DayStr && evTime > in5MinsStr && !sentReminders.has('1day')) {
      title = `Jutro: ${ev.title}`; message = `Przypomnienie o jutrzejszym wydarzeniu.`; rType = '1day'
    } else if (evTime <= in7DaysStr && evTime > in1DayStr && !sentReminders.has('7days')) {
      title = `Za tydzień: ${ev.title}`; message = `Masz wydarzenie za tydzień.`; rType = '7days'
    }

    if (rType) await sendPushAndLog(userId, title, message, '/calendar', { event_id: ev.id, reminder_type: rType })
  }
}

async function processUpcomingEventType(ctx: NotifCtx): Promise<void> {
  const { supabase, realNow } = ctx;
  const { data: optInUsers } = await supabase.from('settings').select('user_id').eq('notif_events', true)
  const allowedIds = new Set((optInUsers || []).map(u => u.user_id))
  if (allowedIds.size === 0) return;

  const formatQueryStr = (offsetMs: number) => {
     const d = getPLTimeStrings(new Date(realNow.getTime() + offsetMs));
     return `${d.dateStr} ${d.timeStr}`;
  };

  const nowStr = formatQueryStr(0);
  const in5MinsStr = formatQueryStr(5 * 60000);
  const in1DayStr = formatQueryStr(24 * 60 * 60 * 1000);
  const in7DaysStr = formatQueryStr(7 * 24 * 60 * 60 * 1000);

  const { data: events } = await supabase.from('events').select('*')
    .gte('start_time', nowStr).lte('start_time', in7DaysStr)

  for (const ev of events || []) {
    await notifyEventParticipants(ctx, ev, allowedIds, { nowStr, in5MinsStr, in1DayStr, in7DaysStr });
  }
}

async function processHydrationType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, currentHour, startOfDayUTC, sendPushAndLog } = ctx;
  const { data: users } = await supabase.from('settings').select('user_id').eq('show_water_tracker', true).eq('notif_water', true)
  for (const user of users || []) {
    const { data: alreadySent } = await supabase.from('notifications')
      .select('id')
      .eq('user_id', user.user_id)
      .eq('type', 'hydration')
      .gte('created_at', startOfDayUTC)
      .contains('data', { slot: currentHour })
      .maybeSingle();
    if (alreadySent) continue;

    const { data: habit } = await supabase.from('daily_habits').select('water_amount').eq('user_id', user.user_id).eq('date', today).maybeSingle()
    const amount = habit?.water_amount || 0
    let remind = false
    if (currentHour <= 10 && amount <= 0) remind = true
    if (currentHour > 10 && currentHour <= 14 && amount < 1.0) remind = true
    if (currentHour > 14 && currentHour <= 18 && amount < 1.5) remind = true

    if (remind) {
      await sendPushAndLog(user.user_id, 'Czas na wodę! đź’§', `Wypito tylko ${amount} ${pluralizeLiters(amount)}. Uzupełnij płyny!`, '/', { slot: currentHour })
    }
  }
}

function buildIncompleteHabitsList(s: HabitSettingsRow, habit: DailyHabitRow | null): string[] {
  const incomplete: string[] = [];
  if (s.habit_pills && (!habit?.pills)) incomplete.push('Leki')
  if (s.habit_bath && (!habit?.bath)) incomplete.push('Higiena')
  if (s.habit_workout && (!habit?.workout)) incomplete.push('Trening')
  if (s.habit_friends && (!habit?.friends)) incomplete.push('Relacje')
  if (s.habit_work && (!habit?.work)) incomplete.push('Praca')
  if (s.habit_housework && (!habit?.housework)) incomplete.push('Dom')
  if (s.habit_plants && (!habit?.plants)) incomplete.push('Digital')
  if (s.habit_duolingo && (!habit?.duolingo)) incomplete.push('Języki')
  return incomplete;
}

async function processDailyHabitsType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, wasAlreadySentToday, sendPushAndLog } = ctx;
  const { data: usersSettings } = await supabase.from('settings').select('*').eq('notif_habits', true)
  for (const s of usersSettings || []) {
    if (await wasAlreadySentToday(s.user_id, 'daily_habits')) continue;

    const { data: habit } = await supabase.from('daily_habits').select('*').eq('date', today).eq('user_id', s.user_id).maybeSingle()
    const incomplete = buildIncompleteHabitsList(s, habit);

    if (incomplete.length > 0) {
      const actStr = pluralize(incomplete.length, 'aktywność', 'aktywności', 'aktywności');
      const msg = `Masz ${incomplete.length} ${actStr} do zrobienia: ${incomplete.slice(0, 3).join(', ')}${incomplete.length > 3 ? '...' : ''}`
      await sendPushAndLog(s.user_id, 'Nawyki', msg, '/habits', { incomplete })
    }
  }
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
    const rawDays: unknown[] = typeof schema.days === 'string' ? JSON.parse(schema.days) : (schema.days || []);
    activeDays = rawDays.map(Number);
  } catch { return; }

  if (!activeDays.includes(currentDayIndex)) return;

  let entries: ScheduleEntry[] = [];
  try {
    entries = typeof schema.entries === 'string' ? JSON.parse(schema.entries) : (schema.entries || []);
  } catch { return; }

  const itemsToNotify = entries.filter((item) =>
    item.notify === true && Math.abs(timeToMinutes(item.time) - currentMinutes) <= 1
  );

  for (const item of itemsToNotify) {
    const { data: alreadySent } = await supabase.from('notifications')
      .select('id')
      .eq('user_id', schema.user_id)
      .eq('type', 'day_schema')
      .gte('created_at', startOfDayUTC)
      .contains('data', { label: item.label })
      .maybeSingle();

    if (!alreadySent) {
      await sendPushAndLog(
        schema.user_id,
        `Teraz: ${item.label} đź•’`,
        `Zgodnie ze schematem: "${schema.name}"`,
        '/',
        { label: item.label, time: currentTime, sub_type: 'day_schema_entry' }
      );
    }
  }
}

async function processDaySchemaType(ctx: NotifCtx): Promise<void> {
  const { supabase, realNow, currentHour, plNow } = ctx;
  const { data: daySchemas } = await supabase
    .from('day_schemas')
    .select('user_id, entries, days, name');

  const currentTime = `${plNow.hour}:${plNow.timeStr.split(':')[1]}`;
  const currentMinutes = timeToMinutes(currentTime);
  const currentDayObj = new Date(realNow.getTime() + (currentHour * 3600000));
  const currentDayIndex = (currentDayObj.getDay() + 6) % 7;

  for (const schema of daySchemas || []) {
    await processOneDaySchema(ctx, schema, currentDayIndex, currentMinutes, currentTime);
  }
}

async function processEveningAuditType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, wasAlreadySentToday, sendPushAndLog } = ctx;
  const { data: users } = await supabase.from('settings').select('user_id').eq('notif_evening', true).not('user_id', 'is', null)
  for (const user of users || []) {
    if (await wasAlreadySentToday(user.user_id, 'evening_audit')) continue;

    const { count: doneCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).eq('due_date', today).eq('status', 'done')
    const { count: pendingCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).eq('due_date', today).neq('status', 'done')

    if ((pendingCount && pendingCount > 0) || (doneCount && doneCount > 0)) {
      let msg = `Zrealizowano dziś ${doneCount} ${pluralize(doneCount, 'zadanie', 'zadania', 'zadań')}.`;
      if (pendingCount && pendingCount > 0) msg += ` Do zrobienia zostało ${pendingCount}.`;
      await sendPushAndLog(user.user_id, 'Czas na podsumowanie đźŚ™', msg, '/')
    }
  }
}

async function processLettersDeadlineType(ctx: NotifCtx): Promise<void> {
  const { supabase, today, startOfDayUTC, sendPushAndLog, incrementProcessed } = ctx;
  const tomorrowStr = getPLTimeStrings(new Date(Date.now() + 86_400_000)).dateStr;
  const { data: letters } = await supabase
    .from('letters')
    .select('id, user_id, signature, recipient, response_date')
    .is('response_file_path', null)
    .not('response_date', 'is', null)
    .gte('response_date', today)
    .lte('response_date', tomorrowStr);

  for (const letter of letters || []) {
    const { data: alreadySent } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', letter.user_id)
      .eq('type', 'letters_deadline')
      .gte('created_at', startOfDayUTC)
      .contains('data', { letter_id: letter.id })
      .maybeSingle();
    if (alreadySent) continue;

    const dueLabel = letter.response_date === today ? 'dziś' : 'jutro';
    await sendPushAndLog(
      letter.user_id,
      `Termin odpowiedzi ${dueLabel}: ${letter.signature}`,
      `Pismo do: ${letter.recipient}. Odpowiedź nie została jeszcze załączona.`,
      '/notes/letters',
      { letter_id: letter.id, due: letter.response_date }
    );
    incrementProcessed();
  }
}

async function processPollClosingType(ctx: NotifCtx): Promise<void> {
  const { supabase, startOfDayUTC, sendPushAndLog, incrementProcessed } = ctx;
  const tomorrowStr = getPLTimeStrings(new Date(Date.now() + 86_400_000)).dateStr;
  const { data: pollDates } = await supabase
    .from('meeting_poll_dates')
    .select('poll_id, date');

  const earliestByPoll = new Map<string, string>();
  for (const row of pollDates || []) {
    const current = earliestByPoll.get(row.poll_id);
    if (!current || row.date < current) earliestByPoll.set(row.poll_id, row.date);
  }
  const closingIds = [...earliestByPoll.entries()]
    .filter(([, date]) => date === tomorrowStr)
    .map(([pollId]) => pollId);
  if (closingIds.length === 0) return;

  const { data: polls } = await supabase
    .from('meeting_polls')
    .select('id, user_id, title')
    .eq('status', 'open')
    .in('id', closingIds);

  for (const poll of polls || []) {
    const { data: alreadySent } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', poll.user_id)
      .eq('type', 'poll_closing')
      .gte('created_at', startOfDayUTC)
      .contains('data', { poll_id: poll.id })
      .maybeSingle();
    if (alreadySent) continue;

    const { count } = await supabase
      .from('meeting_poll_responses')
      .select('id', { count: 'exact', head: true })
      .eq('poll_id', poll.id);

    await sendPushAndLog(
      poll.user_id,
      `Ankieta „${poll.title}" zamyka się jutro`,
      `Pierwszy proponowany termin jest jutro. Odpowiedzi: ${count ?? 0}. Sfinalizuj termin.`,
      '/meetings',
      { poll_id: poll.id }
    );
    incrementProcessed();
  }
}

function getMMDD(d: Date): string {
  return getPLTimeStrings(d).dateStr.substring(5, 10);
}

function isPeopleNotifSent(sentNotifs: SentNotifRow[] | null, userId: string, subType: string, personId: string): boolean {
  return !!sentNotifs?.some(n =>
    n.user_id === userId &&
    n.data?.sub_type === subType &&
    n.data?.person_id === personId
  );
}

function isContactRemindedRecently(sentNotifs: SentNotifRow[] | null, userId: string, personId: string, sinceISO: string): boolean {
  return !!sentNotifs?.some(n =>
    n.user_id === userId &&
    n.data?.sub_type === 'contact_reminder' &&
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
  kind: 'birthday' | 'nameday'
): Promise<void> {
  if (!dateValue || dateValue.length < 10) return;
  const mmdd = dateValue.substring(5, 10);
  const name = `${person.first_name} ${person.last_name}`;

  const labels = kind === 'birthday'
    ? {
        title: 'Urodziny đźŽ‚',
        d0: `Dzisiaj są urodziny: ${name}! đźŽ‰`,
        d1: `Jutro są urodziny: ${name}.`,
        d7: `Za 7 dni urodziny obchodzi: ${name}.`,
        prefix: 'bday',
      }
    : {
        title: 'Imieniny đź’',
        d0: `Dzisiaj są imieniny: ${name}! đź’`,
        d1: `Jutro są imieniny: ${name}.`,
        d7: `Za 7 dni imieniny obchodzi: ${name}.`,
        prefix: 'nday',
      };

  let matchedPeriod = '';
  let msg = '';
  if (mmdd === windows.todayMMDD) { matchedPeriod = '0'; msg = labels.d0; }
  else if (mmdd === windows.plus1MMDD) { matchedPeriod = '1'; msg = labels.d1; }
  else if (mmdd === windows.plus7MMDD) { matchedPeriod = '7'; msg = labels.d7; }

  if (!matchedPeriod) return;
  const subType = `${labels.prefix}_${matchedPeriod}_${currentYearStr}`;
  if (isPeopleNotifSent(sentNotifs, person.user_id, subType, person.id)) return;

  await ctx.sendPushAndLog(person.user_id, labels.title, msg, '/people', { person_id: person.id, sub_type: subType });
}

async function notifyContactReminder(
  ctx: NotifCtx,
  person: PersonRow,
  sentNotifs: SentNotifRow[] | null,
  sevenDaysAgoUTC: string
): Promise<void> {
  const lastContact = person.last_contact_date ? new Date(person.last_contact_date) : (person.created_at ? new Date(person.created_at) : null);
  if (!lastContact) return;

  const diffTime = Math.abs(ctx.realNow.getTime() - lastContact.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let shouldContact = false;
  if (person.priority === 1 && diffDays >= 14) shouldContact = true;
  else if (person.priority === 2 && diffDays >= 30) shouldContact = true;
  else if (person.priority === 3 && diffDays >= 60) shouldContact = true;
  else if (person.priority === 4 && diffDays >= 365) shouldContact = true;

  if (!shouldContact || isContactRemindedRecently(sentNotifs, person.user_id, person.id, sevenDaysAgoUTC)) return;

  await ctx.sendPushAndLog(
    person.user_id,
    'Przypomnienie o kontakcie đź“ž',
    `Czas odezwać się do: ${person.first_name} ${person.last_name}.`,
    `/people`,
    { person_id: person.id, sub_type: 'contact_reminder' }
  );

  const { error: taskError } = await ctx.supabase.from('tasks').insert({
    user_id: person.user_id,
    title: `Kontakt: ${person.first_name} ${person.last_name}`,
    description: `Ostatnio: ${person.last_contact_date}`,
    due_date: ctx.plNow.dateStr,
    category: 'personal',
    priority: 3,
    status: 'pending'
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
  const userPref = userSettings?.find(s => s.user_id === person.user_id);

  if (person.priority >= 0 && person.priority <= 2 && userPref?.notif_birthdays !== false) {
    await notifyAnniversary(ctx, person, person.birthday, windows, currentYearStr, sentNotifs, 'birthday');
    await notifyAnniversary(ctx, person, person.nameday, windows, currentYearStr, sentNotifs, 'nameday');
  }

  if (person.priority >= 1 && person.priority <= 4 && userPref?.notif_contact !== false) {
    await notifyContactReminder(ctx, person, sentNotifs, sevenDaysAgoUTC);
  }
}

async function processPeopleType(ctx: NotifCtx): Promise<void> {
  const { supabase, realNow, plNow } = ctx;
  const { data: people } = await supabase.from('people').select('*');
  const { data: userSettings } = await supabase.from('settings').select('user_id, notif_birthdays, notif_contact');

  if (!people || people.length === 0) return;

  const todayMMDD = getMMDD(realNow);
  const plus1MMDD = getMMDD(new Date(realNow.getTime() + 86400000));
  const plus7MMDD = getMMDD(new Date(realNow.getTime() + 7 * 86400000));
  const currentYearStr = plNow.dateStr.substring(0, 4);
  const windows = { todayMMDD, plus1MMDD, plus7MMDD };

  const sevenDaysAgoUTC = new Date(realNow.getTime() - 7 * 86400000).toISOString();
  const { data: sentNotifs } = await supabase.from('notifications')
    .select('user_id, data, created_at')
    .eq('type', 'people')
    .gte('created_at', new Date(realNow.getFullYear(), 0, 1).toISOString());

  for (const p of people) {
    await processOnePerson(ctx, p, userSettings, windows, currentYearStr, sentNotifs, sevenDaysAgoUTC);
  }
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
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!verifyCronSecret(req)) {
    return unauthorized();
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'daily_habits'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const realNow = new Date();
    const plNow = getPLTimeStrings(realNow);
    const today = plNow.dateStr;
    const currentHour = Number.parseInt(plNow.hour, 10);

    const msSinceMidnightPL = (currentHour * 3600 + Number.parseInt(plNow.timeStr.split(':')[1], 10) * 60 + Number.parseInt(plNow.timeStr.split(':')[2], 10)) * 1000;
    const startOfDayUTC = new Date(realNow.getTime() - msSinceMidnightPL - realNow.getMilliseconds()).toISOString();

    let processedCount = 0;

    const sendPushAndLog = async (userId: string, title: string, message: string, targetUrl: string, dataObj: Record<string, unknown> = {}) => {
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: type,
          title,
          message,
          data: dataObj
        })

        const { error: pushError } = await supabase.functions.invoke('send-push', {
          body: { userId, title, message, url: targetUrl, data: { type, ...dataObj } }
        });

        if (!pushError) {
          processedCount++;
        } else {
          console.error(`Błąd zlecenia wysyłki push (send-push) dla usera ${userId}:`, pushError);
        }
      } catch (err) {
        console.error(`Błąd wysyłki dla usera ${userId}:`, err)
      }
    }

    const wasAlreadySentToday = async (userId: string, notifType: string): Promise<boolean> => {
      const { data } = await supabase.from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', notifType)
        .gte('created_at', startOfDayUTC)
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
      incrementProcessed: () => { processedCount++; },
    };

    const selectedHandler = NOTIFICATION_HANDLERS[type];
    if (selectedHandler) {
      await selectedHandler(ctx);
    }

    return new Response(JSON.stringify({ success: true, type, sentCount: processedCount }), { headers: jsonHeaders })

  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Critical error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: jsonHeaders });
  }
})
