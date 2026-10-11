## Audyt dostępności: Dzisiaj.Fun (v1.39.0)
**Standard:** WCAG 2.1 AA (+ 2.5.5 cele dotykowe 44 px) | **Data:** 2026-10-10

Audyt kodu (statyczny) i obliczenia kontrastu. Nie zastępuje testu z VoiceOverem
na iPhonie i z NVDA – patrz „Do sprawdzenia ręcznie” na końcu.

### Podsumowanie
**Znalezione:** 15 | **Krytyczne:** 2 | **Poważne:** 8 | **Drobne:** 5 | **Naprawione w tej wersji:** 13

### Postrzegalność
| # | Problem | Kryterium | Waga | Stan |
|---|---------|-----------|------|------|
| 1 | Paski wydarzeń w miesiącu (biały tekst) – kolory kategorii mogłyby nie mieć kontrastu | 1.4.3 | 🔴 Krytyczne | ✅ Zamknięta paleta 10 kolorów, każdy ≥ 5.1:1 z bielą (test automatyczny) |
| 2 | Paski wydarzeń czytane przez czytnik w oderwaniu od dnia | 1.3.1 | 🟡 Poważne | ✅ `aria-hidden`, treść dnia w etykiecie komórki |
| 3 | Kategoria/kolizja/nastrój przekazywane tylko kolorem lub ikoną | 1.4.1 | 🟡 Poważne | ✅ Nazwa kategorii w tekście, „uwaga: nakładające się terminy” i nastrój w etykiecie komórki |
| 4 | Etykiety formularzy 12 px na telefonie | 1.4.4 | 🟢 Drobne | ✅ `form-label` 14 px |
| 5 | Wielkie litery w nagłówku „SORTOWANIE” | 1.4.8 (dobra praktyka) | 🟢 Drobne | ✅ Zwykła pisownia |

### Funkcjonalność
| # | Problem | Kryterium | Waga | Stan |
|---|---------|-----------|------|------|
| 6 | Małe przyciski akcji 36×36 px, przyciski formularzy ~40 px | 2.5.5 | 🟡 Poważne | ✅ Min. 44×44 px (`actionButton`, `formButtons`, filtry, czipy) |
| 7 | iOS powiększa stronę po dotknięciu pól `text-xs` (data, godzina) | 1.4.10 / użyteczność | 🟡 Poważne | ✅ Pola ≥ 16 px na ekranach dotykowych |
| 8 | Fokus 2 px słabo widoczny na granatowym nagłówku | 2.4.7 | 🟡 Poważne | ✅ 3 px + odstęp; nagłówek bez ciemnego tła |
| 9 | Pola bez widocznego fokusu (wyszukiwarka globalna, wizytówka) | 2.4.7 | 🟡 Poważne | ✅ Pierścień `focus-visible` |
| 10 | Wybór koloru – musi działać bez myszy | 2.1.1 | 🔴 Krytyczne (nowa funkcja) | ✅ Natywne radio: strzałki, Tab, Escape zamyka i oddaje fokus |
| 11 | Szybkie notatki: Enter dodaje, Shift+Enter łamie linię | 2.1.1 | – | ✅ Zaprojektowane od początku |

### Zrozumiałość
| # | Problem | Kryterium | Waga | Stan |
|---|---------|-----------|------|------|
| 12 | Kolizja terminów nieogłaszana czytnikowi | 3.3.1 / 4.1.3 | 🟡 Poważne | ✅ Region `aria-live`; drugie „Zapisz” zapisuje mimo kolizji, fokus na ostrzeżeniu |
| 13 | Błędy przypomnień (przeszłość, duplikat, limit) | 3.3.1 | 🟢 Drobne | ✅ `role="alert"` + komunikat przy próbie zapisu |

### Solidność
| # | Problem | Kryterium | Waga | Stan |
|---|---------|-----------|------|------|
| 14 | Przyciski priorytetu w edycji zadania bez nazwy | 4.1.2 | 🟡 Poważne | ✅ `aria-label` „Zwiększ/Zmniejsz priorytet”, wartość w `<output>` |
| 15 | Filtry dnia w zadaniach bez stanu | 4.1.2 | 🟢 Drobne | ✅ `aria-pressed`; to samo w filtrze kategorii |

### Kontrast (motyw jasny)
| Element | Kolor | Tło | Wynik | Wymagane | OK? |
|---------|-------|-----|-------|----------|-----|
| Tekst główny | #101A26 | #F7F8FA | 16.5:1 | 4.5:1 | ✅ |
| Tekst drugorzędny | #34475C | #F7F8FA | 9.0:1 | 4.5:1 | ✅ |
| Tekst wyciszony | #53637A | #F0F3F6 | 5.5:1 | 4.5:1 | ✅ |
| Ostrzeżenie o kolizji | #6B410F | #FFF4E0 | 8.1:1 | 4.5:1 | ✅ |
| Obramowanie pola | #7C8BA0 | #FFFFFF | 3.5:1 | 3:1 | ✅ |
| Pasek wydarzenia bez kategorii (ciemny motyw) | #FFFFFF | #2C68B3 | 5.6:1 | 4.5:1 | ✅ |

### Do sprawdzenia ręcznie
1. **VoiceOver na iPhonie:** etykiety komórek kalendarza, ogłoszenie kolizji, wybór koloru.
2. **Powiększenie 200%** i tryb „Większy tekst” w iOS: pasek nawigacji i karty zadań.
3. **Istniejące ekrany spoza tej zmiany** (budżet, kalkulator, pociągi) nadal mają miejscami `text-xs` i przyciski < 44 px – do przejrzenia w kolejnej iteracji.
