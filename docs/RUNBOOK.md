# Runbook Dzisiaj.Fun

Procedury operacyjne. Każda sekcja: kiedy jej użyć, co zrobić, jak sprawdzić, jak się wycofać.

## Wdrożenie aplikacji

**Kiedy:** każda zmiana w kodzie.

1. Lokalnie, przed wypchnięciem:
   ```bash
   npm run check   # tsc + oxlint + testy
   ```
   Podbij `version` w `package.json` – numer trafia do Ustawień → Informacje o wersji.
2. Push na gałąź główną → Vercel buduje i wdraża automatycznie.
3. **Sprawdzenie:** logowanie, dodanie zadania, otwarcie kalendarza; w Vercel → Logs brak błędów 5xx.
4. **Wycofanie:** Vercel → Deployments → poprzednie wdrożenie → _Promote to Production_.

Jeśli zmiana wymaga zmian w bazie, **najpierw baza, potem kod** (zob. niżej).

## Zmiany w bazie danych

**Kiedy:** nowa tabela, kolumna, polityka, funkcja.

Migracje nie są wersjonowane w repozytorium (od 1.38.7), a produkcja nie ma historii migracji.
Dlatego **nie używaj `supabase db push`**.

1. Napisz skrypt **idempotentny** (`create … if not exists`, `drop … if exists`, `create or replace`) w jednej transakcji (`begin; … commit;`).
2. Uruchom go na kopii schematu lub w projekcie testowym.
3. Produkcja: Dashboard → SQL Editor → Run.
4. **Sprawdzenie:** uruchom `supabase/introspect_schema.sql`. Sekcja `security_findings` powinna zawierać
   tylko pozycje świadomie zaakceptowane (publiczny odczyt `stops`, tabele obsługiwane wyłącznie przez `service_role`).
5. Zachowaj skrypt (np. w `supabase/sql/`), żeby dało się odtworzyć schemat.

**Wycofanie:** skrypt odwrotny przygotowany przed wdrożeniem; zmiany niszczące dane (usuwanie kolumn) rób
dopiero po wdrożeniu kodu, który ich nie używa.

## Zadania cykliczne (cron)

Harmonogram wywołań HTTP **nie jest zapisany w repozytorium** (brak `vercel.json`). Zapisz tutaj, gdzie jest skonfigurowany.
W bazie działa `pg_cron` z jednym zadaniem: `purge-old-error-logs` (03:15 UTC, usuwa wpisy `errors`
starsze niż 30 dni) – skrypt `supabase/sql/2026-10-17_errors_retention.sql`.

| Zadanie                   | Wywołanie                                                                                        | Sugerowana częstotliwość |
| ------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------ |
| Synchronizacja kalendarzy | `GET /api/calendar/sync-calendars` z `Authorization: Bearer <CRON_SECRET>` (lub `x-cron-secret`) | co 15–30 min             |
| Zamykanie ankiet          | `GET /api/meeting-polls/close-expired`                                                           | co godzinę               |
| Synchronizacja Slacka     | `GET /api/slack/sync`                                                                            | co 5–15 min              |
| Powiadomienia             | Edge `process-notifications` z `x-cron-secret`                                                   | co minutę                |
| Przypomnienia o zadaniach | Edge `process-notifications?type=task_reminder` z `x-cron-secret`                                | co minutę                |
| Zadania cykliczne         | Edge `process-reminders`                                                                         | raz na dobę              |

**Sprawdzenie ręczne:**

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" https://dzisiaj.fun/api/calendar/sync-calendars
# 200 {"success":true,"imported":…,"removed":…,"failedAccounts":[]}
```

## Awaria: kalendarze się nie synchronizują

1. Wywołaj cron ręcznie (wyżej) i sprawdź `failedAccounts`.
2. W tabeli `connected_calendars` kolumna `sync_error` dla tych kont:
   - `token_refresh_failed` → użytkownik musi ponownie połączyć konto (odwołał dostęp lub token wygasł);
   - błąd zapisu `events` → sprawdź, czy istnieje indeks `events_calendar_google_event_uidx`.
3. W wersji 1.38.11 import był całkowicie zepsuty (usunięte zapytania do Google i Outlooka) – upewnij się, że wdrożona jest wersja z naprawą.

## Awaria: Slack nie synchronizuje

1. `POST /api/slack/sync` jako użytkownik – odpowiedź zawiera komunikat z kodem Slacka.
2. `ratelimited` → poczekaj; synchronizacja sama ponawia po `Retry-After`.
3. `invalid_auth` / `token_revoked` → użytkownik musi ponownie połączyć Slacka.

## Rotacja sekretów

| Sekret                          | Skutek zmiany                                  | Procedura                                                                                   |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `CRON_SECRET`                   | Harmonogram przestaje działać do aktualizacji  | Zmień w Vercelu i Supabase (secrets), potem w harmonogramie                                 |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | **Zapisane tokeny przestają być czytelne**     | Nie zmieniaj bez skryptu re-szyfrującego; inaczej użytkownicy muszą ponownie połączyć konta |
| Klucze VAPID                    | Istniejące subskrypcje push przestają działać  | Użytkownicy muszą ponownie włączyć powiadomienia                                            |
| `SUPABASE_SECRET_KEY`           | API traci dostęp do bazy do czasu aktualizacji | Wygeneruj nowy w Supabase, podmień w Vercelu, wdroż ponownie                                |
| Tokeny Skrótów Siri             | –                                              | Użytkownik generuje nowy w Ustawieniach                                                     |

## Jednorazowe: szyfrowanie starych tokenów

```bash
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SECRET_KEY=… CALENDAR_TOKEN_ENCRYPTION_KEY=… \
  node scripts/encrypt-legacy-tokens.mjs          # podgląd
node scripts/encrypt-legacy-tokens.mjs --apply    # zapis
```

Następnie ustaw `REJECT_PLAINTEXT_TOKENS=1`, żeby niezaszyfrowane tokeny były odrzucane.

## Konfiguracja usług zewnętrznych

**Upstash Redis (limity zapytań).** Vercel → Marketplace → Upstash Redis → podłącz do projektu
(dodaje `KV_REST_API_URL` / `KV_REST_API_TOKEN`; kod czyta też `UPSTASH_REDIS_REST_URL` / `_TOKEN`).
Sprawdzenie: 31 szybkich żądań do `/api/vcard?slug=…` → ostatnie zwraca `429`, także przy żądaniach
trafiających w różne instancje. Bez Redisa limiter działa w pamięci instancji (fail-open przy awarii Redisa).

**Asymetryczne klucze JWT (Supabase → Settings → JWT Keys).** Włączone = `proxy.ts` weryfikuje sesję
lokalnie (`getClaims()`), bez zapytania do Auth przy każdej stronie. Bez nich `getClaims()` pyta serwer.

**Edge Functions – sekret `ALLOWED_ORIGIN`.** Produkcja: `https://dzisiaj.fun`; lokalnie
`http://localhost:3000`. Inny adres = przeglądarka zablokuje wywołania funkcji (CORS).

**pg_cron.** Dashboard → Database → Extensions → `pg_cron`, potem uruchom
`supabase/sql/2026-10-17_errors_retention.sql`. Sprawdzenie: `select * from cron.job_run_details order by start_time desc limit 5;`.

## Awaria: CSP blokuje zasób

**Objaw:** w konsoli przeglądarki „Refused to load … Content Security Policy”.

1. Tymczasowo: `CSP_REPORT_ONLY=1` w Vercel i ponowne wdrożenie (polityka tylko raportuje).
2. Dopisz domenę do właściwej dyrektywy w `next.config.mjs` (np. `connect-src` dla nowego API).
3. Usuń `CSP_REPORT_ONLY` i wdroż ponownie.
