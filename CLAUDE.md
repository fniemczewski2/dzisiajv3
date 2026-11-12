# CLAUDE.md – indeks repozytorium Dzisiaj.Fun

Cel: wskazać plik bez przeszukiwania całego repozytorium. Szczegóły plików: [docs/CODEMAP.md](docs/CODEMAP.md)
(generowany, `npm run codemap`) – przeszukuj go `grep`em po nazwie funkcji, tabeli lub słowie z opisu, zamiast
czytać całość. Architektura i bezpieczeństwo: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), endpointy:
[docs/API.md](docs/API.md), operacje: [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Komendy

- `npm run typecheck` · `npm run lint` (oxlint) · `npm run format:check` (prettier) · `npm run knip` · `npm test` (vitest)
- `npm run check` – wszystko powyżej (+ aktualność CODEMAP); CI: `.github/workflows/ci.yml` (+ build, Deno dla Edge Functions)
- `npm run codemap` – regeneracja `docs/CODEMAP.md` po dodaniu, usunięciu lub zmianie nagłówka pliku

## Stos

- Next.js (Pages Router) na Vercelu, React 19, Tailwind 4, TanStack Query (+ zapis w IndexedDB), dnd-kit, date-fns
- Supabase: Postgres + RLS, Auth, Storage, Realtime, Edge Functions (Deno) w `supabase/functions`
- PWA: `public/sw.js`, kolejka offline `lib/offlineQueue.ts`

## Katalogi

| Ścieżka               | Zawartość                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/`              | strony (Pages Router); `pages/api/**` – endpointy (klucz `service_role`, własna kontrola właściciela)                                                                                                     |
| `components/<moduł>/` | UI modułów; `components/ui/` – wspólne kontrolki; `components/dashboard/` – plan dnia                                                                                                                     |
| `hooks/db/use*.ts`    | dostęp do tabel z klienta (zapytania + optymistyczne zmiany); `hooks/*.ts` – logika UI                                                                                                                    |
| `lib/*.ts`            | czysta logika (daty, rekurencja, parsery, eksport); `lib/server/` – tylko serwer (OAuth, szyfrowanie tokenów, rate limit, Slack sync); `lib/mail/`, `lib/obsidian/`, `lib/health/`, `lib/notes/` – moduły |
| `providers/`          | `AuthProvider` (`useAuth`: `supabase`, `user`), `ToastProvider` (`useToast`), `SettingsProvider`, `QueryProvider`                                                                                         |
| `config/`             | stałe: `env.ts` (jedyne miejsce odczytu env), `limits.ts`, `timing.ts`, `server.ts`, `storage.ts`, `userData.ts` (rejestr tabel do eksportu i usunięcia konta), `modules.ts` (menu)                       |
| `types/`              | typy domenowe (`tasks`, `events`, `schemas`, `toasts`…)                                                                                                                                                   |
| `supabase/functions/` | Edge Functions; `_shared/` importowane w Next jako `@/shared/*`                                                                                                                                           |
| `supabase/sql/`       | datowane skrypty SQL (migracje nie są wersjonowane – `supabase/README.md`); `introspect_schema.sql` – audyt schematu                                                                                      |
| `__tests__/`          | testy vitest (jsdom), ścieżka lustrzana do źródła: `__tests__/hooks/useX.test.ts` ↔ `hooks/useX.ts`                                                                                                       |
| `docs/`               | dokumentacja, DPIA, audyt a11y                                                                                                                                                                            |

## Konwencje (sprawdzone w kodzie)

- Pierwsza linia pliku: `// ścieżka/pliku.ts`, dalej opis w komentarzu `//` po polsku – z niego powstaje CODEMAP.
- Aliasy: `@/*` → korzeń repo, `@/shared/*` → `supabase/functions/_shared/*`.
- Dane: `useQueryState` (`hooks/useQueryState.ts`) + `setData` do zmian optymistycznych, rollback do poprzedniego stanu w `catch`; zapisy przez `useRetry()`.
- Najnowsza wartość w callbacku: `useLatestRef()` (`hooks/useLatestRef.ts`), nie `ref.current = x` w trakcie renderu (oxlint/React Compiler).
- Edycje z planu dnia przekazują `{ silent: true }` – toast sukcesu wyświetla wywołujący.
- Toasty: `toast.success/error/info(msg, { action, durationMs })`, `toast.confirm(msg, { confirmLabel, cancelLabel })` → `Promise<boolean>` (domyślnie „Usuń”, przycisk w stylu danger), `toast.batch`, `toast.loading/dismiss`.
- „Cofnij”: akcja w toaście, okno `UNDO_WINDOW_MS` (`config/timing.ts`); wzorzec: `deleteTask` w `hooks/db/useTasks.ts`.
- Czas: `dateToTimestamp()` zapisuje czas lokalny z sufiksem `+00` (`…T10:00:00+00`). Parsować przez `parseEventDate()` (`lib/dateUtils.ts`), nie `new Date()` – `new Date("…+00")` daje `Invalid Date`.
- Wydarzenia: instancje cykliczne mają id `${id}_${yyyy-MM-dd}` (`lib/eventUtils.ts`), wirtualne urodziny/imieniny – `bday_*`/`nday_*` (nieedytowalne).
- Bezpieczeństwo: każda tabela w `public` ma RLS; endpoint z `service_role` musi sprawdzać właściciela zasobu i mieć test „cudze id → 404”.

## Ścieżki często zmieniane

- Plan dnia: `components/dashboard/DayView.tsx` → `hooks/usePlanByHour.ts` (mapa godzin) → `DailyPlan.tsx` / `DraggablePlanItem.tsx` / `DroppableHourSlot.tsx`; przeciąganie: `hooks/useDashboardDnd.ts`; rutyny: `hooks/db/useDailyOverrides.ts` (tabela `daily_overrides`), schematy dnia: `hooks/db/useDaySchemas.ts`, `lib/daySchemas.ts`
- Zadania: `hooks/db/useTasks.ts`, `components/tasks/`, rekurencja `lib/taskRecurrence.ts`, `lib/taskOccurrences.ts`
- Wydarzenia/kalendarz: `hooks/db/useEvents.ts`, `components/calendar/`, sync zewnętrzny `lib/calendarExport.ts`, `pages/api/calendar/sync-calendars.ts`, `pages/api/{google,outlook}-calendar/`
- Poczta: `pages/api/mail/**`, `lib/mail/`, `lib/server/mail*.ts`, `hooks/useMail*.ts`
- Powiadomienia/przypomnienia: `supabase/functions/process-{notifications,reminders}`, `send-push`, `notify-shared`
