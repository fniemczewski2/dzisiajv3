# Supabase — schemat i RLS pod kontrolą wersji

Do tej pory tabele i polityki RLS były konfigurowane wyłącznie przez Dashboard
Supabase i nie istniały nigdzie w repozytorium. Ten folder to początek
przenoszenia tego do wersjonowanych migracji SQL.

## Krok 1: wyciągnięcie aktualnego schematu z produkcji

Dwie opcje - wybierz jedną.

### Opcja A (zalecana): Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref awgzftvoqyafqlsntmcc
supabase db pull
```

`db pull` wygeneruje pierwszą migrację w `supabase/migrations/` na podstawie
faktycznego stanu produkcji (tabele, kolumny, indeksy, RLS, triggery,
funkcje) — to najbardziej kompletna i wiarygodna metoda, bo korzysta
z `pg_dump`, a nie z ręcznie pisanego zapytania.

### Opcja B: SQL Editor w Dashboardzie

Jeśli nie chcesz jeszcze instalować CLI, uruchom `introspect_schema.sql`
z tego folderu w Dashboard → SQL Editor. Zwraca strukturę wszystkich tabel
w `public` (kolumny, typy, klucze, status RLS, wszystkie polityki) jako
czytelny JSON per tabela. Skopiuj wynik i wklej do dalszej analizy.

## Krok 2: przegląd i pierwsza migracja

Po wyciągnięciu schematu (metodą A lub B) należy sprawdzić:
- czy nazwy kolumn są konsekwentnie `snake_case`,
- czy typy danych są dopasowane (np. `timestamptz` zamiast `text` na daty,
  `numeric` zamiast `float8` na kwoty pieniężne, `uuid` na klucze obce do
  `auth.users`),
- czy każda tabela z danymi użytkownika ma RLS włączone i polityki
  filtrujące po `auth.uid() = user_id` (nie po wartości z klienta),
- czy nie ma tabel z RLS włączonym, ale bez żadnej polityki (efektywnie
  blokuje to każdy dostęp, łącznie z właścicielem wiersza).

## Krok 3: kolejne zmiany

Od teraz każda zmiana schematu/RLS idzie przez:

```bash
supabase migration new <opisowa_nazwa>
# edytuj wygenerowany plik w supabase/migrations/
supabase db push
```

Dzięki temu każda zmiana ma historię w git, przechodzi code review i da się
odtworzyć całą bazę od zera na nowym środowisku.
