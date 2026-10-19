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

**Skrypty w repozytorium – kolejność uruchomienia** (każdy można powtórzyć bez szkody):

| Skrypt                                           | Co robi                                                                                                                           | Uwagi                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `supabase/sql/2026-10-17_errors_retention.sql`   | pg_cron: usuwanie logów błędów po 30 dniach                                                                                       | wymaga rozszerzenia `pg_cron`                                                                                         |
| `supabase/sql/2026-10-18_audit_hardening.sql`    | indeksy, uprawnienia `anon`, `NOT NULL` na `user_id`, unikalne subskrypcje push, kolumna `mood_consent_at`, bucket `user-exports` | tabele z wierszami bez właściciela są wypisane w NOTICE i pominięte – przypisz lub usuń te wiersze i uruchom ponownie |
| `supabase/sql/2026-10-18_drop_legacy_tables.sql` | usuwa nieużywane `bills`, `places`, `google_calendar_tokens`                                                                      | **nieodwracalne** – najpierw kopia (`pg_dump`, instrukcja w pliku)                                                    |

**Wersjonowanie schematu (zalecane):** `supabase link` → `supabase db pull` zapisze bieżący schemat do
`supabase/migrations/`. Po usunięciu wpisu `supabase/migrations` z `.gitignore` CI zacznie uruchamiać
test uprawnień `supabase/tests/rls_enabled.test.sql` (pgTAP).

**Wycofanie:** skrypt odwrotny przygotowany przed wdrożeniem; zmiany niszczące dane (usuwanie kolumn) rób
dopiero po wdrożeniu kodu, który ich nie używa.

## Zadania cykliczne (cron)

Harmonogram wywołań HTTP działa w **[cron-job.org](https://cron-job.org)** (konto właściciela projektu).
W bazie działa dodatkowo `pg_cron` z zadaniem `purge-old-error-logs` (03:15 UTC, usuwa wpisy `errors`
starsze niż 30 dni) – skrypt `supabase/sql/2026-10-17_errors_retention.sql`.

### Konfiguracja zadania w cron-job.org

Dla każdego wiersza z tabeli poniżej: **Dashboard → Create cronjob**, potem:

1. **Common → Title**: nazwa z kolumny „Zadanie”.
2. **Common → URL**: adres z kolumny „Adres”. `<projekt>` = identyfikator projektu Supabase
   (z `NEXT_PUBLIC_SUPABASE_URL`, np. `abcdefgh` dla `https://abcdefgh.supabase.co`).
3. **Common → Execution schedule**: „Custom” i wyrażenie z kolumny „Harmonogram”.
4. **Advanced → Time zone**: `Europe/Warsaw` – godziny w tabeli są czasem polskim.
5. **Advanced → Request method**: `GET`.
6. **Advanced → Headers**: nagłówek z kolumny „Nagłówek”, wartość = `CRON_SECRET`
   (ten sam w Vercelu i w sekretach Edge Functions).
7. **Advanced → Timeout**: najwyższy dostępny w planie – synchronizacja kalendarzy i Slacka może trwać dłużej niż kilka sekund.
8. **Notifications**: włącz powiadomienie e-mail o niepowodzeniu (np. po 2 kolejnych błędach).
9. **Save**, potem **Test run** – oczekiwany status `200`.

### Zadania

| Zadanie                          | Adres                                                                                 | Nagłówek                              | Harmonogram (czas polski) |
| -------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------- |
| Synchronizacja kalendarzy        | `https://dzisiaj.fun/api/calendar/sync-calendars`                                     | `Authorization: Bearer <CRON_SECRET>` | `*/15 * * * *`            |
| Zamykanie ankiet                 | `https://dzisiaj.fun/api/meeting-polls/close-expired`                                 | `Authorization: Bearer <CRON_SECRET>` | `5 * * * *`               |
| Synchronizacja Slacka            | `https://dzisiaj.fun/api/slack/sync`                                                  | `Authorization: Bearer <CRON_SECRET>` | `*/10 * * * *`            |
| Przypomnienia o zadaniach        | `https://<projekt>.supabase.co/functions/v1/process-notifications?type=task_reminder` | `x-cron-secret: <CRON_SECRET>`        | `* * * * *`               |
| Przypomnienia o wydarzeniach     | `…/process-notifications?type=upcoming_event`                                         | `x-cron-secret`                       | `* * * * *`               |
| Schemat dnia                     | `…/process-notifications?type=day_schema`                                             | `x-cron-secret`                       | `* * * * *`               |
| Zadania z godziną                | `…/process-notifications?type=upcoming_task`                                          | `x-cron-secret`                       | `*/15 * * * *`            |
| Nawodnienie                      | `…/process-notifications?type=hydration`                                              | `x-cron-secret`                       | `0 9-21 * * *`            |
| Poranne podsumowanie             | `…/process-notifications?type=morning_brief`                                          | `x-cron-secret`                       | `0 7 * * *`               |
| Rachunki                         | `…/process-notifications?type=bill_due`                                               | `x-cron-secret`                       | `0 8 * * *`               |
| Terminy pism                     | `…/process-notifications?type=letters_deadline`                                       | `x-cron-secret`                       | `0 9 * * *`               |
| Zamykanie ankiet – przypomnienie | `…/process-notifications?type=poll_closing`                                           | `x-cron-secret`                       | `0 10 * * *`              |
| Urodziny, imieniny, kontakt      | `…/process-notifications?type=people`                                                 | `x-cron-secret`                       | `0 9 * * *`               |
| Nawyki                           | `…/process-notifications?type=daily_habits`                                           | `x-cron-secret`                       | `0 20 * * *`              |
| Wieczorne podsumowanie           | `…/process-notifications?type=evening_audit`                                          | `x-cron-secret`                       | `0 21 * * *`              |
| Zadania cykliczne                | `https://<projekt>.supabase.co/functions/v1/process-reminders`                        | `x-cron-secret: <CRON_SECRET>`        | `0 3 * * *`               |

**Skąd te częstotliwości (z kodu):**

- `task_reminder`, `upcoming_event` – okno wysyłki to 15 minut, a przypomnienie „za 5 minut” ma okno
  5 minut; rzadsze wywołania gubią przypomnienia.
- `day_schema` – porównuje bieżącą godzinę i minutę z punktami schematu, więc wymaga wywołania co minutę.
- `upcoming_task` – zadania zaplanowane w bieżącej godzinie, z ochroną przed duplikatem w ciągu dnia.
- `hydration` – jedno przypomnienie na godzinę.
- `bill_due` – nic nie wysyła przed 8:00 (`BILL_PUSH_HOUR`).
- Typy dzienne (`morning_brief`, `daily_habits`, `evening_audit`, `letters_deadline`, `poll_closing`,
  `people`) mają ochronę przed ponowną wysyłką tego samego dnia, więc dodatkowe wywołanie nie zdubluje powiadomień.
- Parametru `type` nie pomijaj: bez niego funkcja wykonuje tylko typ domyślny `daily_habits`.

Funkcje `process-notifications` i `process-reminders` mają w `supabase/config.toml` wyłączone
`verify_jwt` – uwierzytelnia je wyłącznie nagłówek `x-cron-secret`. Bez niego odpowiadają `401`.

**Nie przenoś harmonogramu do `vercel.json`, dopóki zadania działają w cron-job.org** – każde wywołanie
wykonałoby się dwa razy.

**Sprawdzenie ręczne:**

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" https://dzisiaj.fun/api/calendar/sync-calendars
# 200 {"success":true,"imported":…,"removed":…,"failedAccounts":[]}

curl -i -H "x-cron-secret: $CRON_SECRET" "https://<projekt>.supabase.co/functions/v1/process-notifications?type=task_reminder"
# 200; bez nagłówka – 401
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

## Build produkcyjny i CSP

`npm run build` = `next build --webpack` + `scripts/check-inline-scripts.mjs`. Webpack wstawia w strony
tylko skrypt motywu (dopuszczony w CSP skrótem). Turbopack (`next dev`) wstawia skrypt startowy
zmieniający się z każdym buildem – w produkcji zostałby zablokowany. Jeśli kontrola po buildzie zgłosi
nowy skrypt: dodaj jego skrót do `script-src` albo przenieś kod do pliku w `public/`.

## Eksport danych użytkownika

Plik do 4 MB wraca w odpowiedzi. Większy trafia do prywatnego bucketu `user-exports`
(`<user_id>/dzisiaj_moje_dane_<data>.json`), a użytkownik dostaje link ważny 10 minut. Poprzedni plik
tej osoby jest usuwany przy kolejnym eksporcie, wszystkie – przy usunięciu konta.

## SonarQube / SonarCloud

1. Utwórz projekt w SonarCloud (organizacja `fniemczewski2`) albo na własnym serwerze SonarQube.
2. W repozytorium GitHub: sekret `SONAR_TOKEN`; dla własnego serwera zmienna `SONAR_HOST_URL`.
3. Sprawdź `sonar.projectKey` i `sonar.organization` w `sonar-project.properties`.
4. Analiza uruchamia się w CI po testach (raport pokrycia: `coverage/lcov.info`).
