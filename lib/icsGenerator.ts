 import ICAL from "ical.js";
 import { Event } from "../types";
 import { format } from "date-fns";
 import { parseEventDate } from "./dateUtils";
 
 export const generateSingleEventICS = (ev: Event) => {

    function escapeICalText(s?: string) {
        if (!s) return "";
        return s
            .replace(/\\/g, "\\\\")
            .replace(/;/g, "\\;")
            .replace(/,/g, "\\,")
            .replace(/\r\n/g, "\\n")
            .replace(/\n/g, "\\n");
    }

    try {
      const vcalendar = new ICAL.Component(["vcalendar", [], []]);
      vcalendar.updatePropertyWithValue("prodid", "-//Dzisiajv3//PL");
      vcalendar.updatePropertyWithValue("version", "2.0");
      vcalendar.updatePropertyWithValue("calscale", "GREGORIAN");
      vcalendar.updatePropertyWithValue("method", "PUBLISH");

      const vevent = new ICAL.Component("vevent");
      const uid = ev.id ? ev.id.replace(/\s+/g, "_") : `evt-${Date.now()}`;

      const dtStart = parseEventDate(ev.start_time);
      const dtEnd = parseEventDate(ev.end_time);

      const icalStart = ICAL.Time.fromJSDate(dtStart, false);
      const icalEnd = ICAL.Time.fromJSDate(dtEnd, false);
      const icalStamp = ICAL.Time.fromJSDate(new Date(), false);

      vevent.addPropertyWithValue("uid", uid);
      vevent.addPropertyWithValue("dtstamp", icalStamp);
      vevent.addPropertyWithValue("dtstart", icalStart);
      vevent.addPropertyWithValue("dtend", icalEnd);

      const propStart = vevent.getFirstProperty("dtstart");
      const propEnd = vevent.getFirstProperty("dtend");
      if (propStart) propStart.setParameter("VALUE", "DATE-TIME");
      if (propEnd) propEnd.setParameter("VALUE", "DATE-TIME");

      if (ev.title)
        vevent.addPropertyWithValue("summary", escapeICalText(ev.title));
      if (ev.description)
        vevent.addPropertyWithValue(
          "description",
          escapeICalText(ev.description)
        );
      if (ev.place)
        vevent.addPropertyWithValue("location", escapeICalText(ev.place));
      if (ev.user_id)
        vevent.addPropertyWithValue("organizer", `MAILTO:${ev.user_id}`);

      vcalendar.addSubcomponent(vevent);

      const icsString = vcalendar.toString();
      const blob = new Blob([icsString], {
        type: "text/calendar;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const startDate = parseEventDate(ev.start_time);
      const datePart = format(startDate, "yyyy-MM-dd");
      a.download = `${datePart}_${uid}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      throw new Error("Nie udało się wygenerować pliku .ics dla tego wydarzenia.");
    }
  };
