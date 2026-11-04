-- 2026-11-05_fk_indexes.sql
--
-- Indeksy kluczy obcych wskazane przez introspekcję (fk_without_index): szybsze usuwanie konta (ON DELETE CASCADE)
-- i zapytania po tych kolumnach. Bezpieczne do ponownego uruchomienia.

create index if not exists mail_forwarding_addresses_user_id_idx on public.mail_forwarding_addresses (user_id);
create index if not exists mail_hidden_messages_user_id_idx on public.mail_hidden_messages (user_id);
create index if not exists mail_inbox_forwarding_id_idx on public.mail_inbox (forwarding_id);
