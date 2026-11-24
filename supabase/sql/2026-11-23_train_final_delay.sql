-- Wynik przejazdu zapamiętany po przyjeździe na stację docelową.
--
-- Dotąd status pociągu żył tylko w pamięci zapytań: po zamknięciu okna odpytywania (3 h po przyjeździe)
-- albo po przeładowaniu strony plan dnia nie miał już żadnych danych i pokazywał „Wkrótce...”.
-- Te kolumny przechowują końcowe opóźnienie i status, więc odbyty przejazd zawsze ma swój opis.
--
-- Skrypt idempotentny.

begin;

alter table public.user_trains
  -- Opóźnienie przyjazdu do stacji docelowej w minutach (0 = na czas).
  add column if not exists final_delay integer,
  -- Status z ostatniej odpowiedzi PKP PLK (np. „Przyjechał”, „Odwołany”).
  add column if not exists final_status text,
  -- Faktyczny przyjazd „HH:MM”, jeśli PKP PLK go podało.
  add column if not exists final_arrival text,
  -- Kiedy wynik zapisano – do odróżnienia braku danych od zera minut.
  add column if not exists final_recorded_at timestamptz;

commit;
