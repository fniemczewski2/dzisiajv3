// lib/travelTickets.ts
//
// Przypomnienie o zakupie biletów przed podróżą: dla wydarzenia z kategorią
// podróżną tworzymy zadanie „Kup bilety: …” na 30 dni przed wyjazdem
// (PKP Intercity otwiera sprzedaż zwykle ok. 30 dni wcześniej) z pushem o 9:00.

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import { replacePendingReminders, toLocalInput } from "./taskReminders";

export const TICKET_REMINDER_DAYS_BEFORE = 30;

const TRAVEL_WORDS = ["podróż", "podroz", "wyjazd", "wyjazdy", "travel", "delegacja"];
export function isTravelCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  const c = category.toLocaleLowerCase("pl");
  return TRAVEL_WORDS.some((w) => c.includes(w));
}

export function ticketTaskDay(eventStartDay: string, today: Date = new Date()): string {
  const target = addDays(parseISO(eventStartDay), -TICKET_REMINDER_DAYS_BEFORE);
  return format(isBefore(target, startOfDay(today)) ? today : target, "yyyy-MM-dd");
}

export function ticketReminderTime(taskDay: string, now: Date = new Date()): string {
  const nine = new Date(`${taskDay}T09:00:00`);
  return toLocalInput(nine > now ? nine : new Date(now.getTime() + 3_600_000));
}

export async function createTicketReminderTask(
  supabase: SupabaseClient,
  userId: string,
  event: { title: string; startDay: string; category: string }
): Promise<{ error: string | null; dueDate?: string }> {
  const dueDate = ticketTaskDay(event.startDay);
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: `Kup bilety: ${event.title}`.slice(0, 200),
      description: `Wyjazd ${event.startDay.split("-").reverse().join(".")}. Sprzedaż biletów kolejowych zwykle rusza ok. 30 dni przed podróżą.`,
      category: event.category,
      priority: 2,
      due_date: dueDate,
      status: "pending",
      user_id: userId,
      for_user_id: userId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Nie udało się utworzyć zadania o biletach." };

  const reminder = await replacePendingReminders(supabase, userId, (data as { id: string | number }).id, [
    ticketReminderTime(dueDate),
  ]);
  return { error: reminder.error, dueDate };
}
