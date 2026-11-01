// lib/icsGenerator.ts
//
// Eksport pojedynczego wydarzenia do pliku .ics.

import ICAL from "ical.js";
import { Event } from "@/types/events";
import { format } from "date-fns";
import { parseEventDate } from "./dateUtils";

/**
 * Treść pliku .ics dla jednego wydarzenia. Tekst przekazujemy do ical.js bez własnej ucieczki – biblioteka sama
 * zamienia przecinki, średniki, ukośniki i nowe linie (ręczna ucieczka dawała w kalendarzach „\,” i „\;”).
 * Bez pola ORGANIZER: aplikacja nie zna adresu e-mail organizatora, a identyfikator użytkownika nie może trafiać do pliku.
 */
export function buildSingleEventICS(ev: Event, now: Date = new Date()): string {
  const vcalendar = new ICAL.Component(["vcalendar", [], []]);
  vcalendar.updatePropertyWithValue("prodid", "-//Dzisiajv3//PL");
  vcalendar.updatePropertyWithValue("version", "2.0");
  vcalendar.updatePropertyWithValue("calscale", "GREGORIAN");
  vcalendar.updatePropertyWithValue("method", "PUBLISH");

  const vevent = new ICAL.Component("vevent");
  vevent.addPropertyWithValue("uid", eventUid(ev));
  vevent.addPropertyWithValue("dtstamp", ICAL.Time.fromJSDate(now, false));
  vevent.addPropertyWithValue("dtstart", ICAL.Time.fromJSDate(parseEventDate(ev.start_time), false));
  vevent.addPropertyWithValue("dtend", ICAL.Time.fromJSDate(parseEventDate(ev.end_time), false));
  vevent.getFirstProperty("dtstart")?.setParameter("VALUE", "DATE-TIME");
  vevent.getFirstProperty("dtend")?.setParameter("VALUE", "DATE-TIME");
  if (ev.title) vevent.addPropertyWithValue("summary", ev.title);
  if (ev.description) vevent.addPropertyWithValue("description", ev.description);
  if (ev.place) vevent.addPropertyWithValue("location", ev.place);

  vcalendar.addSubcomponent(vevent);
  return vcalendar.toString();
}

function eventUid(ev: Event): string {
  return ev.id ? ev.id.replaceAll(/\s+/g, "_") : `evt-${Date.now()}`;
}

export const generateSingleEventICS = (ev: Event) => {
  try {
    const blob = new Blob([buildSingleEventICS(ev)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${format(parseEventDate(ev.start_time), "yyyy-MM-dd")}_${eventUid(ev)}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    throw new Error("Nie udało się wygenerować pliku .ics.");
  }
};
