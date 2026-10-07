# API Dzisiaj.Fun

Endpointy Next.js (`pages/api`) i Edge Functions Supabase. Odpowiedzi błędów mają postać
`{ "error": "<komunikat po polsku>" }`; wyjątkiem są kody techniczne rozpoznawane przez
frontend (`token_refresh_failed`, `LOCATION_REQUIRED`).

## Uwierzytelnianie

| Rodzaj | Jak przekazać | Gdzie |
|---|---|---|
| sesja | ciasteczka Supabase (przeglądarka) | większość endpointów |
| Bearer JWT | `Authorization: Bearer <access_token z supabase.auth.getSession()>` | kalendarze, Edge Functions |
| cron (API) | `Authorization: Bearer <CRON_SECRET>` (lub `x-cron-secret`) | zadania cykliczne w `pages/api` |
| cron (Edge) | `x-cron-secret: <CRON_SECRET>` | `process-notifications`, `process-reminders`, `send-push` |
| token Skrótów Siri | `Authorization: Bearer dzs_…` | `/api/worklogs/auto` |
| publiczny | – | strony publiczne, ankiety, wizytówki |

„limit” = ograniczenie liczby żądań z jednego adresu IP (`lib/server/rateLimit.ts`, w pamięci instancji).

## Endpointy Next.js

| Metoda | Ścieżka | Dostęp | Opis |
|---|---|---|---|
| GET | `/api/auth/callback` | publiczny | Powrót z logowania Supabase; bezpieczne przekierowanie na `next`. |
| POST | `/api/auth/delete` | sesja | Usunięcie konta: dane, pliki w Storage, konto logowania. Wymaga potwierdzenia w treści. |
| GET | `/api/calendar/sync-calendars` | cron | Import wydarzeń ze wszystkich podłączonych kalendarzy (Google, Outlook). |
| GET/POST/DELETE | `/api/google-calendar?action=…` | Bearer JWT | `auth-url`, `list-calendars`, `import`, `export`, `disconnect`. |
| GET | `/api/google-calendar/callback` | sesja + state | Callback OAuth Google (nonce w ciasteczku). |
| POST | `/api/outlook-calendar?action=…` | sesja / Bearer JWT | Jak Google: `auth-url`, `list-calendars`, `import`, `export`, `disconnect`. |
| GET | `/api/outlook-calendar/callback` | sesja + state | Callback OAuth Microsoft. |
| POST | `/api/meeting-polls/[id]/finalize` | sesja (organizator) | Zatwierdza terminy, tworzy wydarzenia u organizatora i zalogowanych uczestników. Jednorazowe (409 przy ponowieniu). |
| GET | `/api/meeting-polls/close-expired` | cron | Zamyka ankiety po terminie `closes_at`. |
| GET | `/api/meeting-polls/public/[token]` | publiczny | Dane ankiety dla uczestnika. |
| GET/POST | `/api/meeting-polls/public/[token]/respond` | publiczny (sesja opcjonalna), limit | Odpowiedź uczestnika; edycja tokenem edycji. |
| POST | `/api/slack?action=…` | sesja | Połączenie, listy, kolumny, przypisanie zadania do listy. |
| GET | `/api/slack/callback` | sesja + state | Callback OAuth Slacka. |
| GET / POST | `/api/slack/sync` | cron (GET) / sesja (POST) | Synchronizacja z Slack Lists – wszyscy użytkownicy (cron) albo bieżący. |
| GET | `/api/tmdb` | sesja | Proxy do TMDB z listą dozwolonych ścieżek. |
| GET | `/api/transport/locality` | sesja, limit | Miejscowość dla współrzędnych. |
| POST | `/api/transport/parse-ticket` | sesja | Odczyt biletu PKP Intercity z PDF (multipart). |
| GET | `/api/transport/station-board` | sesja | Tablica odjazdów stacji. |
| GET | `/api/transport/train-status` | sesja | Bieżący status pociągu (opóźnienia). |
| GET | `/api/vcard?slug=…` | publiczny | Plik .vcf publicznej wizytówki. |
| POST | `/api/worklogs/auto` | token Skrótów Siri, limit | `{"action":"start"}` / `{"action":"end"}` – wpis czasu pracy. |
| POST / DELETE | `/api/worklogs/token` | sesja | Wygenerowanie (zwracany raz) / unieważnienie tokenu Skrótów Siri. |

### Przykład: Skrót Siri

```bash
curl -X POST https://dzisiaj.fun/api/worklogs/auto \
  -H "Authorization: Bearer dzs_…" -H "Content-Type: application/json" \
  -d '{"action":"start"}'
# 200 {"success":true,"message":"Rozpoczęto pracę", …}
# 400 Masz już rozpoczęty wpis czasu pracy. | 401 Brak autoryzacji. | 429 Zbyt wiele żądań.
```

### Przykład: wysłanie wydarzenia do kalendarza

```ts
await fetch("/api/google-calendar?action=export", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ connectedCalendarId, eventIds: [eventId] }),
});
// → { exported: 1, skipped: 0 }. Używaj lib/calendarExport.ts – sprawdza odpowiedź.
```

## Edge Functions (Supabase)

| Funkcja | Dostęp | Opis |
|---|---|---|
| `process-notifications` | cron (`x-cron-secret`) | Powiadomienia: poranne podsumowanie, wydarzenia, zadania, urodziny i imieniny. |
| `process-reminders` | cron | Zadania cykliczne – tworzenie kolejnych wystąpień. |
| `send-push` | cron albo JWT (tylko własne urządzenia) | Wysyłka Web Push (VAPID). |
| `send-love` | JWT | „Serduszko” do osoby z listy zaufanych – tylko przy wzajemności; limit 5 na 10 minut. |
| `log-error` | JWT | Zapis błędu klienta w tabeli `errors`. |
| `transport-departures` | JWT | Odjazdy z przystanków komunikacji miejskiej. |

## Funkcje bazy wywoływane przez klienta (RPC)

| Funkcja | Dostęp | Opis |
|---|---|---|
| `get_user_id_by_email`, `get_email_by_user_id`, `get_emails_by_ids` | `authenticated` | Rozpoznawanie osób przy udostępnianiu. |
| `find_user_id_by_email` | `authenticated` | Jak wyżej (używane przez `send-love`). |
| `leave_shared_shopping_list(p_list_id)` | `authenticated` | Wypisanie się odbiorcy z udostępnionej listy; zwraca `true`, gdy się udało. |
