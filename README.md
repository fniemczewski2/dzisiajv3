# Dzisiaj.Fun — Personal Productivity & Life Management App

**Dzisiaj.Fun** ("Today.Fun") to polskojęzyczna aplikacja webowa (PWA) do zarządzania czasem, zadaniami i codziennym życiem — jedno miejsce na zadania, kalendarz, finanse, nawyki, kontakty i wiele więcej.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)
![Tests](https://img.shields.io/badge/tests-vitest-6E9F18)

**Live:** [https://dzisiaj.fun](https://dzisiaj.fun)

> Numer wersji nie jest trzymany statycznie w tym pliku — aplikacja pobiera go na żywo z wiadomości ostatniego commita (format `Ver X.Y.Z`) i wyświetla w **Ustawieniach → Informacje o wersji**.

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
- **Zadania** — priorytety, daty, filtry, przeciąganie (drag & drop) na oś czasu kokpitu
- **Pomodoro** — konfigurowalny timer pracy/przerwy z Wake Lock i dźwiękiem
- **Harmonogram dnia** — powtarzalne schematy dnia, które same pojawiają się w planie
- **Czas pracy** — ręczne logowanie godzin pracy + automatyzacja przez Siri Shortcuts (start/stop bez otwierania aplikacji)

### 🗓️ Organizacja
- **Kalendarz** — wydarzenia z dwukierunkową synchronizacją Google Calendar i Outlook/Microsoft Graph
- **Notatki**, **Sprawozdania** (agenda, uczestnicy, zadania → eksport PDF), **Przypomnienia** cykliczne
- **Listy pakowania** — plecak, walizka podróżna, plecak bezpieczeństwa (ICE)
- **Osoby i relacje** — kontakty z priorytetem przypominania o kontakcie, QR/vCard, import/eksport CSV

### 💰 Finanse
- **Rachunki** i **Budżet roczny** — kategoryzacja, import wyciągów CSV (mBank, PKO BP) z automatycznym rozpoznawaniem sprzedawców
- **Kalkulator rachunków** — sprawiedliwy podział kosztów wg dochodów (algorytm hybrydowy)
- **Listy zakupów** (współdzielone w czasie rzeczywistym) i **Przepisy** (filtrowanie po składnikach)

### 🏃 Styl życia
- **Nawyki** — 8 codziennych nawyków + tracker wody i nastroju
- **Cele i pasma (streaks)** z kamieniami milowymi
- **Trening interwałowy** (HIIT/Tabata) z Wake Lock
- **Pogoda** — prognoza godzinowa/5-dniowa, autorski wskaźnik biometeorologiczny, jakość powietrza (Open-Meteo)
- **Transport miejski** — tablice odjazdów na żywo (GPS lub ulubione przystanki) + śledzenie pociągów PKP

### 🎬 Rozrywka
- **Miejsca i mapa** — import z Google Maps, automatyczne tagowanie, filtrowanie po godzinach otwarcia
- **Filmy i seriale** — integracja z TMDB, dostępność VOD w Polsce (Netflix, HBO Max, Disney+ i inne)

### 🛠️ Narzędzia
- **Udostępnianie** — współdzielenie zadań/kalendarza/list z zaufanymi użytkownikami
- **Cyfrowa wizytówka** — wiele profili vCard z publicznym linkiem (`/v/twoj-link`), własnymi kolorami i danymi firmowymi
- **Ustawienia systemowe** — motyw, powiadomienia push, sortowanie, instalacja jako PWA

## 🏗️ Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (Pages Router) |
| UI | [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide](https://lucide.dev/) |
| Język | TypeScript (strict) |
| Backend / DB | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime) |
| Drag & drop | `@dnd-kit` |
| Mapy | `leaflet` |
| Daty | `date-fns` |
| PDF / kalendarz | `pdfmake`, `pdfreader`, `ical.js` |
| QR / vCard | `qrcode.react` |
| Logowanie | `@react-oauth/google`, Supabase Auth |
| Testy | `vitest`, `@testing-library/react` |

## 🚀 Szybki start

Wymagany Node.js 20+.

```bash
git clone https://github.com/fniemczewski2/dzisiajv3.git
cd dzisiajv3
npm install
cp .env.example .env.local   # uzupełnij wartości - patrz sekcja niżej
npm run dev
```

Aplikacja wystartuje na `http://localhost:3000`.

## 🔑 Zmienne środowiskowe

Utwórz plik `.env.local` w katalogu głównym. Zmienne oznaczone `NEXT_PUBLIC_` trafiają do kodu klienckiego — nie umieszczaj tam nic wrażliwego.

| Zmienna | Wymagana do | Opis |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Wszystko | URL projektu Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Wszystko | Publiczny klucz Supabase (anon/publishable) |
| `SUPABASE_SECRET_KEY` | API cron/webhooki | Klucz serwisowy (service role) — tylko po stronie serwera |
| `NEXT_PUBLIC_APP_URL` | OAuth, publiczne linki wizytówek | Bazowy URL aplikacji (np. `https://dzisiaj.fun`) |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | Sync kalendarzy | 32-bajtowy klucz base64 do szyfrowania tokenów OAuth (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Logowanie Google, sync Google Calendar | Dane aplikacji OAuth w Google Cloud Console |
| `GOOGLE_PLACES_API_KEY` | Import miejsc | Klucz do Google Places API |
| `OUTLOOK_CLIENT_ID` / `OUTLOOK_CLIENT_SECRET` | Sync Outlook/Microsoft Graph | Rejestracja aplikacji w Azure AD |
| `TMDB_API_KEY` | Filmy i seriale | Klucz do The Movie Database API |
| `PLK_API_KEY` | Transport (pociągi) | Klucz do PKP PLK Portal Danych Pasażera |
| `SHORTCUTS_API_SECRET` | Automatyczny czas pracy | Współdzielony sekret dla endpointu Siri Shortcuts (`/api/worklogs/auto`) |
| `CRON_SECRET` | Cron sync kalendarzy | Sekret chroniący `/api/calendar/sync-calendars` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Powiadomienia push | Klucz publiczny VAPID (Web Push) |

## 📜 Dostępne skrypty

```bash
npm run dev            # serwer deweloperski
npm run build           # build produkcyjny
npm run start            # start builda produkcyjnego
npm run lint             # ESLint
npm run lint:fix          # ESLint z automatycznymi poprawkami
npm run test              # testy jednorazowo (CI)
npm run test:watch         # testy w trybie watch
npm run test:coverage       # testy z raportem pokrycia
```

## 🧪 Testy automatyczne

Testy jednostkowe i komponentowe oparte o [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/), w katalogu [`__tests__/`](./__tests__), strukturą odzwierciedlającym źródło:

```
__tests__/
├── lib/                  # czyste funkcje: daty, CSV, tagowanie miejsc, szyfrowanie tokenów
├── hooks/                # np. useRetry (mechanizm ponawiania używany przez wszystkie hooki bazodanowe)
├── components/           # komponenty UI (m.in. CommonButtons)
└── pages/api/            # walidatory/helpery endpointów API (allowlisty, sanityzacja, parsowanie)
```

Priorytetem jest logika, w której błąd jest kosztowny lub łatwo go niezauważyć po cichu: parsowanie dat i stref czasowych, szyfrowanie tokenów OAuth kalendarzy, kategoryzacja wyciągów bankowych, mechanizm retry używany przez każdy hook zapisujący dane. Uruchomienie:

```bash
npm run test
```

## 📂 Struktura projektu

```
├── components/     # komponenty React pogrupowane per funkcja (calendar/, bills/, ui/...)
├── config/         # statyczna konfiguracja: features.ts, guideData.tsx, navigation.ts, limits.ts...
├── hooks/          # hooki (hooks/db/ = jeden hook na tabelę Supabase, każdy z retry + toastami)
├── lib/            # czyste funkcje pomocnicze (daty, CSV, tagowanie, szyfrowanie) + integracje serwerowe
├── pages/          # routing Next.js (Pages Router) + pages/api = endpointy backendowe
├── providers/      # konteksty React (Auth, Toast)
├── public/         # zasoby statyczne, manifest PWA, service worker
├── styles/         # globalne style Tailwind
├── types/          # typy TypeScript, jeden plik na domenę/zewnętrzne API
└── __tests__/      # testy automatyczne (Vitest)
```

**Konwencja hooków bazodanowych** (`hooks/db/*`): każdy zwraca `{ data, loading, fetching, ...akcje }` — `fetching` to stan pierwszego ładowania (do pokazania skeletonu), `loading` to stan trwającej mutacji (do blokowania przycisków). Każda akcja mutująca sama obsługuje potwierdzenie (dla usuwania), optymistyczną aktualizację, retry i toast sukcesu/błędu — komponenty wywołują je bezpośrednio, bez własnego opakowania.

## 🗄️ Baza danych

PostgreSQL przez Supabase. Główne tabele: `tasks`, `events`, `notes`, `reports`, `reminders`, `day_schemas`, `bills`, `budgets`, `budget_categories`, `shopping_lists`, `recipes`, `places`, `movies`, `daily_habits`, `mood_entries`, `streaks`, `people`, `vcard_profiles`, `connected_calendars`, `work_logs`, `user_trains`, `stops`, `push_subscriptions`, `settings`. Row Level Security ogranicza dostęp do wierszy właściciela (oraz zaufanych użytkowników, którym jawnie udostępniono dane).

## 📱 PWA

Aplikację można zainstalować jako natywną (Ustawienia → Zainstaluj, lub na iOS: Safari → Udostępnij → Dodaj do ekranu głównego). Wspiera powiadomienia push i tryb ciemny/jasny dopasowany do systemu.

## 🔐 Bezpieczeństwo

- Tokeny OAuth kalendarzy (Google/Outlook) są szyfrowane (AES-256-GCM) przed zapisem do bazy — zob. `lib/server/tokenCrypto.ts`.
- Endpointy webhook/cron (`/api/worklogs/auto`, `/api/calendar/sync-calendars`) porównują sekrety w czasie stałym (`crypto.timingSafeEqual` na skrótach SHA-256).
- Endpointy proxy do zewnętrznych API (TMDB, Google Places) wymagają zalogowanego użytkownika i nie przekazują kluczy API do klienta.
- Skonfigurowane nagłówki bezpieczeństwa (`X-Frame-Options`, `Strict-Transport-Security`, `Permissions-Policy`, CSP) w `next.config.mjs`.

## 🤝 Contributing

1. Forkuj repozytorium
2. Utwórz branch (`git checkout -b feature/nazwa-funkcji`)
3. Commituj zmiany (`git commit -m 'Ver x.y.z - opis zmiany'`) — numer wersji w wiadomości commita jest odczytywany na żywo przez aplikację
4. Uruchom `npm run lint` i `npm run test` przed otwarciem PR
5. Otwórz Pull Request

## 📝 Licencja

Projekt prywatny — wszystkie prawa zastrzeżone.
