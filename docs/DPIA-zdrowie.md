# Ocena skutków dla ochrony danych (DPIA) – moduł „Zdrowie”

## 0. Czy DPIA jest wymagana

| Kryterium (wytyczne WP248 rev.01)    | Ocena                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Dane szczególnych kategorii (art. 9) | Tak – tętno, sen, treningi, kroki                                            |
| Osoby szczególnie wrażliwe           | Możliwe: rejestracja otwarta dla każdego konta Google, bez weryfikacji wieku |
| Systematyczne monitorowanie          | Częściowo: ciągłe pomiary tętna wysyłane cyklicznie ze Skrótów iOS           |
| Duża skala                           | Prawdopodobnie nie: oczekiwane 10–100 kont w 12 miesięcy                     |

## 1. Opis przetwarzania (art. 35 ust. 7 lit. a)

| Element              | Opis                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Administrator        | Franciszek Niemczewski – Usługi IT                                                                                                                                 |
| Kto może włączyć     | Każdy użytkownik; bez zgody endpoint nie przyjmuje danych (zgoda wersjonowana)                                                                                     |
| Źródła               | Skróty iOS (Apple Zdrowie) i ręcznie wpisywane treningi                                                                                                            |
| Kategorie danych     | Kroki dzienne; pomiary tętna (czas, bpm) oraz wartości dnia; odcinki faz snu (faza, początek, koniec); treningi (aktywność, czas, dystans, energia, tętno średnie) |
| Cel                  | Wyświetlanie w aplikacji (zakładka Zdrowie, widżety). Brak innych celów: statystyk zbiorczych, powiadomień, udostępniania, profilowania                            |
| Przechowywanie       | Pomiary tętna – do cofnięcia zgody; fazy snu i treningi – do cofnięcia zgody. Cofnięcie zgody usuwa 4 tabele; usunięcie konta usuwa całość                         |
| Lokalizacja          | Baza Supabase w UE (eu-north-1) i funkcje Vercel w Sztokholmie (`arn1`)                                                                                            |
| Dostęp               | Użytkownik (RLS „tylko właściciel”); administrator ma pełny techniczny dostęp przez panel Supabase                                                                 |
| Szyfrowanie          | Brak szyfrowania na poziomie aplikacji dla tabel zdrowia                                                                                                           |
| Skala                | Oczekiwane 10–100 kont w 12 miesięcy                                                                                                                               |
| Cache w przeglądarce | Dane zdrowotne nie są utrwalane w IndexedDB (`lib/queryPersister.ts`, testy)                                                                                       |
| Logi                 | Endpoint loguje komunikaty bez wartości; po poprawce z tego wydania także błąd 500 jest logowany jako tekst, nie obiekt                                            |

## 2. Niezbędność i proporcjonalność (art. 35 ust. 7 lit. b)

| Zasada                      | Realizacja                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Podstawa prawna             | Wyraźna zgoda (art. 9 ust. 2 lit. a RODO) wyrażana przyciskiem, wersjonowana, cofana w Ustawieniach                                        |
| Minimalizacja               | Dane tylko z pól wysyłanych przez użytkownika; brak lokalizacji, brak źródła urządzenia                                                    |
| Ograniczenie przechowywania | przechowywanie próbek tętna „do cofnięcia zgody” bez automatycznego usuwania, co daje możliwość wglądu w dane historyczne                  |
| Kontrola użytkownika        | Cofnięcie zgody usuwa dane; eksport i usunięcie konta obejmują wszystkie tabele zdrowia (testy pokrycia)                                   |
| Małoletni                   | Zgoda dziecka: art. 8 RODO dotyczy usług społeczeństwa informacyjnego; polityka wymaga ukończenia 16 lat, ale wiek nie jest weryfikowany . |

## 3. Ryzyka i środki (art. 35 ust. 7 lit. c–d)

| Ryzyko                                          | Ocena | Środki                                                                                                                                                                   |
| ----------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nieuprawniony dostęp do danych zdrowia          | 2/3   | RLS „tylko właściciel” na każdej tabeli zdrowia, token Skrótów per użytkownik (w bazie tylko SHA-256), limit żądań, HTTPS                                                |
| Dostęp administratora i osób z dostępem do kont | 2/2   | Uwierzytelnianie dwuskładnikowe na kontach administracyjnych; brak dziennika dostępu administratora                                                                      |
| Ujawnienie przez logi                           | 1/2   | Logi bez wartości; po poprawce także bez obiektów błędów; logi błędów klienta czyszczone z e-maili, retencja 30 dni                                                      |
| Użycie danych niezgodnie z celem                | 1/2   | Brak innych celów w kodzie (zweryfikowano: widżety i zakładka Zdrowie, brak użycia w powiadomieniach i funkcjach Edge)                                                   |
| Przekazanie do USA (dostawcy)                   | 1/2   | Dane przetwarzane w UE (Supabase, funkcje Vercel `arn1`); dostawcy z siedzibą w USA (dostęp wsparcia, logi): decyzja (UE) 2023/1795 lub klauzule z decyzji (UE) 2021/914 |

## 4. Środki organizacyjne

Jak w `docs/DPIA-poczta.md`, punkt 4 (umowy powierzenia, region funkcji, procedura naruszeń, kopie zapasowe, opinia prawna).

## 5. Decyzja

Ryzyko szczątkowe wg administratora: niskie prawdopodobieństwo, wysoka dotkliwość.
