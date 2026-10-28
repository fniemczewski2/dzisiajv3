# Dzisiaj.Fun - Personal Productivity & Life Management App

**Dzisiaj.Fun** ("Today.Fun") to polskojęzyczna aplikacja webowa (PWA) do zarządzania czasem, zadaniami i codziennym życiem - jedno miejsce na zadania, kalendarz, finanse, nawyki, kontakty i wiele więcej.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)
![Tests](https://img.shields.io/badge/tests-vitest-6E9F18)

**Live:** [https://dzisiaj.fun](https://dzisiaj.fun)

> Numer wersji pochodzi z `package.json` i jest wstrzykiwany podczas builda (razem ze skrótem commita i datą wdrożenia) – widać go w **Ustawieniach → Informacje o wersji**.

## Spis treści

- [Funkcje](#-funkcje)
- [Stack technologiczny](#️-stack-technologiczny)
- [Szybki start](#-szybki-start)
- [Zmienne środowiskowe](#-zmienne-środowiskowe)
- [Dostępne skrypty](#-dostępne-skrypty)
- [Testy automatyczne](#-testy-automatyczne)
- [Struktura projektu](#-struktura-projektu)
- [Baza danych](#-baza-danych)
- [PWA](#-pwa)
- [Bezpieczeństwo](#-bezpieczeństwo)
- [Contributing](#-contributing)

## ✨ Funkcje

Pełny, zawsze aktualny opis każdej funkcji znajduje się w [`config/features.ts`](./config/features.ts) (karty na stronie startowej) i w [`config/guideData.tsx`](./config/guideData.tsx) (przewodnik w aplikacji pod `/guide`). Poniżej skrót.

### 📋 Produktywność

- **Zadania** - priorytety, daty, filtry, przeciąganie (drag & drop) na oś czasu kokpitu
- **Pomodoro** - konfigurowalny timer pracy/przerwy z Wake Lock i dźwiękiem
- **Harmonogram dnia** - powtarzalne schematy dnia, które same pojawiają się w planie
- **Czas pracy** - ręczne logowanie godzin pracy + automatyzacja przez Siri Shortcuts (start/stop bez otwierania aplikacji)

### 🗓️ Organizacja

- **Kalendarz** - wydarzenia z Google Calendar i Outlooka (import co 15 min); nowe wydarzenia można dodać do kalendarza zewnętrznego, a edycja i usunięcie powiązanych zmieniają je także tam (bez wydarzeń powtarzalnych)
- **Terminy zespołowe** - ankiety terminu spotkania (siatka dostępności, publiczny link dla osób bez konta), finalizacja tworzy wydarzenia w kalendarzach uczestników
- **Notatki**, **Protokoły** (agenda, uczestnicy, zadania → eksport PDF), **przypomnienia o zadaniach** (push) i **zadania cykliczne**
- **Listy pakowania** - plecak, walizka podróżna, plecak bezpieczeństwa (ICE)
- **Osoby i relacje** - kontakty z priorytetem przypominania o kontakcie, QR/vCard, import/eksport CSV
- **Pisma** - rejestr pism urzędowych z automatyczną sygnaturą (nr.mm.rrrr.KOD) i pilnowaniem ustawowych terminów odpowiedzi

### 💰 Finanse

- **Rachunki** i **Budżet roczny** - kategoryzacja, import wyciągów CSV (mBank, PKO BP) z automatycznym rozpoznawaniem sprzedawców
- **Kalkulator rachunków** - sprawiedliwy podział kosztów wg dochodów (algorytm hybrydowy)
- **Listy zakupów** (współdzielone, zmiany na żywo przez Supabase Realtime) i **Przepisy** (filtrowanie po składnikach)

### 🏃 Styl życia

- **Nawyki** - do 8 własnych nawyków dziennie + tracker wody i nastroju
- **Postępy (streaks)** z kamieniami milowymi
- **Trening interwałowy** (HIIT/Tabata) z Wake Lock
- **Pogoda** - prognoza godzinowa/5-dniowa, autorski wskaźnik biometeorologiczny, jakość powietrza (Open-Meteo)
- **Transport miejski** - tablice odjazdów na żywo (GPS lub ulubione przystanki, odświeżanie co 30 s) + śledzenie pociągów PKP (status od 3 h przed odjazdem do 3 h po przyjeździe)

### 🎬 Rozrywka

- **Filmy i seriale** - wyszukiwanie filmów i seriali w TMDB, dostępność VOD w Polsce (Netflix, HBO Max, Disney+ i inne), liczba sezonów i status serialu, śledzenie postępu oglądania

### 🛠️ Narzędzia

- **Udostępnianie** - współdzielenie zadań/kalendarza/list z zaufanymi użytkownikami
- **Cyfrowa wizytówka** - wiele profili vCard z publicznym linkiem (`/v/twoj-link`), własnymi kolorami i danymi firmowymi
- **Ustawienia systemowe** - motyw, powiadomienia push, sortowanie, instalacja jako PWA
- **Kopia moich danych** - eksport wszystkich danych użytkownika do pliku JSON (bez haseł, tokenów OAuth i kluczy push)

## 🏗️ Stack technologiczny

| Warstwa          | Technologia                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Framework        | [Next.js 16](https://nextjs.org/) (Pages Router)                                                        |
| UI               | [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide](https://lucide.dev/) |
| Język            | TypeScript (strict)                                                                                     |
| Backend / DB     | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime)                                          |
| Dane w aplikacji | [TanStack Query](https://tanstack.com/query) – wspólna pamięć zapytań, odświeżanie cykliczne            |
| Drag & drop      | `@dnd-kit`                                                                                              |
| Daty             | `date-fns`                                                                                              |
| PDF / kalendarz  | `pdfmake`, `ical.js`                                                                                    |
| QR / vCard       | `qrcode.react`                                                                                          |
| Logowanie        | Supabase Auth (OAuth Google)                                                                            |
| Testy            | `vitest`, `@testing-library/react`, `jsdom`                                                             |
| Lint             | [Oxlint](https://oxc.rs/) z regułami zależnymi od typów (`oxlint-tsgolint`, oparty na TypeScript 7)     |

## 🚀 Szybki start

Wymagany Node.js 24.15.0+ (zob. `engines` w `package.json`).

```bash
git clone https://github.com/fniemczewski2/dzisiajv3.git
cd dzisiajv3
npm install
cp .env.example .env.local   # uzupełnij wartości - patrz sekcja niżej
npm run dev
```

Aplikacja wystartuje na `http://localhost:3000`.

## 🔑 Zmienne środowiskowe

Utwórz plik `.env.local` w katalogu głównym. Zmienne oznaczone `NEXT_PUBLIC_` trafiają do kodu klienckiego - nie umieszczaj tam nic wrażliwego.

Pełna lista z opisami jest w [`.env.example`](./.env.example); kod czyta zmienne wyłącznie przez [`config/env.ts`](./config/env.ts).

| Zmienna                                               | Wymagana do                                             | Opis                                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`                            | Wszystko                                                | URL projektu Supabase                                                                                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                | Wszystko                                                | Publiczny klucz Supabase (anon/publishable)                                                                                    |
| `SUPABASE_SECRET_KEY`                                 | API serwerowe (cron, eksport i usuwanie konta, ankiety) | Klucz service role – tylko po stronie serwera                                                                                  |
| `NEXT_PUBLIC_APP_URL`                                 | OAuth, publiczne linki                                  | Bazowy URL aplikacji (np. `https://dzisiaj.fun`)                                                                               |
| `CALENDAR_TOKEN_ENCRYPTION_KEY`                       | Kalendarze, Slack                                       | 32-bajtowy klucz base64 do szyfrowania tokenów (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) |
| `REJECT_PLAINTEXT_TOKENS`                             | –                                                       | `1` = odrzucaj niezaszyfrowane tokeny w bazie (po uruchomieniu `scripts/encrypt-legacy-tokens.mjs`)                            |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`           | Google Calendar                                         | Aplikacja OAuth w Google Cloud Console                                                                                         |
| `OUTLOOK_CLIENT_ID` / `OUTLOOK_CLIENT_SECRET`         | Outlook / Microsoft Graph                               | Rejestracja aplikacji w Microsoft Entra ID                                                                                     |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`             | Integracja ze Slackiem                                  | Aplikacja Slack (OAuth)                                                                                                        |
| `TMDB_API_KEY`                                        | Filmy i seriale                                         | Klucz The Movie Database API                                                                                                   |
| `PLK_API_KEY`                                         | Pociągi                                                 | Klucz PKP PLK Portal Danych Pasażera                                                                                           |
| `CRON_SECRET`                                         | Endpointy cron                                          | Sekret nagłówka `x-cron-secret`                                                                                                |
| `MAIL_FORWARDING_DOMAIN`                              | Poczta – przekierowania                                 | Domena adresów przekierowania (np. `poczta.dzisiaj.fun`); bez niej funkcja wyłączona                                           |
| `MAIL_INBOUND_SECRET`                                 | Poczta – bramka przekierowań                            | Sekret nagłówka `x-mail-inbound-secret` (ta sama wartość w Workerze)                                                           |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`                        | Powiadomienia push                                      | Klucz publiczny VAPID (prywatny ustawia się w sekretach Edge Functions)                                                        |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Limity zapytań w produkcji                              | Upstash Redis (albo `KV_REST_API_URL` / `KV_REST_API_TOKEN` z integracji Vercel). Bez nich limiter działa w pamięci instancji. |
| `CSP_REPORT_ONLY`                                     | –                                                       | `1` = CSP tylko raportuje zamiast blokować (diagnoza)                                                                          |
| `NEXT_PUBLIC_SW_DEV`                                  | –                                                       | `1` = service worker także w `next dev` (testy powiadomień); domyślnie wyłączony w trybie deweloperskim                        |

**Adresy przekierowania OAuth** – każdy musi być zarejestrowany dokładnie (schemat, host, port, ścieżka), osobno dla `http://localhost:3000` i dla domeny produkcyjnej; inaczej dostawca zwraca `redirect_uri_mismatch`:

| Dostawca                                 | Adres                                                 | Uprawnienia                                                                                                                             |
| ---------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Google Cloud (OAuth client, typ Web)     | `<NEXT_PUBLIC_APP_URL>/api/google-calendar/callback`  | kalendarz                                                                                                                               |
| Google Cloud (OAuth client, typ Web)     | `<NEXT_PUBLIC_APP_URL>/api/mail/gmail/callback`       | `gmail.modify` (odczyt i kosz), `gmail.send`, `userinfo.email` (zakresy „restricted”: bez weryfikacji Google tylko użytkownicy testowi) |
| Microsoft Entra (App registration → Web) | `<NEXT_PUBLIC_APP_URL>/api/outlook-calendar/callback` | kalendarz                                                                                                                               |
| Microsoft Entra (App registration → Web) | `<NEXT_PUBLIC_APP_URL>/api/mail/outlook/callback`     | delegowane `Mail.ReadWrite` (odczyt i kosz), `Mail.Send`, `User.Read`, `offline_access`                                                 |

Edge Functions mają własne sekrety (Supabase → Edge Functions → Secrets): `CRON_SECRET`, `ALLOWED_ORIGIN` (adres aplikacji dla CORS, lokalnie `http://localhost:3000`), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

## 📜 Dostępne skrypty

```bash
npm run dev            # serwer deweloperski
npm run build           # build produkcyjny (webpack) + kontrola skryptów względem CSP
npm run start            # start builda produkcyjnego
npm run lint             # Oxlint (z regułami zależnymi od typów)
npm run lint:fix          # Oxlint z automatycznymi poprawkami
npm run typecheck        # tsc --noEmit (TypeScript 7)
npm run check            # typecheck + lint + formatowanie + martwy kod (knip) + testy
npm run format           # Prettier (formatowanie całego repozytorium)
npm run knip             # nieużywane pliki, eksporty i zależności
npm run test              # testy jednorazowo (CI)
npm run test:watch         # testy w trybie watch
npm run test:coverage       # testy z raportem pokrycia
```

## 🧪 Testy automatyczne

Testy jednostkowe i komponentowe oparte o [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/), w katalogu [`__tests__/`](./__tests__), strukturą odzwierciedlającym źródło:

```
__tests__/
├── a11y/                 # automatyczna kontrola dostępności (axe-core, WCAG 2.x A/AA)
├── config/               # rejestr danych użytkownika, CSP
├── components/           # komponenty UI
├── hooks/                # hooki (m.in. useCrudResource, useRetry, ustawienia)
├── lib/                  # czyste funkcje: daty, CSV, szyfrowanie tokenów, kolejka offline
├── pages/api/            # endpointy API
└── styles/               # kontrast tokenów motywu, zakaz klas palety Tailwinda
```

Priorytetem jest logika, w której błąd jest kosztowny lub łatwo go niezauważyć po cichu: parsowanie dat i stref czasowych, szyfrowanie tokenów OAuth kalendarzy, kategoryzacja wyciągów bankowych, mechanizm retry używany przez każdy hook zapisujący dane. Uruchomienie:

```bash
npm run test
```

Testy Edge Functions (Deno): `cd supabase/functions && deno test --no-lock --node-modules-dir=none` (flaga jest potrzebna, bo w katalogu nadrzędnym jest `package.json` aplikacji). Test uprawnień bazy (pgTAP): `supabase test db` – działa, gdy schemat jest w `supabase/migrations`.

### Ciągła integracja

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) przy każdym pushu i pull requeście sprawdza typy, lint, formatowanie, martwy kod, testy z pokryciem, build produkcyjny (z kontrolą CSP) oraz Edge Functions. Analiza SonarQube/SonarCloud ([`sonar-project.properties`](./sonar-project.properties)) uruchamia się, gdy repozytorium ma sekret `SONAR_TOKEN` (adres serwera: zmienna `SONAR_HOST_URL`, domyślnie SonarCloud).

## 📂 Struktura projektu

```
├── components/     # komponenty React pogrupowane per funkcja (calendar/, bills/, ui/...)
├── config/         # konfiguracja: env.ts (zmienne środowiskowe), limits.ts, timing.ts, server.ts,
│                   #   defaults.ts, storage.ts, userData.ts (rejestr tabel do eksportu i usuwania)…
├── hooks/          # hooki (hooks/db/ = jeden hook na tabelę Supabase; proste listy na useCrudResource)
├── lib/            # czyste funkcje pomocnicze (daty, CSV, tagowanie, szyfrowanie) + integracje serwerowe
├── pages/          # routing Next.js (Pages Router) + pages/api = endpointy backendowe
├── providers/      # konteksty React (Auth, Settings, Toast)
├── public/         # zasoby statyczne, manifest PWA, service worker
├── styles/         # globals.css: tokeny motywu (jasny/ciemny) i kolory znaczeniowe
├── supabase/       # Edge Functions (functions/, _shared/ = kod wspólny, w aplikacji jako @/shared/*) i skrypty SQL (sql/)
├── types/          # typy TypeScript, jeden plik na domenę/zewnętrzne API
└── __tests__/      # testy automatyczne (Vitest)
```

**Konwencja hooków bazodanowych** (`hooks/db/*`): każdy zwraca `{ data, loading, fetching, ...akcje }` - `fetching` to stan pierwszego ładowania (do pokazania skeletonu), `loading` to stan trwającej mutacji (do blokowania przycisków). Każda akcja mutująca sama obsługuje potwierdzenie (dla usuwania), optymistyczną aktualizację, retry i toast sukcesu/błędu - komponenty wywołują je bezpośrednio, bez własnego opakowania.

## 🗄️ Baza danych

PostgreSQL przez Supabase. Wszystkie tabele z danymi użytkownika są wymienione w [`config/userData.ts`](./config/userData.ts) (rejestr używany przy eksporcie i usuwaniu konta). Najważniejsze: `tasks`, `task_reminders`, `events`, `connected_calendars`, `notes`, `quick_notes`, `letters`, `reports`, `meeting_polls` (z `meeting_poll_dates`, `meeting_poll_responses`, `meeting_poll_availabilities`), `day_schemas`, `transactions`, `recurring_bills`, `budget_categories`, `finance_profiles`, `shopping_lists`, `recipes`, `movies`, `daily_habits`, `mood_entries`, `streaks`, `people`, `vcard_profiles`, `work_logs`, `user_trains`, `slack_*`, `push_subscriptions`, `notifications`, `errors`, `settings`; publiczna `stops` (przystanki). Row Level Security ogranicza dostęp do wierszy właściciela (oraz zaufanych osób, którym jawnie udostępniono dane). Skrypty zmian w bazie: [`supabase/sql/`](./supabase/sql) – uruchamiane ręcznie w SQL Editorze, idempotentne (kolejność i opis w [RUNBOOK](docs/RUNBOOK.md)).

## 📱 PWA

Aplikację można zainstalować jako natywną (Ustawienia → Zainstaluj, lub na iOS: Safari → Udostępnij → Dodaj do ekranu głównego). Wspiera powiadomienia push, tryb ciemny/jasny dopasowany do systemu i pracę bez sieci: ostatnio pobrane listy są w IndexedDB, a zadania dodane bez sieci trafiają do kolejki i są wysyłane po odzyskaniu połączenia. Dane w przeglądarce są czyszczone przy wylogowaniu.

## 🔐 Bezpieczeństwo

- Tokeny OAuth (Google, Outlook, Slack) są szyfrowane (AES-256-GCM) przed zapisem do bazy – `lib/server/tokenCrypto.ts`.
- Endpointy cron (`/api/calendar/sync-calendars`, `/api/meeting-polls/close-expired`, `/api/slack/sync`, `/api/mail/inbox/purge`) porównują `CRON_SECRET` w czasie stałym (`lib/server/safeEqual.ts`).
- `/api/worklogs/auto` (Skróty Siri) uwierzytelnia **tokenem per użytkownik** generowanym w Ustawieniach (w bazie tylko SHA-256, tabela `shortcut_tokens`).
- Endpointy pośredniczące (TMDB, PKP, RSS, geokodowanie) wymagają zalogowania i nie ujawniają kluczy API klientowi.
- Publiczne endpointy (`/api/vcard`, ankiety) i endpointy narażone na nadużycia mają limity zapytań (Upstash Redis, `config/server.ts`).
- Proxy (`proxy.ts`) weryfikuje sesję lokalnie (`getClaims()`), bez zapytania do Supabase Auth przy każdej stronie.
- Nagłówki bezpieczeństwa i egzekwowane CSP w `next.config.mjs`. W produkcji `script-src` nie ma `'unsafe-inline'`: jedyny skrypt w treści strony (motyw z next-themes) jest dopuszczony skrótem SHA-256, a `scripts/check-inline-scripts.mjs` przerywa build, jeśli pojawi się inny. Dlatego build produkcyjny używa webpacka (Turbopack wstawia skrypt startowy zmienny między buildami).
- Rola `anon` ma dostęp tylko do publicznych wizytówek; dane wejściowe w filtrach PostgREST przechodzą przez `lib/postgrestFilters.ts` (walidacja UUID, escapowanie `LIKE`).
- Service worker nie zapisuje odpowiedzi API; dane offline są w IndexedDB per konto.

## 📚 Dokumentacja

- [Architektura](docs/ARCHITECTURE.md) – jak aplikacja jest zbudowana, granica bezpieczeństwa, przepływy danych, decyzje.
- [API](docs/API.md) – endpointy Next.js, Edge Functions i funkcje RPC.
- [Runbook](docs/RUNBOOK.md) – wdrożenie, zmiany w bazie, cron, awarie, rotacja sekretów.

## 🤝 Contributing

1. Forkuj repozytorium
2. Utwórz branch (`git checkout -b feature/nazwa-funkcji`)
3. Commituj zmiany i podbij `version` w `package.json` – numer, skrót commita i data wdrożenia trafiają do aplikacji podczas builda
4. Uruchom `npm run check` przed otwarciem PR
5. Otwórz Pull Request

## 📝 Licencja

Projekt prywatny - wszystkie prawa zastrzeżone.
