-- Wydanie 1.45.0 (uzupełnienie): adres biletów przyjmuje wiadomości bez biletu do bufora Poczty tylko do chwili
-- potwierdzenia przekazywania (mail weryfikacyjny Gmaila) albo pierwszego rozpoznanego biletu. Potem takie
-- wiadomości są odrzucane (zwrot do nadawcy). Skrypt idempotentny; uruchomić przed wdrożeniem aplikacji.

alter table public.mail_forwarding_addresses
  add column if not exists buffer_closed_at timestamptz;

comment on column public.mail_forwarding_addresses.buffer_closed_at is
  'Adres biletów: od tej chwili wiadomości bez biletu nie trafiają do bufora Poczty (null = bufor otwarty).';
