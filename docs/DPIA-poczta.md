# Ocena skutków dla ochrony danych (DPIA) – moduł „Poczta”

## 0. Czy DPIA jest wymagana

| Kryterium (wytyczne WP248 rev.01)         | Ocena                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| Dane osób trzecich (nadawcy, odbiorcy)    | Tak – treść cudzej korespondencji                                            |
| Dane szczególnych kategorii lub tajemnice | Możliwe: w skrzynkach mogą być takie dane                                    |
| Osoby szczególnie wrażliwe                | Możliwe: rejestracja otwarta dla każdego konta Google, bez weryfikacji wieku |
| Duża skala                                | Prawdopodobnie nie: oczekiwane 10–100 kont w 12 miesięcy                     |
| Systematyczne monitorowanie               | Nie                                                                          |

## 1. Opis przetwarzania (art. 35 ust. 7 lit. a)

| Element               | Opis                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Administrator         | Franciszek Niemczewski – Usługi IT                                                                                                                           |
| Cel                   | Odczyt poczty użytkownika, odpowiedź po potwierdzeniu, zadanie i wydarzenie z wiadomości, usuwanie (do kosza lub tylko z aplikacji)                          |
| Kto korzysta          | Każdy użytkownik z kontem Google; sam łączy swoje skrzynki (prywatne, służbowe, fundacji) i udziela zgody albo ustawia przekierowanie; widzi wyłącznie swoje |
| Zakres uprawnień      | Odczyt, wysyłanie odpowiedzi i usuwanie                                                                                                                      |
| Kategorie danych      | Adres konta poczty, tokeny OAuth (szyfrowane), nagłówki i treść wiadomości, dane nadawców i odbiorców (osoby trzecie)                                        |
| Przechowywanie treści | Konta Gmail/Outlook: tylko w pamięci serwera i przeglądarki, bez zapisu w bazie i w IndexedDB. Przekierowania: bufor szyfrowany AES-256-GCM, 72 h            |
| Metadane              | Identyfikatory wiadomości usuniętych z aplikacji (bez treści), skrót tokenu adresu przekierowania                                                            |
| Odbiorcy              | Google LLC, Microsoft Corporation (dostawcy skrzynek), Supabase (baza w UE, eu-north-1), Vercel Inc., Cloudflare, Inc., Upstash Inc. (liczniki żądań)        |
| Skala                 | Oczekiwane 10–100 aktywnych kont w 12 miesięcy                                                                                                               |
| Szyfrowanie tokenów   | AES-256-GCM, jeden klucz w zmiennej środowiskowej Vercel (`CALENDAR_TOKEN_ENCRYPTION_KEY`); funkcje Edge nie odszyfrowują tokenów                            |

## 2. Niezbędność i proporcjonalność (art. 35 ust. 7 lit. b)

| Zasada                      | Realizacja                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minimalizacja               | Lista pobiera tylko nagłówki; treść na żądanie; zadanie zawiera wyłącznie nadawcę                                                                             |
| Ograniczenie przechowywania | Brak zapisu treści z kont; bufor przekierowań wygasa po 72 h (decyzja administratora: bez zmian)                                                              |
| Podstawa prawna             | Użytkownik: art. 6 ust. 1 lit. a i b RODO. Osoby trzecie: patrz punkt 5                                                                                       |
| Kontrola użytkownika        | Odłączenie konta (unieważnienie tokenu Google), odwołanie adresu, usuwanie wiadomości, eksport danych (`config/userData.ts`)                                  |
| Uprawnienia                 | Zakres obejmuje usuwanie (konieczność uzasadniona funkcją „usuń do kosza”); usunięcie tylko po jawnym wyborze, przeniesienie do kosza jest odwracalne `[KOD]` |

## 3. Ryzyka i środki (art. 35 ust. 7 lit. c–d)

Skala ocen administratora: 1 niskie, 2 średnie, 3 wysokie; zapis „prawdopodobieństwo/dotkliwość”.

| Ryzyko                                            | Ocena | Środki                                                                                              |
| ------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------- |
| Wyciek tokenów OAuth i dostęp do cudzych skrzynek | 1/3   | AES-256-GCM, klucz poza bazą, RLS, odrzucanie tokenów bez szyfrowania w produkcji                   |
| Ujawnienie treści poczty osób trzecich            | 1/3   | Brak zapisu treści z kont, `Cache-Control: no-store`, brak utrwalania w IndexedDB, wygasanie bufora |
| Wykonanie kodu z treści HTML (XSS)                | 1/2   | DOMPurify, ramka `sandbox` bez `allow-scripts`, CSP                                                 |
| Śledzenie otwarcia (piksele)                      | 1/2   | Obrazy zdalne ukryte do zgody; pobierane przez proxy (ukrycie IP)                                   |
| SSRF przez proxy obrazów                          | 1/2   | Tylko adresy publiczne, połączenie pod sprawdzony IP, bez SVG, limit rozmiaru                       |
| Wysyłka bez woli użytkownika                      | 1/2   | Podgląd i potwierdzenie, flaga `confirm` po stronie serwera, limit `mailSend`                       |
| Usunięcie wiadomości w skrzynce                   | 1/1   | Tylko po jawnym wyborze; przeniesienie do kosza (odwracalne)                                        |
| Nadużycie kwot API / DoS                          | 1/2   | Limity `mailRead`, `mailSend`, `mailDelete`, `mailImage`, `mailInbound`                             |
| Przekazanie do USA                                | 1/2   | Decyzja (UE) 2023/1795 lub klauzule z decyzji (UE) 2021/914                                         |

## 4. Środki organizacyjne

| Obszar                      | Stan                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Umowy powierzenia (art. 28) | Warunki DPA Supabase, Vercel, Upstash i Cloudflare (zgodnie z regulaminem)                                                |
| Region funkcji serwerowych  | Vercel: Sztokholm (`arn1`), ten sam region co baza Supabase (eu-north-1)                                                  |
| Procedura naruszeń          | Spisana w `docs/RUNBOOK.md` (sekcja „Naruszenie ochrony danych”)                                                          |
| Kopie zapasowe              | Aplikacja nie wykonuje kopii; użytkownik może pobrać własne dane;                                                         |
| Rotacja klucza szyfrującego | Brak mechanizmu; w repozytorium jest tylko skrypt szyfrujący tokeny zapisane jawnie (`scripts/encrypt-legacy-tokens.mjs`) |
