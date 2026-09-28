-- supabase/migrations/20260928000000_fix_recipe_category_enum.sql
--
-- Migracja bazowa (20260730000000) tworzyła enum `recipe_category` z
-- wartościami-placeholderami ('sniadanie', 'obiad', 'kolacja', 'deser',
-- 'przekaska'), a aplikacja (types/recipes.ts -> RECIPE_CATEGORIES) wysyła
-- 'śniadanie', 'zupa', 'danie główne', 'przystawka', 'sałatka', 'deser'.
-- Na świeżo postawionej bazie dodanie przepisu kończyło się błędem
-- "invalid input value for enum recipe_category".
--
-- Migracja jest idempotentna: na produkcji, gdzie enum ma już poprawne
-- wartości, nic nie zmienia. Starych placeholderów nie usuwamy – Postgres
-- nie pozwala usunąć wartości z enuma bez przebudowy typu, a nie szkodzą.
--
-- UWAGA: ALTER TYPE ... ADD VALUE nie może być użyte w tej samej transakcji
-- co nowa wartość – dlatego ta migracja zawiera wyłącznie te polecenia.

alter type public.recipe_category add value if not exists 'śniadanie';
alter type public.recipe_category add value if not exists 'zupa';
alter type public.recipe_category add value if not exists 'danie główne';
alter type public.recipe_category add value if not exists 'przystawka';
alter type public.recipe_category add value if not exists 'sałatka';
alter type public.recipe_category add value if not exists 'deser';
