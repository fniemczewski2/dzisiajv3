// supabase/functions/process-notifications/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { verifyCronSecret, corsHeaders, jsonHeaders, unauthorized } from '../_shared/auth.ts'
import { getErrorMessage } from '../_shared/errors.ts';

interface NotifiableTask {
  id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
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

    const sendPushAndLog = async (userId: string, title: string, message: string, targetUrl: string, dataObj: any = {}) => {
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

    if (type === 'morning_brief') {
      const { data: users } = await supabase.from('settings').select('user_id').eq('notif_morning_brief', true).not('user_id', 'is', null)
      for (const user of users || []) {
        if (await wasAlreadySentToday(user.user_id, 'morning_brief')) continue;

        const { count: tasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).eq('due_date', today).neq('status', 'done')
        const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', user.user_id).like('start_time', `${today}%`)

        if ((tasksCount && tasksCount > 0) || (eventsCount && eventsCount > 0)) {
          let msgParts = [];
          if (eventsCount && eventsCount > 0) msgParts.push(`${eventsCount} ${pluralize(eventsCount, 'wydarzenie', 'wydarzenia', 'wydarzeń')}`);
          if (tasksCount && tasksCount > 0) msgParts.push(`${tasksCount} ${pluralize(tasksCount, 'zadanie', 'zadania', 'zadań')}`);
          await sendPushAndLog(user.user_id, 'Dzień dobry!', `Masz dziś ${msgParts.join(' i ')}.`, '/')
        }
      }
    }

    else if (type === 'upcoming_task') {
      const { data: optInUsers } = await supabase.from('settings').select('user_id').eq('notif_tasks', true)
      const allowedIds = (optInUsers || []).map(u => u.user_id)

      if (allowedIds.length > 0) {
        const { data: sentNotifs } = await supabase.from('notifications')
          .select('user_id, data')
          .eq('type', 'upcoming_task')
          .gte('created_at', startOfDayUTC);

        const isSent = (userId: string, subType: string, taskId: string) => {
          return sentNotifs?.some(n =>
            n.user_id === userId &&
            n.data?.sub_type === subType &&
            n.data?.task_id.toString().split(',').includes(taskId.toString())
          );
        };

        const groupTasksByUser = (tasks: readonly NotifiableTask[]): Map<string, NotifiableTask[]> => {
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
        };

        const currentHourStartStr = `${today} ${plNow.hour}:00:00`;
        const currentHourEndStr = `${today} ${plNow.hour}:59:59`;

        const { data: tasksNow } = await supabase.from('tasks')
          .select('*')
          .in('user_id', allowedIds)
          .neq('status', 'done')
          .not('scheduled_time', 'is', null)
          .gte('scheduled_time', currentHourStartStr)
          .lte('scheduled_time', currentHourEndStr);

        const tasksNowByUser = groupTasksByUser(tasksNow || []);
        for (const [userId, tasks] of Object.entries(tasksNowByUser)) {
          const unsentTasks = (tasks as any[]).filter(t => !isSent(userId, 'exact_time', t.id));

          if (unsentTasks.length === 1) {
            const t = unsentTasks[0];
            await sendPushAndLog(userId, `${t.title}`, 'Rozpocznij zadanie.', '/tasks', { task_id: t.id.toString(), sub_type: 'exact_time' });
          } else if (unsentTasks.length > 1) {
            const titles = unsentTasks.map(t => t.title).join(', ');
            const taskIds = unsentTasks.map(t => t.id).join(',');
            await sendPushAndLog(
              userId,
              `${unsentTasks.length} ${pluralize(unsentTasks.length, 'zadanie', 'zadania', 'zadań')}`,
              `Rozpocznij: ${titles.substring(0, 50)}${titles.length > 50 ? '...' : ''}`,
              '/tasks',
              { task_id: taskIds, sub_type: 'exact_time' }
            );
          }
        }

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

        const tasksLateByUser = groupTasksByUser(tasksLate || []);
        for (const [userId, tasks] of Object.entries(tasksLateByUser)) {
          const unsentTasks = (tasks as any[]).filter(t => !isSent(userId, 'late_1h', t.id));

          if (unsentTasks.length === 1) {
            const t = unsentTasks[0];
            await sendPushAndLog(userId, 'PILNE', `Zadanie ${t.title} nie jest zrobione.`, '/tasks', { task_id: t.id.toString(), sub_type: 'late_1h' });
          } else if (unsentTasks.length > 1) {
            const titles = unsentTasks.map(t => t.title).join(', ');
            const taskIds = unsentTasks.map(t => t.id).join(',');
            await sendPushAndLog(
              userId,
              'PILNE',
              `Zadania (${unsentTasks.length}) nie są zrobione: ${titles.substring(0, 50)}${titles.length > 50 ? '...' : ''}`,
              '/tasks',
              { task_id: taskIds, sub_type: 'late_1h' }
            );
          }
        }

        if (currentHour === 14) {
          const { data: tasksNoTime } = await supabase.from('tasks')
            .select('*')
            .in('user_id', allowedIds)
            .neq('status', 'done')
            .is('scheduled_time', null)
            .eq('due_date', today);

          const tasksNoTimeByUser = groupTasksByUser(tasksNoTime || []);
          for (const [userId, tasks] of Object.entries(tasksNoTimeByUser)) {
            const unsentTasks = (tasks as any[]).filter(t => !isSent(userId, 'no_time_14', t.id));

            if (unsentTasks.length === 1) {
              const t = unsentTasks[0];
              await sendPushAndLog(userId, 'PILNE', `Zadanie ${t.title} nie jest zrobione.`, '/', { task_id: t.id.toString(), sub_type: 'no_time_14' });
            } else if (unsentTasks.length > 1) {
              const titles = unsentTasks.map(t => t.title).join(', ');
              const taskIds = unsentTasks.map(t => t.id).join(',');
              await sendPushAndLog(
                userId,
                'PILNE',
                `Masz ${unsentTasks.length} nieukończone ${pluralize(unsentTasks.length, 'zadanie', 'zadania', 'zadań')}: ${titles.substring(0, 50)}${titles.length > 50 ? '...' : ''}`,
                '/',
                { task_id: taskIds, sub_type: 'no_time_14' }
              );
            }
          }
        }
      }
    }

    else if (type === 'upcoming_event') {
      const { data: optInUsers } = await supabase.from('settings').select('user_id').eq('notif_events', true)
      const allowedIds = new Set((optInUsers || []).map(u => u.user_id))

      if (allowedIds.size > 0) {
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
          const evTime = ev.start_time;
          const participants = new Set<string>()

          if (ev.user_id && allowedIds.has(ev.user_id)) participants.add(ev.user_id)
          if (ev.shared_with_id && allowedIds.has(ev.shared_with_id)) participants.add(ev.shared_with_id)

          const { data: existing } = await supabase.from('notifications')
            .select('data').eq('type', 'upcoming_event').contains('data', { event_id: ev.id })

          const sentReminders = new Set((existing || []).map(n => n.data?.reminder_type).filter(Boolean))

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
      }
    }

    else if (type === 'hydration') {
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

    else if (type === 'daily_habits') {
      const { data: usersSettings } = await supabase.from('settings').select('*').eq('notif_habits', true)
      for (const s of usersSettings || []) {
        if (await wasAlreadySentToday(s.user_id, 'daily_habits')) continue;

        const { data: habit } = await supabase.from('daily_habits').select('*').eq('date', today).eq('user_id', s.user_id).maybeSingle()
        let incomplete = []
        if (s.habit_pills && (!habit?.pills)) incomplete.push('Leki')
        if (s.habit_bath && (!habit?.bath)) incomplete.push('Higiena')
        if (s.habit_workout && (!habit?.workout)) incomplete.push('Trening')
        if (s.habit_friends && (!habit?.friends)) incomplete.push('Relacje')
        if (s.habit_work && (!habit?.work)) incomplete.push('Praca')
        if (s.habit_housework && (!habit?.housework)) incomplete.push('Dom')
        if (s.habit_plants && (!habit?.plants)) incomplete.push('Digital')
        if (s.habit_duolingo && (!habit?.duolingo)) incomplete.push('Języki')

        if (incomplete.length > 0) {
          const actStr = pluralize(incomplete.length, 'aktywność', 'aktywności', 'aktywności');
          const msg = `Masz ${incomplete.length} ${actStr} do zrobienia: ${incomplete.slice(0, 3).join(', ')}${incomplete.length > 3 ? '...' : ''}`
          await sendPushAndLog(s.user_id, 'Nawyki', msg, '/habits', { incomplete })
        }
      }
    }

    else if (type === 'day_schema') {
      const { data: daySchemas } = await supabase
        .from('day_schemas')
        .select('user_id, entries, days, name');

      const currentTime = `${plNow.hour}:${plNow.timeStr.split(':')[1]}`;
      const currentMinutes = timeToMinutes(currentTime);
      const currentDayObj = new Date(realNow.getTime() + (currentHour * 3600000));
      const currentDayIndex = String((currentDayObj.getDay() + 6) % 7);

      for (const schema of daySchemas || []) {
        let activeDays: string[] = [];
        try {
          activeDays = typeof schema.days === 'string' ? JSON.parse(schema.days) : (schema.days || []);
        } catch { continue; }

        if (!activeDays.includes(currentDayIndex)) {
          continue;
        }

        let entries: any[] = [];
        try {
          entries = typeof schema.entries === 'string' ? JSON.parse(schema.entries) : (schema.entries || []);
        } catch { continue; }

        const itemsToNotify = entries.filter((item: any) =>
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
    }

    else if (type === 'evening_audit') {
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
    else if (type === 'people') {
      const { data: people } = await supabase.from('people').select('*');
      const { data: userSettings } = await supabase.from('settings').select('user_id, notif_birthdays, notif_contact');

      if (people && people.length > 0) {
        const getMMDD = (d: Date) => getPLTimeStrings(d).dateStr.substring(5, 10);
        const todayMMDD = getMMDD(realNow);
        const plus1MMDD = getMMDD(new Date(realNow.getTime() + 86400000));
        const plus7MMDD = getMMDD(new Date(realNow.getTime() + 7 * 86400000));
        const currentYearStr = plNow.dateStr.substring(0, 4);

        const sevenDaysAgoUTC = new Date(realNow.getTime() - 7 * 86400000).toISOString();
        const { data: sentNotifs } = await supabase.from('notifications')
          .select('user_id, data, created_at')
          .eq('type', 'people')
          .gte('created_at', new Date(realNow.getFullYear(), 0, 1).toISOString());

        const isSent = (userId: string, subType: string, personId: string) => {
          return sentNotifs?.some(n =>
            n.user_id === userId &&
            n.data?.sub_type === subType &&
            n.data?.person_id === personId
          );
        };

        const isContactRemindedRecently = (userId: string, personId: string) => {
           return sentNotifs?.some(n =>
             n.user_id === userId &&
             n.data?.sub_type === 'contact_reminder' &&
             n.data?.person_id === personId &&
             new Date(n.created_at) >= new Date(sevenDaysAgoUTC)
           );
        }

        for (const p of people) {
          const userPref = userSettings?.find(s => s.user_id === p.user_id);

          if (p.priority >= 0 && p.priority <= 2 && userPref?.notif_birthdays !== false) {

            if (p.birthday && p.birthday.length >= 10) {
              const bMMDD = p.birthday.substring(5, 10);
              let bType = '', bMsg = '';

              if (bMMDD === todayMMDD) { bType = 'bday_0'; bMsg = `Dzisiaj są urodziny: ${p.first_name} ${p.last_name}! đźŽ‰`; }
              else if (bMMDD === plus1MMDD) { bType = 'bday_1'; bMsg = `Jutro są urodziny: ${p.first_name} ${p.last_name}.`; }
              else if (bMMDD === plus7MMDD) { bType = 'bday_7'; bMsg = `Za 7 dni urodziny obchodzi: ${p.first_name} ${p.last_name}.`; }

              if (bType) {
                const subType = `${bType}_${currentYearStr}`;
                if (!isSent(p.user_id, subType, p.id)) {
                  await sendPushAndLog(p.user_id, 'Urodziny đźŽ‚', bMsg, `/people`, { person_id: p.id, sub_type: subType });
                }
              }
            }

            if (p.nameday && p.nameday.length >= 10) {
              const nMMDD = p.nameday.substring(5, 10);
              let nType = '', nMsg = '';

              if (nMMDD === todayMMDD) { nType = 'nday_0'; nMsg = `Dzisiaj są imieniny: ${p.first_name} ${p.last_name}! đź’`; }
              else if (nMMDD === plus1MMDD) { nType = 'nday_1'; nMsg = `Jutro są imieniny: ${p.first_name} ${p.last_name}.`; }
              else if (nMMDD === plus7MMDD) { nType = 'nday_7'; nMsg = `Za 7 dni imieniny obchodzi: ${p.first_name} ${p.last_name}.`; }

              if (nType) {
                const subType = `${nType}_${currentYearStr}`;
                if (!isSent(p.user_id, subType, p.id)) {
                  await sendPushAndLog(p.user_id, 'Imieniny đź’', nMsg, `/people`, { person_id: p.id, sub_type: subType });
                }
              }
            }
          }

          if (p.priority >= 1 && p.priority <= 4 && userPref?.notif_contact !== false) {
             const lastContact = p.last_contact_date ? new Date(p.last_contact_date) : (p.created_at ? new Date(p.created_at) : null);

             if (lastContact) {
               const diffTime = Math.abs(realNow.getTime() - lastContact.getTime());
               const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

               let shouldContact = false;
               if (p.priority === 1 && diffDays >= 14) shouldContact = true;
               else if (p.priority === 2 && diffDays >= 30) shouldContact = true;
               else if (p.priority === 3 && diffDays >= 60) shouldContact = true;
               else if (p.priority === 4 && diffDays >= 365) shouldContact = true;

               if (shouldContact && !isContactRemindedRecently(p.user_id, p.id)) {
                  await sendPushAndLog(
                    p.user_id,
                    'Przypomnienie o kontakcie đź“ž',
                    `Czas odezwać się do: ${p.first_name} ${p.last_name}.`,
                    `/people`,
                    { person_id: p.id, sub_type: 'contact_reminder' }
                  );

                  const { error: taskError } = await supabase.from('tasks').insert({
                    user_id: p.user_id,
                    title: `Kontakt: ${p.first_name} ${p.last_name}`,
                    description: `Ostatnio: ${p.last_contact_date}`,
                    due_date: plNow.dateStr,
                    category: 'personal',
                    priority: 3,
                    status: 'pending'
                  });

                  if (taskError) {
                    console.error(`Błąd przy dodawaniu zadania dla ${p.id}:`, taskError);
                  }
               }
             }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, type, sentCount: processedCount }), { headers: jsonHeaders })

  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Critical error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: jsonHeaders });
  }
})
