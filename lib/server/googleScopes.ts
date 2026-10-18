// lib/server/googleScopes.ts

/**
 * Minimalny zestaw uprawnień Google. Wcześniej aplikacja prosiła o 8 zakresów,
 * w tym nowe, bardzo szczegółowe (calendar.events.owned, calendar.calendars…),
 * z których część nie była zgłoszona na ekranie zgody. Duża liczba zakresów
 * kalendarza dla niezweryfikowanej aplikacji zwiększa szansę, że Google lub
 * administrator Workspace zablokuje logowanie („Ta aplikacja jest zablokowana”).
 *
 * - calendar.events – odczyt i zapis wydarzeń (import, eksport, synchronizacja),
 * - calendar.calendarlist.readonly – lista kalendarzy konta (users/me/calendarList),
 * - userinfo.email – adres konta do opisu połączenia.
 */
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
