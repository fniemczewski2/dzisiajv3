# Ocena skutków dla ochrony danych (DPIA) – moduł „Poczta”

Status: **PROJEKT** – wymaga uzupełnienia i zatwierdzenia przez administratora danych (art. 35 RODO).
Pola oznaczone `[DO UZUPEŁNIENIA]` nie wynikają z kodu.

## 1. Opis przetwarzania (art. 35 ust. 7 lit. a)

| Element                     | Opis                                                                                                                                                                              | Źródło w kodzie                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cel                         | Odczyt poczty użytkownika, odpowiedź po potwierdzeniu, zadanie i wydarzenie z wiadomości, usuwanie                                                                                | `pages/api/mail/*`                                                                                        |
| Kategorie danych            | Adres konta poczty, tokeny OAuth (szyfrowane), nagłówki i treść wiadomości, dane nadawców i odbiorców (osoby trzecie)                                                             | `lib/mail/*`                                                                                              |
| Przechowywanie treści       | Konta Gmail/Outlook: tylko w pamięci serwera i przeglądarki (cache zapytań bez utrwalania). Przekierowania: bufor szyfrowany AES-256-GCM, usuwany po `MAIL_INBOX_RETENTION_HOURS` | `hooks/useMail.ts`, `lib/queryPersister.ts`, `pages/api/mail/inbound.ts`, `pages/api/mail/inbox/purge.ts` |
| Metadane                    | Identyfikatory wiadomości usuniętych z aplikacji (bez treści), skrót tokenu adresu przekierowania                                                                                 | `mail_hidden_messages`, `mail_forwarding_addresses`                                                       |
| Odbiorcy                    | Google LLC, Microsoft Corporation, Supabase (UE, eu-north-1), Vercel Inc., Cloudflare, Inc.                                                                                       | `pages/privacy.tsx`                                                                                       |
| Liczba użytkowników / skala | `[DO UZUPEŁNIENIA]`                                                                                                                                                               | —                                                                                                         |

## 2. Niezbędność i proporcjonalność (art. 35 ust. 7 lit. b)

| Zasada                      | Realizacja                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Minimalizacja               | Lista pobiera tylko nagłówki; treść na żądanie; zadanie zawiera wyłącznie nadawcę                                                       |
| Ograniczenie przechowywania | Brak zapisu treści z kont; przekierowania wygasają; cache poczty nie jest zapisywany w IndexedDB                                        |
| Podstawa prawna             | Art. 6 ust. 1 lit. a i b RODO (użytkownik); dane osób trzecich – `[DO UZUPEŁNIENIA: ocena prawna, art. 14 i art. 2 ust. 2 lit. c RODO]` |
| Kontrola użytkownika        | Odłączenie konta (unieważnienie tokenu Google), odwołanie adresu, usuwanie wiadomości, eksport danych (`config/userData.ts`)            |

## 3. Ryzyka i środki (art. 35 ust. 7 lit. c–d)

| Ryzyko                             | Prawdopodobieństwo / skutek | Środki                                                                                                      |
| ---------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Wyciek tokenów OAuth               | `[DO UZUPEŁNIENIA]`         | AES-256-GCM, klucz poza bazą, RLS, odrzucanie tokenów bez szyfrowania w produkcji                           |
| Wykonanie kodu z treści HTML (XSS) | `[DO UZUPEŁNIENIA]`         | DOMPurify, ramka `sandbox` bez `allow-scripts`, CSP                                                         |
| Śledzenie otwarcia (piksele)       | `[DO UZUPEŁNIENIA]`         | Obrazy zdalne ukryte do zgody; pobierane przez proxy (ukrycie IP)                                           |
| SSRF przez proxy obrazów           | `[DO UZUPEŁNIENIA]`         | Tylko adresy publiczne, połączenie pod sprawdzony IP (ochrona przed DNS rebinding), bez SVG, limit rozmiaru |
| Wysyłka bez woli użytkownika       | `[DO UZUPEŁNIENIA]`         | Podgląd i potwierdzenie, flaga `confirm` po stronie serwera, limit `mailSend`                               |
| Usunięcie wiadomości w skrzynce    | `[DO UZUPEŁNIENIA]`         | Tylko po jawnym wyborze; przeniesienie do kosza (odwracalne)                                                |
| Nadużycie kwot API / DoS           | `[DO UZUPEŁNIENIA]`         | Limity `mailRead`, `mailSend`, `mailDelete`, `mailImage`, `mailInbound`                                     |
| Przekazanie do USA                 | `[DO UZUPEŁNIENIA]`         | Decyzja (UE) 2023/1795 lub klauzule z decyzji (UE) 2021/914                                                 |

## 4. Decyzja

`[DO UZUPEŁNIENIA]` – ryzyko szczątkowe, ewentualna konsultacja z Prezesem UODO (art. 36 RODO), data i podpis administratora.
