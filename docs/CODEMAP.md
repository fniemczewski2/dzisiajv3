<!-- Plik generowany: npm run codemap. Nie edytować ręcznie. -->

# Mapa kodu Dzisiaj.Fun

Format wpisu: `ścieżka` – opis z nagłówka · exp: eksporty · http: metody · db: tabele Supabase · rpc: funkcje.
Testy (221 plików): `__tests__/<ta sama ścieżka>.test.ts(x)`. Architektura: [ARCHITECTURE.md](ARCHITECTURE.md), API: [API.md](API.md).

## (root)

- `next.config.mjs`
- `postcss.config.js`
- `proxy.ts` – Strażnik stron: niezalogowanych przekierowuje na /start (poza PUBLIC_PATHS, np. /demo), zalogowanych z /start – na stronę docelową. · exp: proxy, config
- `vitest.setup.ts`

## components

- `CookieBanner.tsx`
- `Header.tsx`
- `Navbar.tsx`
- `OfflineSync.tsx` – Wysyła zapisy z kolejki offline zalogowanej osoby: po starcie aplikacji i po każdym odzyskaniu połączenia.

## components/budget

- `BudgetCategoriesEditor.tsx`
- `BudgetOverview.tsx`
- `YearTable.tsx` – Rok w liczbach: wpływy, wydatki i bilans w każdym miesiącu, z transakcji. (Zastępuje dawną tabelę ze stawką godzinową.)

## components/calendar

- `BirthdayIndicator.tsx`
- `CalendarCell.tsx`
- `CalendarHeader.tsx`
- `ConflictNotice.tsx` – Ostrzeżenie o nakładaniu się terminów w formularzu wydarzenia.
- `ConnectedCalendars.tsx`
- `EventCategorySelect.tsx` – Opcjonalna kategoria wydarzenia – ta sama lista, co w zadaniach. Obok pola próbka koloru, żeby od razu było widać, jak wydarzenie wyjdzie w kalendarzu.
- `EventForm.tsx` – db: connected_calendars
- `EventItem.tsx` – rpc: get_email_by_user_id
- `EventsBulkImport.tsx` – Masowe dodawanie wydarzeń: wklejasz listę (harmonogram zjazdów, terminy posiedzeń, plan konferencji…), aplikacja rozpoznaje w każdej linii datę, godziny i… · db: events
- `MonthView.tsx`

## components/dashboard

- `DailyPlan.tsx`
- `DayEvents.tsx`
- `DayHeader.tsx`
- `DaySchemaSwitcher.tsx` – Przełącznik schematu na planie dnia. Pokazuje, który schemat obowiązuje i pozwala wybrać inny tylko na ten dzień (albo dzień bez schematu).
- `DayStreaks.tsx`
- `DayTasks.tsx`
- `DayView.tsx`
- `DraggablePlanItem.tsx`
- `DraggingItem.tsx` – exp: DraggingTaskItem, DraggingEventItem
- `DroppableHourSlot.tsx`
- `PlanItem.tsx`
- `QuickNotes.tsx`
- `TrainPlanItem.tsx`

## components/daySchema

- `DaySchemaForm.tsx`

## components/demo

- `DemoTour.tsx` – Przewodnik krok po kroku po funkcjach aplikacji. Nawigacja przyciskami (obsługa klawiaturą natywna), numer kroku ogłaszany na żywo, „Wypróbuj” prowadzi przez…

## components/features

- `FeatureStatusBadge.tsx`

## components/finance

- `CsvImport.tsx` – Import wyciągu z banku (CSV, format mBanku i zgodne). Każda transakcja dostaje kategorię (z pliku, a jeśli jej nie ma w budżecie – z historii podobnych…
- `FinanceFields.tsx` – Pola wspólne formularzy transakcji i płatności cyklicznych. · exp: AmountField, CategorySelect, ProfileSelect
- `ProfileSwitcher.tsx` – Wybór profilu finansowego (konto osobiste, firmowe, wspólne…). „Wszystkie” pokazuje dane ze wszystkich profili; pozycje bez profilu widać tylko tam.
- `RecurringBillForm.tsx`
- `RecurringBillsSection.tsx`
- `TransactionForm.tsx`
- `TransactionsSection.tsx` – Wydatki i wpływy miesiąca – w tym samym układzie co „Płatności cykliczne”: nagłówek z przyciskiem „Dodaj”, podsumowanie, a niżej karta na każdą transakcję…

## components/health

- `HealthDateNav.tsx` – Wybór dnia (poprzedni / następny) – ten sam układ co przełącznik miesiąca w budżecie.
- `HeartRateSection.tsx` – Tętno z wybranego dnia: ostatni pomiar, średnia, minimum i maksimum (liczone z rejestru) oraz lista pomiarów.
- `SleepSection.tsx` – Sen z wybranej doby: czas snu, przebudzeń i w łóżku, udział faz (pasek i tabela) oraz przebieg nocy.
- `StatTile.tsx` – Kafelek z jedną wartością (element listy opisów <dl>): etykieta, wartość i opcjonalna podpowiedź.

## components/letters

- `LetterForm.tsx`
- `LetterList.tsx` – exp: AttachmentSlot, LetterList

## components/mail

- `ForwardingPanel.tsx` – Adresy przekierowania (wariant A). Adres z tokenem jest pokazywany jednorazowo po utworzeniu.
- `InboxList.tsx` – Przekierowane wiadomości z bufora: zwinięte do nagłówka, rozwinięcie pokazuje treść (HTML lub tekst). · exp: InboxRow, InboxList
- `MailAccountsPanel.tsx`
- `MailBody.tsx` – Treść wiadomości. HTML: izolowana ramka (sandbox bez allow-scripts – skrypty z maila nie działają, linki otwierają się w nowej karcie), wysokość dopasowana do…
- `MessageDetail.tsx` – Wiadomość: nagłówek, przyciski „Zadanie” i „Wydarzenie” (jak na pulpicie), zaproszenie, treść (HTML lub tekst) i odpowiedź.
- `MessageList.tsx`
- `UnifiedMailList.tsx` – Wspólny widok skrzynek: wiadomości ze wszystkich kont i przekierowane w jednej liście, z etykietą źródła.

## components/meetingPolls

- `MeetingPollBookings.tsx` – Widok organizatora ankiety zapisów: link do udostępnienia, zapisy pogrupowane według slotów (z zajętością), usuwanie zapisu i eksport CSV.
- `MeetingPollDetails.tsx` – Strona wyników ankiety: dla ankiety zapisów widok zapisów, dla ankiety dostępności siatka wyników.
- `MeetingPollForm.tsx`
- `MeetingPollGrid.tsx` – exp: GridLegend, MeetingPollGrid
- `MeetingPollList.tsx` – db: meeting_poll_responses, meeting_poll_dates
- `MeetingPollRespondents.tsx` – exp: initialsOf, MeetingPollRespondents
- `MeetingPollResults.tsx`
- `PublicPollForm.tsx`
- `PublicSignupForm.tsx` – Publiczny formularz zapisów na terminy: lista slotów z liczbą wolnych miejsc, imię, opcjonalny e-mail i zgoda.
- `RespondentResultsGrid.tsx` – Siatka wyników dla uczestnika: ten sam układ co u organizatora (dni × godziny, najlepsze przedziały), tylko do odczytu i bez imion, adresów oraz akcji.

## components/movies

- `MovieCard.tsx`
- `MovieForm.tsx` – exp: MediaTypeBadge, MovieAddForm, pluralSeasons
- `MovieList.tsx` – exp: MovieWatchlist
- `SeriesProgress.tsx` – Gdzie jestem w serialu: sezon + ostatni obejrzany odcinek (0 = jeszcze nie zacząłem sezonu).

## components/news

- `NewsSourcesPanel.tsx`

## components/notes

- `NoteCard.tsx`
- `NoteColorPicker.tsx` – Wybór koloru tła notatki: grupa przycisków radiowych (natywne input type="radio" – strzałki, Tab i czytniki ekranu działają bez dodatkowego kodu).
- `NoteEditForm.tsx`
- `NoteForm.tsx`
- `NoteFormatToolbar.tsx`
- `NoteList.tsx`

## components/packing

- `PackingList.tsx`

## components/people

- `ExportPeople.tsx`
- `ImportPeople.tsx`
- `PersonCard.tsx`
- `PersonForm.tsx`

## components/profiles

- `ProfileEditorForm.tsx` – db: vcard_profiles
- `ProfilesList.tsx`
- `TypedValueList.tsx` – Lista par „typ + wartość” w edytorze wizytówki (telefony, e-maile, adresy). Jeden komponent zamiast trzech kopii tego samego układu.
- `VCardPreview.tsx`

## components/recipes

- `RecipeForm.tsx`
- `RecipesList.tsx`

## components/reports

- `ReportForm.tsx`
- `ReportTasksToApp.tsx` – Zadania z protokołu → Zadania, pojedynczo: każde zadanie ma własny przycisk „Dodaj”. · db: tasks
- `ReportTemplatePanel.tsx`

## components/settings

- `AddItemInput.tsx` – Reużywalne pole „dodaj pozycję” do list w ustawieniach (nastroje, nawyki, kategorie, osoby zaufane, profile finansowe, szablony): pole tekstowe + przycisk…
- `CategoryColorPicker.tsx` – Wybór koloru kategorii z zamkniętej palety. Przycisk-próbka otwiera grupę przycisków radiowych (natywne <input type="radio">, więc strzałki, Tab i czytniki…
- `DataExportSection.tsx`
- `FinanceSettings.tsx` – Ustawienia Finansów: profile finansowe (do 5, zapis od razu), kategorie liczone jako „Wydatki dnia” i push w dniu terminu płatności (zapis z resztą formularza…
- `HabitsEditor.tsx` – Własne nawyki: do 8 pozycji, każda z nazwą i ikoną. Zmiany trafiają do formularza ustawień i zapisują się przyciskiem „Zapisz”.
- `HealthConsentSection.tsx` – Zgoda na przekazywanie danych o zdrowiu ze Skrótów iOS i jej cofnięcie (z usunięciem danych).
- `InstallButton.tsx` – exp: InstallPromptButton
- `LocationSection.tsx`
- `LoveButton.tsx`
- `LoveCat.tsx`
- `ModulesEditor.tsx` – Włączanie i wyłączanie modułów. Wyłączony moduł znika z menu i wyszukiwarki; jego dane zostają w bazie i wracają po ponownym włączeniu.
- `NotificationPreferencesForm.tsx` – exp: NotificationPreferences
- `ObsidianSection.tsx` – Vault Obsidiana w OneDrive lub Google Drive: połączenie, synchronizacja na żądanie, odłączenie.
- `PushNotificationManager.tsx`
- `SettingsForm.tsx` – Ustawienia podzielone na sekcje tematyczne. Każda sekcja ma własną kopię roboczą i własny przycisk „Zapisz” – zapisuje tylko swoje pola. · exp: SETTINGS_SECTIONS, SettingsForm
- `SettingsSection.tsx` – Sekcja ustawień z własnym zapisem. Trzyma kopię roboczą tylko swoich pól, więc „Zapisz” w jednej sekcji nie rusza niezapisanych zmian w innej.
- `ShortcutTokenSection.tsx` – db: shortcut_tokens
- `SlackListEditor.tsx`
- `SlackListsSection.tsx`
- `TaskCategoriesEditor.tsx` – Edycja własnych kategorii (zadań i wydarzeń) wraz z kolorami. Zmiany trafiają do formularza ustawień i zapisują się razem z nim (przycisk „Zapisz”).
- `ThemeButton.tsx` – exp: ThemeToggle
- `TrustedUsersField.tsx` – Lista adresów e-mail zaufanych osób. Każdy wiersz ma stały identyfikator (nie indeks) – usunięcie środkowej osoby nie przenosi fokusu ani wpisanego tekstu do…
- `UserSection.tsx`
- `Version.tsx` – Wersja wdrożonej aplikacji. Numer pochodzi z package.json, a data i skrót commita z builda (next.config.mjs) – bez zapytań do GitHuba z przeglądarki. · exp: VersionInfo

## components/shopping

- `ShoppingForm.tsx`
- `ShoppingListView.tsx` – rpc: get_email_by_user_id

## components/streaks

- `StreakCard.tsx`
- `StreakForm.tsx`

## components/tasks

- `CategoryFilter.tsx`
- `RecurringPreviewList.tsx` – Podgląd przyszłych wystąpień zadań cyklicznych. Tylko do odczytu: wystąpienie staje się prawdziwym zadaniem po wykonaniu bieżącego.
- `TaskEditForm.tsx` – Formularz edycji zadania (wydzielony z TaskItem – osobny plik, mniejszy komponent listy).
- `TaskForm.tsx`
- `TaskItem.tsx` – db: tasks · rpc: get_email_by_user_id
- `TaskList.tsx`
- `TaskRemindersEditor.tsx` – Do 5 przypomnień push o zadaniu, każde z własną datą i godziną.
- `TimeContextBadge.tsx`

## components/training

- `HealthActivitySection.tsx` – Aktywność: kroki z ostatnich 7 dni (Skróty iOS) i treningi z 30 dni – ze Skrótów oraz dodane ręcznie.
- `ManualWorkoutForm.tsx` – Formularz własnego treningu (poza danymi ze Skrótów iOS). Walidacja w lib/health/manualWorkout.ts.

## components/transport

- `AddTrainWidget.tsx` – exp: AddTrainForm
- `StationBoard.tsx` – exp: StationBoardWidget
- `TrackedTrainCard.tsx`

## components/ui

- `buttons/actionButtonVariants.ts` – exp: actionButton, actionIcon, ACTION_LABEL_CLASS
- `buttons/addSpecificButton.tsx` – exp: AddSpecificButton
- `buttons/copyButtonSmall.tsx` – exp: CopyButtonSmall
- `buttons/formButtons.tsx` – exp: AddButton, CloseButton, SaveButton, CancelButton, FormButtons
- `buttons/iconButtons.tsx` – exp: ConfirmButton, DeleteButton, NotifyButton, EditButton, FavButton, RescheduleButton, TimerButton, ShareButton, +10
- `buttons/secondaryFullButton.tsx` – exp: SecondaryFullButton
- `buttons/toggles.tsx` – exp: IconActionButton, ToggleChip, ToggleSwitch
- `CommonButtons.tsx`
- `ErrorBoundary.tsx`
- `GlobalSearch.tsx`
- `Layout.tsx`
- `LoadingState.tsx`
- `Modal.tsx` – Native <dialog>-based modal. Replaces the previous pattern of a '<div role="dialog">' overlay with a manual onClick-outside-to-close handler - that pattern…
- `ModuleGate.tsx`
- `NoResultsState.tsx`
- `RecurrenceEditor.tsx` – Edytor powtarzania dla wydarzeń i zadań. Na górze zwykły wybór (nie / codziennie / co tydzień / co miesiąc / co rok); szczegóły (co ile, dni tygodnia, wariant…
- `SearchBar.tsx`
- `SEO.tsx` – exp: Seo
- `Skeleton.tsx` – exp: SkeletonLine, SkeletonCard, SkeletonSlotGrid, SkeletonRow, SkeletonShoppingList, SkeletonCalendar, SkeletonTaskList, SkeletonBudgetTable, +7
- `Timer.tsx` – exp: UniversalTimer

## components/widgets

- `DailyHeartRateWidget.tsx`
- `DailySpendingWidget.tsx` – components/widgets/DailySpendingForm.tsx
- `DailyStepsWidget.tsx`
- `DashboardWidgets.tsx`
- `habitIconMap.ts` – exp: habitIcon
- `HabitIcons.tsx` – Nawyki dnia jako przyciski-przełączniki (aria-pressed). Lista pochodzi z ustawień: własne nawyki albo domyślne.
- `MoodTracker.tsx` – exp: MoodWidget
- `WaterTracker.tsx`

## config

- `constants.ts` – exp: DESCRIPTION_MAPPINGS, BOILERPLATE_REGEXES, REQUIRED_CATEGORIES, HEART_RATE_LIMITS
- `defaults.ts` – Wartości domyślne: ustawienia nowego konta, nastroje, kalkulator rachunków, formularze. Limity – config/limits.ts, czasy – config/timing.ts. · exp: DEFAULT_MOODS, DEFAULT_SETTINGS, BILLS_CALCULATOR_DEFAULTS, DEFAULT_EVENT_DURATION_MIN, DEFAULT_OTHER_DAY_START_HOUR, MEETING_POLL_QUICK_WORKING_DAYS, RECURRING_PREVIEW_DAYS, DEFAULT_REPORT_LOGO_WIDTH, +10
- `env.ts` – Jedyne miejsce, w którym aplikacja czyta zmienne środowiskowe. - 'publicEnv' – zmienne NEXT_PUBLIC_*, wstawiane do kodu klienta podczas builda. · exp: publicEnv, serverEnv
- `features.ts` – exp: FEATURE_STATUS_LABEL, FEATURE_GROUPS, getFeaturesWithStatus
- `globalSearch.ts` – exp: GLOBAL_SEARCH_MIN_CHARS, GLOBAL_SEARCH_LIMIT, GLOBAL_SEARCH_SOURCES
- `guideData.tsx` – exp: guideSections
- `limits.ts` – Limity danych i interfejsu widoczne dla użytkownika (ile czegoś można mieć, jak duży może być plik, ile pozycji pokazać). · exp: MAX_SHOPPING_LISTS, MAX_FAVORITE_STOPS, MAX_TRUSTED_USERS, MAX_MOODS, MAX_CATEGORIES, MAX_RECIPE_PRODUCTS, MAX_HABITS, MAX_VCARD_PROFILES, +54
- `modules.ts` – Menu aplikacji: kolejność grup (NAV_GROUPS) i pozycji. Test __tests__/config/navigation.test.ts pilnuje, żeby każdy widok był w menu, a grupy były spójne i w… · exp: NAVIGATION_BUTTONS, moduleForPath, isPathEnabled, normalizeDisabledModules, TOGGLEABLE_MODULES, BOTTOM_BAR, menuItemsFor, menuRowSizes
- `noteColors.ts` – Kolory tła notatek. Klucze to wartości kolumny 'notes.bg_color' w bazie (historyczne nazwy klas Tailwinda) – nie zmieniaj ich. · exp: NOTE_COLORS, DEFAULT_NOTE_COLOR, noteColorClass
- `packing.ts` – exp: BACKPACK, SAFETY, SUITCASE
- `priority.ts` – exp: getPriorityColors
- `rssSources.ts` – exp: RSS_SOURCES, RSS_GROUPS, MAX_CUSTOM_FEEDS, defaultEnabledSources, resolveEnabledSources, normalizeCustomFeeds
- `server.ts` – Stałe wyłącznie serwerowe: limity zapytań, timeouty integracji, paginacja i nagłówki cache. Limity widoczne dla użytkownika są w config/limits.ts. · exp: RATE_LIMITS, RATE_LIMIT_REDIS_TIMEOUT_MS, RATE_LIMIT_MEMORY_MAX_KEYS, POLL_EDIT_TOKEN_HEADER, CACHE_CONTROL, TIMEOUTS_MS, SERVER_TTL_MS, EXPORT_INLINE_MAX_BYTES, +27
- `slack.ts` – Dawna kategoria systemowa zadań ze Slacka. Od 1.40 o synchronizacji decyduje powiązanie zadania z listą (slack_task_links / slack_task_targets), a zadania z… · exp: SLACK_API_BASE, SLACK_AUTHORIZE_URL, SLACK_STATE_COOKIE, SLACK_STATE_TTL_SECONDS, SLACK_USER_SCOPES, SLACK_REQUEST_TIMEOUT_MS, SLACK_ITEMS_PAGE_SIZE, SLACK_RATE_LIMIT_RETRIES, +16
- `storage.ts` – Wszystko, co aplikacja zapisuje w przeglądarce. Lista jest źródłem dla polityki prywatności (sekcja „Pliki cookie i pamięć przeglądarki”) i dla czyszczenia… · exp: OFFLINE_CACHE_DB, OFFLINE_CACHE_STORE, OFFLINE_CACHE_DB_VERSION, OFFLINE_QUEUE_DB, OFFLINE_QUEUE_STORE, OFFLINE_QUEUE_DB_VERSION, USER_LOCAL_STORAGE_KEYS, DEVICE_LOCAL_STORAGE_KEYS, +4
- `tasks.ts` – Kategoria zadań utworzonych z poczty (kategoria systemowa – zawsze dostępna). · exp: TASK_CATEGORIES, DEFAULT_TASK_CATEGORY, MEETING_POLL_TASK_CATEGORY, MAIL_TASK_CATEGORY, MEETING_POLL_TASK_TITLE, MEETING_POLL_TASK_PRIORITY
- `theme.mjs` – Ustawienia next-themes – wspólne dla _app (ThemeProvider) i next.config.mjs, który liczy z nich skrót SHA-256 skryptu motywu do CSP. · exp: THEME_PROVIDER_PROPS
- `timing.ts` – Czasy po stronie klienta: ponowienia, okna cofania, odświeżanie danych. Timeouty i TTL serwera – config/server.ts. · exp: RETRY_DELAY_MS, RETRY_MAX_ATTEMPTS, UNDO_WINDOW_MS, SEARCH_DEBOUNCE_MS, TRAIN_STATUS_REFRESH_MS, STATION_BOARD_CLIENT_TIMEOUT_MS, LOVE_COOLDOWN_MS, COPY_FEEDBACK_MS, +15
- `userData.ts` – Rejestr wszystkich tabel z danymi użytkownika – jedno źródło dla eksportu danych (RODO art. 15 i 20) i usuwania konta (art. 17). · exp: USER_TABLES, MEETING_POLL_EXPORT_LABELS, MEETING_POLL_EXPORT_COLUMNS, SHARED_REFERENCES, EXPORT_BUCKET, USER_STORAGE_BUCKETS, ACCOUNT_DELETE_CONFIRMATION, EXPORT_FILE_PREFIX, +1

## hooks

- `useAbortController.ts`
- `useAppStreak.ts` – db: app_usage_days
- `useDashboardDnd.ts`
- `useDataExport.ts` – Pobranie kopii wszystkich danych konta (/api/account/export) jako pliku JSON.
- `useDragAutoscroll.ts` – Extracted from DayView.tsx: while any drag is active, scrolls the window when the pointer nears the top/bottom edge so long day plans stay reachable during…
- `useDragSelectGrid.ts` – Zaznaczanie komórek siatki przeciąganiem – myszą, palcem i rysikiem. Na telefonie nie działało z trzech powodów: 1. · exp: dragCellStyle, useDragSelectGrid
- `useEnabledModules.ts` – Wyłączone moduły z ustawień użytkownika (SettingsProvider). Używane naraz przez pasek, menu, wyszukiwarkę i strażnika strony – wszystkie czytają ten sam stan,…
- `useEuroRate.ts`
- `useEventConflicts.ts` – Sprawdza na bieżąco, czy wpisywany termin nakłada się na inne wydarzenia. · exp: parseLocalInput, useEventConflicts · db: events
- `useHealthConsent.ts` – Zgoda na dane o zdrowiu ze Skrótów iOS (art. 9 ust. 2 lit. a RODO). Cofnięcie zgody usuwa zapisane dane (art. 7 ust.
- `useIntervalTraining.ts`
- `useIsClient.ts` – Wartości dostępne tylko w przeglądarce bez efektu ustawiającego stan po zamontowaniu (useSyncExternalStore: na serwerze i przy hydratacji wartość serwerowa,… · exp: useIsClient, useOrigin
- `useLatestRef.ts` – Ref z najnowszą wartością – dla callbacków, które nie powinny zmieniać tożsamości przy każdej zmianie danych.
- `useMail.ts` – Dane modułu poczty przez TanStack Query (jak pozostałe moduły): deduplikacja żądań i cache w pamięci. · exp: MAIL_KEYS, useMailClient, useMailAccounts, useMailMessages, useMailMessagesOfAccounts, useMailMessage, useMailForwarding, useMailInbox, +1
- `useMailActions.ts` – Akcje strony /mail (łączenie, odłączanie, usuwanie, przekierowania) – poza komponentem strony.
- `useMeetingPollStats.ts` – Obliczenia wyników ankiety terminów (liczba osób w każdym terminie, najlepsze przedziały, dostępność wybranej osoby i zaznaczenia) oraz lista kalendarzy do… · exp: useMeetingPollStats, useCalendarOptions · db: connected_calendars
- `useMoodConsent.ts` – Wyraźna zgoda na zapis nastroju (art. 9 ust. 2 lit. a RODO – nastrój może ujawniać informacje o zdrowiu). · db: mood_entries
- `useNews.ts` – Wiadomości z kanałów RSS (TanStack Query – powrót na stronę nie pobiera ich od nowa). · exp: useNews, checkCustomFeed
- `useNow.ts` – Bieżący czas jako stan zewnętrzny (useSyncExternalStore) – render pozostaje czysty (bez new Date() w trakcie renderu), a komponent odświeża się co…
- `usePlanByHour.ts` – Extracted from DayView.tsx: builds the hour -> plan-items map that DailyPlan renders, and (for today only) trims hours that are fully in the past with nothing…
- `usePublicMeetingPoll.ts`
- `usePublicSignup.ts` – Publiczny formularz zapisów: zajętość slotów (odświeżana po powrocie do karty i po błędzie „termin zajęty”) oraz wysłanie zapisu.
- `useQueryState.ts` – Dane z bazy przez TanStack Query z możliwością lokalnych (optymistycznych) zmian: 'setData' zapisuje wprost do pamięci zapytania, więc wszystkie komponenty z…
- `useQuickAction.ts`
- `useReportTemplate.ts` – Szablony PDF protokołów (do 5) zapisane w ustawieniach + operacje na plikach w Storage. Każda zmiana zapisuje się od razu. · exp: useReportTemplates
- `useResponsive.ts`
- `useRetry.ts`
- `useSharedListNotifier.ts` – Powiadomienia o zmianach na wspólnej liście. Każda zmiana (dodanie, usunięcie pozycji) trafia do bufora listy; gdy przez SHARED_LIST_NOTIFY_DELAY_MS nie ma…
- `useTaskCategories.ts` – Kategorie zadań i ich kolory – z ustawień użytkownika (SettingsProvider), więc zmiana w Ustawieniach jest od razu widoczna w formularzach i na liście. · exp: useTaskCategories, useCategoryColors, applyTaskCategoryRenames · db: tasks, events
- `useTimer.ts` – exp: engineReducer, useTimerEngine
- `useWeather.ts` – Prognoza i jakość powietrza (Open-Meteo) dla bieżącej lokalizacji.

## hooks/db

- `useBudgetCategories.ts` – db: budget_categories
- `useBudgetSummary.ts` – Zaplanowane wydatki: terminy rachunków stałych od dziś do końca roku, z pominięciem miesięcy, w których rachunek ma już powiązaną płatność. · exp: plannedBillRows, useBudgetSummary · db: transactions
- `useConnectedCalendars.ts` – exp: fetchProviderCalendars, useConnectedCalendars · db: connected_calendars
- `useCrudResource.ts`
- `useDailyHabits.ts` – db: daily_habits
- `useDailyOverrides.ts` – db: daily_overrides
- `useDaySchemaChoice.ts` – Ręczny wybór schematu na konkretny dzień (tabela day_schema_choices). · db: day_schema_choices, daily_overrides
- `useDaySchemas.ts`
- `useEvents.ts` – exp: useVirtualBirthdayEvents, useEvents · db: people, events
- `useFinance.ts` – Dane Finansów: profile, rachunki stałe i transakcje. Zmiany zapisują się od razu (optymistycznie), a błędy cofają stan i pokazują komunikat. · exp: useFinanceProfiles, useRecurringBills, useTransactions, useCategoryNameMap · db: finance_profiles, recurring_bills, tasks, transactions
- `useHealthData.ts` – Dane o zdrowiu (Skróty iOS i wpisy ręczne): dzień (kroki), treningi, rejestr tętna, fazy snu. · exp: useHealthDays, useHealthWorkouts, useHeartRateDay, useSleepNight, useWorkoutMutations · db: health_daily, health_workouts, health_heart_rate, health_sleep_segments
- `useLetters.ts` – exp: suggestResponseDate, useLetters · db: letter_attachments, letters
- `useMeetingPollBookings.ts` – Zapisy uczestników w ankiecie zapisów – odczyt i usuwanie przez sesję organizatora (RLS: tylko właściciel ankiety). · db: meeting_poll_bookings
- `useMeetingPolls.ts` – db: meeting_polls, meeting_poll_dates, tasks, meeting_poll_responses, meeting_poll_availabilities
- `useMoods.ts` – db: mood_entries
- `useMovies.ts`
- `useNotes.ts`
- `usePeople.ts`
- `useProfiles.ts` – Wizytówki (vcard_profiles) – na wspólnym useCrudResource: optymistyczne zmiany, ponowienia i kopia offline jak w pozostałych modułach.
- `usePushNotifications.ts` – db: push_subscriptions
- `useQuickNotes.ts` – Szybkie notatki użytkownika. Notatki dodane Skrótem pojawiają się po powrocie do aplikacji: odświeżamy listę, gdy karta znów staje się widoczna. · db: quick_notes
- `useRecipes.ts` – db: products
- `useRecurringTaskPreviews.ts` – Zadania cykliczne użytkownika (niezależnie od terminu i statusu – zrobione, czekające na przesunięcie terminu też) i ich przyszłe wystąpienia w zakresie dat. · db: tasks
- `useRecurringTasks.ts` – Wzorce zadań cyklicznych (wiersze tasks z is_recurring = true), własne i udostępnione. · exp: RECURRING_TASKS_KEY, useRecurringTasks · db: tasks
- `useReports.ts`
- `useSettings.ts` – Dostęp do ustawień użytkownika z SettingsProvider (providers/SettingsProvider.tsx). Wszystkie komponenty dzielą jeden stan i jedno zapytanie do bazy.
- `useShoppingLists.ts` – db: shopping_lists · rpc: leave_shared_shopping_list
- `useSlackListOptions.ts` – exp: useSlackListOptions, setSlackTaskTarget
- `useSlackTasks.ts` – exp: useSlackTasks, triggerSlackSync
- `useStreaks.ts`
- `useTasks.ts` – db: tasks
- `useTrains.ts` – Podział na pociągi bieżące (w oknie odpytywania PKP PLK), nadchodzące (przed oknem) i odbyte (po oknie). · exp: splitTrains, useTrains, useTrainsForDate, useTrainStatus, useTrainPlanStatus · db: user_trains
- `useTransport.ts` – db: stops
- `useWorkLogs.ts`

## lib

- `abortUtils.ts` – exp: isAbortError, createAbortError
- `amountUtils.ts` – exp: isValidAmountInput, parseAmountInput
- `appStreak.ts` – exp: computeStreak
- `billSplit.ts` – Tekst podziału kosztów do wysłania (schowek, udostępnianie, e-mail). Zawiera wyłącznie kwoty i procenty; dochody netto nie są częścią wiadomości. · exp: BILL_SPLIT_SUBJECT, formatBillSplit, buildMailtoHref
- `budgetUtils.ts` – exp: calculateExpectedYearlyLimit, propagateMonthlyLimits
- `bulkEvents.ts` – Masowe dodawanie wydarzeń z wklejonej listy. Każda linia to wydarzenie: data albo zakres dat (formaty jak w zjazdyParser), opcjonalnie godziny („10:00–12:00”… · exp: parseBulkEvents, eventEndTime
- `calendarExport.ts` – Przeniesienie edycji lub usunięcia wydarzenia z aplikacji do powiązanego kalendarza zewnętrznego. · exp: calendarTargetLabel, exportEventToCalendar, syncLinkedEventChange · db: connected_calendars
- `categoryColors.ts` – Kolory kategorii. Paleta jest zamknięta (bez dowolnego HEX-a), bo na pasku wydarzenia w kalendarzu leży biały tekst: każdy kolor ma kontrast co najmniej 4.5:1… · exp: CATEGORY_PALETTE, isPaletteColor, paletteColorName, normalizeCategoryColors, remapCategoryColors
- `cn.ts` – Combines conditional classes (clsx) and resolves conflicting Tailwind utilities in favor of the last one (tailwind-merge) - e.g.
- `contrast.ts` – Kontrast kolorów wg WCAG 2.x – do wyboru koloru tekstu na tle wybranym przez użytkownika (nastroje, kategorie) i do testów tokenów motywu. · exp: contrastRatio, readableTextColor
- `csvUtils.ts` – exp: readFileAsText, processCsvText
- `dateUtils.ts` – Granice doby 'dateStr' w strefie aplikacji (Europe/Warsaw) jako czasy UTC – niezależnie od strefy przeglądarki lub serwera. · exp: formatTime, localDateTimeToISO, parseEventDate, dateToTimestamp, eventSpansDate, APP_TIME_ZONE, getAppDate, getAppDateTime, +1
- `daySchemas.ts` – Kilka schematów może obejmować ten sam dzień tygodnia (np. „Zwykły czwartek” i „Czwartek z warsztatem”). · exp: schemasForWeekday, defaultSchemaFor, resolveActiveSchema
- `demoTour.ts` – Dane przewodnika demo: kroki po funkcjach budowane z FEATURE_GROUPS (jedno źródło prawdy z /start i /guide) oraz krótka instrukcja pierwszych kroków dla nowego… · exp: DEMO_QUICK_START, buildDemoSteps, tryHref
- `edgeFunctions.ts` – Jedno miejsce wywoływania Edge Functions z przeglądarki: zawsze przez 'supabase.functions.invoke' (adres projektu, klucz publiczny i token sesji dokleja klient… · exp: invokeEdgeFunction
- `errorReport.ts` – Wysyła błędy aplikacji do tabeli 'errors' przez Edge Function 'log-error'. Działa poza kontekstem React (także w ErrorBoundary i globalnych handlerach). · exp: errorMessageOf, redactMessage, reportError, installGlobalErrorHandlers
- `errors.ts` – Akcja wymaga zalogowania, a sesji nie ma (np. wygasła w innej karcie). · exp: NotSignedInError
- `errorUtils.ts` – exp: getErrorMessage, getPostgresErrorCode
- `eventConflicts.ts` – Wykrywanie nakładających się terminów. Zasady: - kolizja to część wspólna dwóch wydarzeń z godziną (stykające się, np. · exp: isAllDayEvent, rangesOverlap, findConflicts, overlappingEventIds, formatConflictRange
- `eventTimes.ts` – exp: LOCAL_DATE_FORMAT, QUICK_EVENT_DURATIONS, addMinutesToLocal, durationBetween, defaultTimedStart
- `eventUtils.ts` – Reguła wydarzenia: nowe pole 'recurrence', a przy starszych wpisach – 'repeat'. · exp: eventRule, expandRepeatingEvents, getEventsForDay
- `finance.ts` – Logika finansów bez dostępu do bazy (łatwa do testowania): - terminy rachunków stałych (ten sam silnik reguł co zadania i wydarzenia), - prognoza rachunków na… · exp: billOccurrences, nextBillDue, monthRange, nextMonthKey, forecastMonth, billMonthStatus, merchantKey, suggestBillLink, +6
- `habits.ts` – Własne nawyki: do 8, każdy z nazwą i ikoną. Dawne 8 stałych nawyków (kolumny pills…duolingo i przełączniki habit_*) to teraz po prostu domyślna lista – ich… · exp: HABIT_ICON_NAMES, LEGACY_HABITS, isLegacyHabitId, normalizeHabits, resolveHabits, isHabitDone, newHabitId
- `holidays.ts` – exp: getPolishHolidays
- `icsGenerator.ts` – Eksport pojedynczego wydarzenia do pliku .ics. · exp: buildSingleEventICS, generateSingleEventICS
- `imgUtils.ts` – exp: useImages · db: avatars
- `letterArchive.ts` – Pakowanie plików pisma do jednego archiwum ZIP: jeden katalog o nazwie sygnatury, w nim podfoldery „pismo” i „odpowiedz” z numerowanymi plikami PDF. · exp: safeName, archiveEntryPaths, buildLetterArchive, archiveFileName, downloadBlob
- `letterTemplates.ts` – exp: generateLetterBody
- `localUserData.ts` – Usuwa z przeglądarki wszystko, co dotyczy zalogowanego konta: kopię danych offline, kolejkę niewysłanych zapisów, pamięć service workera i klucze localStorage… · exp: clearLocalUserData
- `locationUtils.ts` – exp: setGpsCookie, requestSmartLocation
- `meetingPollDeadline.ts` – exp: pollAutoCloseAt, effectivePollStatus
- `meetingPollGrid.ts` – Koniec przedziału; w odróżnieniu od addMinutesToTime nie zawija północy („24:00” zamiast „00:00”). · exp: generateTimeSlots, slotKey, buildAllowedSlotSet, slotEndTime, formatDurationMinutes, formatPollDay, nextWorkingDays, contiguousRanges, +2
- `meetingPollResults.ts` – Agregacja wyników ankiety dla osoby uczestniczącej: ile osób zaznaczyło każdy termin. · exp: summarizeResponses, isRespondentResults
- `meetingPollSignup.ts` – Ankiety w trybie zapisów: walidacja zapisu, komunikaty błędów funkcji bazy, siatka slotów z zajętością, grupowanie zapisów i eksport CSV dla organizatora. · exp: SIGNUP_CONSENT_VERSION, MAX_BOOKING_SLOTS, validateBookingPayload, personKey, bookingFailure, buildSignupDays, countBySlot, groupBookings, +2
- `noteEditing.ts` – exp: applyBold, toggleListPrefix, continueListOnEnter, handleListContinuation
- `noteFormatting.tsx` – exp: renderNoteLineContent, parseNoteLine, groupNoteLines, linkifyText
- `notesUtils.ts` – Normalizes one raw textarea line before it's stored as a note item: trims whitespace and adds an https:// scheme when the whole line is a bare domain (e.g. · exp: filterNotes, getNoteTitles, normalizeNoteLine
- `objectUtils.ts` – Kopia obiektu bez wskazanych kluczy. Zastępuje destrukturyzację w stylu 'const { id: _id, ...rest } = obj', która zostawiała nieużywane zmienne. · exp: omit
- `offlineCache.ts` – Ostatnio pobrane listy (zadania, notatki…) w IndexedDB, żeby aplikacja pokazywała dane bez sieci. · exp: readCache, writeCache, clearOfflineCache
- `offlineQueue.ts` – Zapisy wykonane bez sieci. Każdy wpis pamięta właściciela (id użytkownika): wysyłamy wyłącznie wpisy zalogowanej osoby, w kolejności dodania, po odzyskaniu… · exp: isOffline, enqueueInsert, flushQueue, clearQueue
- `pomodoro.ts` – Stan licznika Pomodoro: skupienie i przerwa na zmianę, każda faza uruchamiana ręcznie. Reducer zamiast kilku efektów reagujących na stan. · exp: pomodoroReducer
- `postgrestFilters.ts` – Bezpieczne składanie filtrów PostgREST. Wartości wstawiane do '.or()' i do wzorców 'ilike' są walidowane albo escapowane, żeby dane wejściowe nie mogły zmienić… · exp: InvalidFilterValueError, assertUuid, ownedOrSharedFilter, quotedIsoTimestamp, escapeLikePattern, containsPattern
- `pushKeys.ts` – Czy subskrypcja push przeglądarki została utworzona z bieżącym kluczem VAPID. · exp: subscriptionMatchesVapidKey
- `pushTestResult.ts` – Opis wyniku testowego powiadomienia dla użytkownika. Przycisk testu ma służyć do diagnozy, więc rozróżniamy trzy przypadki zamiast jednego „wysłano (0 / 0)”. · exp: describePushHttpError, describePushTestResult
- `queryClient.ts` – Klient TanStack Query – wspólna pamięć podręczna zapytań do bazy. · exp: getQueryClient, clearQueryCache
- `queryPersister.ts` – Zapis pamięci TanStack Query w IndexedDB (jedna warstwa pamięci podręcznej zamiast osobnej kopii list). · exp: shouldPersistQuery, queryPersister
- `quickNotes.ts` – Komunikat, gdy baza odrzuci notatkę (trigger limitu lub ograniczenie długości, kod 23514). Ten sam w aplikacji i w odpowiedzi dla Skrótów Siri. · exp: QUICK_NOTES_LIMIT_MESSAGE, stripBullet, splitQuickNoteText, readQuickNoteText
- `recipeUtils.ts` – Przycina, skraca zbyt długie i usuwa duplikaty (bez względu na wielkość liter). · exp: RECIPE_NAME_MIN_LENGTH, RECIPE_NAME_MAX_LENGTH, RECIPE_PRODUCT_MAX_LENGTH, RECIPE_DESCRIPTION_MAX_LENGTH, normalizeProducts, hasProduct, collectProducts, normalizeRecipe, +3
- `redirect.ts` – Bezpieczna ścieżka przekierowania po logowaniu: tylko ścieżka w obrębie aplikacji (zaczyna się od jednego „/”), bez schematu, hosta i ukośników wstecznych. · exp: safeRedirectPath
- `reportColors.ts` – Kolory PDF protokołu wyprowadzone z jednego koloru nagłówków wybranego przez użytkownika: nagłówki i numeracja w tym kolorze, tekst prawie czarny z odrobiną… · exp: isHexColor, mix, contrastOnWhite, ensureReadable, derivePalette
- `reportExport.ts` – Eksport protokołu ze spotkania do Markdown i PDF. Oba formaty mają tę samą, dotychczasową kolejność sekcji: nagłówek (temat, data) → agenda → obecni… · exp: formatReportDate, reportAgenda, reportParticipants, reportTasks, reportFileName, buildReportMarkdown, TEMPLATE_FONT_NAMES, resolveReportFonts, +5
- `reportTemplate.ts` – Szablon PDF protokołów: własne czcionki (tytuł, nagłówki, treść) i logo papieru firmowego. · exp: LOGO_WIDTH_RANGE, FONT_ROLES, detectFontKind, detectImageKind, clampLogoWidth, normalizeReportTemplate, normalizeTemplateSet, pickTemplate, +7
- `reportToTasks.ts` – Zadania z protokołu → zadania w aplikacji. Każde utworzone zadanie zapisuje swój identyfikator w protokole (tasks[i].app_task_id), więc nie da się go dodać… · exp: reportTaskChoices, toAppTask, withAppTaskIds
- `sanitize.ts` – Validates a meeting-poll finalize slot coming straight from the request body before it's interpolated into an 'events' insert (date/time were previously… · exp: sanitizeHref, sanitizeJsonLd, validateEmail, validateSlot, validateFinalizeSlot
- `serviceWorker.ts` – Jedno miejsce rejestracji service workera. W trybie deweloperskim (next dev) service worker jest domyślnie wyłączony (w produkcji i testach – włączony): serwer… · exp: SERVICE_WORKER_DISABLED_MESSAGE, registerServiceWorker, checkForServiceWorkerUpdate
- `settings.ts` – Zamiana wiersza 'settings' z bazy na obiekt ustawień (wartości domyślne, normalizacja pól JSON). Bez Reacta – używane przez SettingsProvider i testy. · exp: settingsFromRow
- `share.tsx` – exp: resolveSharedEmails, getUserIdByEmail · rpc: get_emails_by_ids, get_user_id_by_email
- `sharedListChanges.ts` – Zmiany pozycji wspólnej listy zbierane do jednego powiadomienia: różnica między dwoma stanami listy, scalanie kolejnych zmian (dodanie i usunięcie tej samej… · exp: MAX_NOTIFY_LABELS, diffElements, mergeChange, toPayload
- `stopGroupKeys.ts` – Starsza wersja funkcji 'transport-departures' nie zwraca pola 'key'. Bez niego ulubione nie pasują do żadnej grupy, a React dostaje zduplikowane klucze. · exp: withFavoriteKeys, withNearbyKeys
- `taskCategories.ts` – Kategorie zadań: użytkownik ustala własną listę w Ustawieniach (kolumna settings.task_categories). · exp: SYSTEM_TASK_CATEGORIES, DEFAULT_USER_TASK_CATEGORIES, resolveUserTaskCategories, taskCategoryOptions, defaultTaskCategory, normalizeTaskCategoryName, validateTaskCategoryName
- `taskOccurrences.ts` – Podgląd przyszłych wystąpień zadań cyklicznych. Zadanie cykliczne to jeden wiersz z bieżącym terminem – kolejne wystąpienia liczymy tym samym silnikiem reguł… · exp: projectTaskOccurrences, groupPreviewsByDate
- `taskRecurrence.ts` – Pola zadania cyklicznego. Nowa reguła trafia do 'recurrence'; stare pola (repeat_days, recurring_until) wypełniamy zgodnie z nią, żeby starsze miejsca w kodzie… · exp: taskRecurrenceFields, taskRule
- `taskReminders.ts` – Przypomnienia o zadaniu (tabela task_reminders). W formularzu trzymamy je jako wartości pola datetime-local („2026-10-12T09:00”, czas lokalny), w bazie jako… · exp: toLocalInput, reminderPresets, validateReminders, fetchPendingReminders, replacePendingReminders · db: task_reminders
- `text.ts` – Liniowe operacje na tekście zamiast wyrażeń regularnych z nawracaniem (np. · exp: trimWhere, trimChars, isSimpleEmail
- `themeScriptHash.mjs` – Skrót SHA-256 skryptu, który next-themes wstawia w treść strony (ustawia motyw przed pierwszym renderem).
- `timeContext.ts` – exp: getTimeContext
- `tmdb.ts` – Zamienia wyniki /search/multi na wspólny kształt; pomija osoby i nieznane typy. · exp: translateSeriesStatus, isSafePosterPath, posterUrl, normalizeSearchResults, extractPolishProviders, buildMovieData, searchMedia, fetchMediaDetails
- `trainPlan.ts` – Okno odpytywania PKP PLK: od 3 h przed planowym odjazdem ze stacji początkowej do 3 h po planowym przyjeździe do stacji docelowej. · exp: plannedDeparture, formatHm, planHourKey, expectedDeparture, trainStatusWindow, trainTimePhase, isStatusRelevant, relativeDeparture, +5
- `trainPunctuality.ts` – Jeden opis punktualności pociągu dla planu dnia i widoku „Pociągi” – te same słowa i ta sama ocena. · exp: describeTrainPunctuality
- `trainRoute.ts` – 4 – ta sama nazwa, 3 – jedna jest początkiem drugiej, 2 – zawiera, 0 – brak. · exp: normalizeStationName, stationMatchScore, resolveRouteStations
- `trainStatusDetails.ts` – exp: buildStationDetails
- `trainTicketUtils.ts` – exp: useTicketUpload
- `travelTickets.ts` – Przypomnienie o zakupie biletów przed podróżą: dla wydarzenia z kategorią podróżną tworzymy zadanie „Kup bilety: …” na 30 dni przed wyjazdem (PKP Intercity… · exp: TICKET_REMINDER_DAYS_BEFORE, isTravelCategory, ticketTaskDay, createTicketReminderTask · db: tasks
- `urlBase64ToUint8Array.tsx`
- `vcard.ts` – Jedno miejsce generowania plików vCard 3.0 (RFC 2426): publiczna wizytówka (/api/vcard), podgląd wizytówki i kontakt z modułu Osoby. · exp: escVCardValue, sanitizeTypeToken, vcardType, safeFileName, structuredName, buildVCard, vcardContentDisposition
- `workLogTime.ts` – Konwersje czasu wpisów pracy: wartość z pola datetime-local (czas lokalny bez strefy) ↔ ISO z przesunięciem strefy, które zapisujemy w bazie. · exp: toIsoWithLocalOffset, toLocalInputValue, nowLocalInputValue, validateWorkLogRange
- `zjazdyParser.ts` – Wyszukuje terminy zjazdów w tekście skopiowanym ze strony uczelni (tabela, lista, akapit). Rozpoznaje m.in.: 11-12.10.2025 · 11–12.10.2025 r. · exp: findDateMatches, parseStudyDates

## lib/db

- `columns.ts` – Jawne listy kolumn tabel (zamiast select("*")): zapytanie czyta tylko to, czego potrzebuje, a nowa kolumna w bazie (np. · exp: TABLE_COLUMNS, cols

## lib/health

- `format.ts` – 431 → „7 h 11 min”; 45 → „45 min”. · exp: formatSteps, formatMinutes
- `heartRateThinning.ts` – Ograniczenie częstotliwości pomiarów tętna: najwyżej jeden pomiar w każdym przedziale 15 minut (przedziały liczone od północy UTC, czyli od początku epoki). · exp: HEART_RATE_INTERVAL_MS, thinHeartRateSamples
- `manualWorkout.ts` – Ręcznie dodany trening: walidacja formularza i wiersz do zapisu (source = "manual"). · exp: WORKOUT_SUGGESTIONS, emptyManualWorkout, buildManualWorkout
- `shortcutPayload.ts` – Walidacja danych ze Skrótów iOS (Apple Zdrowie). Skróty wysyłają liczby także jako tekst z przecinkiem („6,2”), dlatego wartości liczbowe są normalizowane. · exp: toNumber, parseHealthPayload
- `sleepSessions.ts` – Sny (sesje) z surowych odcinków: jeden sen to odcinki oddzielone krótkimi przerwami. · exp: SLEEP_FETCH_MARGIN_MS, groupSleepSessions, sleepSessionsEndingOn
- `sleepStages.ts` – Fazy snu z Apple Zdrowie. Skróty zwracają nazwy w języku systemu („Głęboki”, „Podstawowy”, „REM”, „Przebudzenie”, „W łóżku”…), więc nazwy są normalizowane (bez… · exp: SLEEP_STAGES, SLEEP_STAGE_LABELS, ASLEEP_STAGES, normalizeSleepStage
- `summary.ts` – Podsumowania liczone w aplikacji z surowych danych: tętno (ostatni pomiar, średnia, minimum, maksimum) i sen (czas snu, przebudzeń i w łóżku oraz czas w… · exp: summarizeHeartRate, resolveSleepTimeline, summarizeSleep
- `time.ts` – Doba i godziny danych zdrowotnych w strefie aplikacji (Europe/Warsaw). · exp: warsawDate, warsawTime, warsawInstant, addDaysToDate, dayBounds

## lib/mail

- `accessToken.ts` – Zwraca ważny access token konta poczty (Gmail lub Outlook): z bazy, gdy jeszcze jest ważny, albo po odświeżeniu. · exp: ACCESS_TOKEN_SKEW_MS, resolveAccessToken
- `accountRules.ts` – Czysta logika kont poczty: limit kont, normalizacja adresu, odpowiedź tokenowa Google, adres autoryzacji i bezpieczny widok konta (bez tokenów). · exp: planAccountSave, normalizeEmail, parseTokenResponse, profileEmail, buildGoogleAuthUrl, canDeleteInMailbox, toPublicAccount
- `addresses.ts` – Adres e-mail z nagłówka „Imię <adres@domena>” albo „adres@domena”. · exp: extractAddress
- `client.ts` – Klient API poczty po stronie przeglądarki. Błędy HTTP są zamieniane na MailApiError z komunikatem serwera. · exp: MailApiError, createMailClient
- `dateMentions.ts` – Wykrywanie terminu w treści wiadomości (gdy nie ma pliku .ics) – podstawa podpowiedzi „Dodaj wydarzenie”. · exp: findDateMention
- `deleteFlow.ts` – Dwustopniowe potwierdzenie usunięcia wiadomości: 1) „Usunąć z aplikacji?” – Anuluj kończy bez zmian, 2) „Przenieść też do kosza w poczcie?” – tylko jawne… · exp: askDeleteMode
- `emailHtml.ts` – Przygotowanie HTML wiadomości do wyświetlenia w izolowanym <iframe srcdoc> (bez skryptów): sanitizacja DOMPurify, bezpieczne linki w nowej karcie, obrazy… · exp: remoteImageUrl, prepareEmailHtml
- `format.ts` – Dziś: „14:05”; w tym roku: „3 paź”; starsze: „3.10.2025”. Niepoprawna data: pusty tekst. · exp: formatMailDate, senderName
- `forwarding.ts` – Wariant A (bez dostępu do skrzynki): każde konto dostaje unikalny adres, na który użytkownik ustawia przekierowanie. · exp: createForwardingToken, forwardingAddress, tokenFromRecipient, hashForwardingToken, planForwardingCreate
- `gmail.ts` – Klient Gmail API (wariant B). Fetch jest wstrzykiwany, więc logikę można testować bez sieci. · exp: parseBatchResponse, GmailApiError, decodeBase64Url, parseGmailMessage, createGmailClient
- `htmlText.ts` – Tekst z HTML (bez DOM) – na potrzeby wykrywania zaproszeń i podglądu, gdy wiadomość nie ma części text/plain. · exp: htmlToPlainText
- `inbound.ts` – Walidacja przychodzącej wiadomości przekierowanej do aplikacji (wariant A). · exp: parseInboundPayload, invitationOf
- `inboxActions.ts` – Zamiana przekierowanej wiadomości (z bufora) na wiersz zadania lub wydarzenia. Czysta logika. · exp: inboxActionRow
- `invitations.ts` – Wykrywanie zaproszeń na spotkania: załącznik iCalendar (.ics), linki do konferencji oraz wiadomości z zaproszeniem bez załącznika. · exp: findConferenceLinks, zonedWallTimeToUtc, parseIcsDate, parseIcs, detectInvitation
- `mailTasks.ts` – Wiersz zadania utworzonego z wiadomości. Treść wiadomości NIE trafia do zadania; zapisujemy wyłącznie nadawcę, żeby zadanie wskazywało źródło. · exp: nextDay, buildMailTaskRow
- `notices.ts` – Komunikaty po powrocie z trasy połączenia konta (parametr ?connected= albo ?error=). · exp: callbackNoticeFor
- `outlook.ts` – Klient Microsoft Graph (poczta Outlook). Fetch jest wstrzykiwany; logika jest testowalna bez sieci. · exp: GraphApiError, formatGraphAddress, decodeBase64Utf8, createOutlookClient
- `outlookAuth.ts` – Adres autoryzacji Microsoft dla poczty oraz odczyt adresu konta z Graph. · exp: buildMicrosoftMailAuthUrl, graphProfileEmail
- `provider.ts` – Jednolity interfejs dla dostawców poczty (Gmail, Outlook). Trasy /api/mail/* nie znają szczegółów API. · exp: ReplyAddressError, gmailProvider, outlookProvider
- `reply.ts` – Budowa odpowiedzi w formacie RFC 5322 (MIME, UTF-8) i kodowanie dla Gmail API. · exp: encodeHeaderValue, utf8ToBase64, toBase64Url, buildReplyMime
- `search.ts` – Fraza wyszukiwania wiadomości: normalizacja i przekład na składnię Gmaila oraz Microsoft Graph. · exp: normalizeSearchQuery, gmailQuery, outlookSearchParam
- `tasks.ts` – Zadanie utworzone z wiadomości: tytuł „Odpowiedz: <temat>”, kategoria „poczta”. · exp: replyTaskTitle
- `types.ts` – Wspólne typy modułu poczty (Gmail, Outlook, przekierowanie). Treść wiadomości nie jest zapisywana w bazie: istnieje tylko w pamięci podczas wyświetlania.
- `unified.ts` – Wspólny widok skrzynek: wiadomości ze wszystkich połączonych kont i przekierowane w jednej liście, od najnowszych. · exp: mergeMail, filterInbox

## lib/notes

- `export.ts` – Eksport notatek do Markdown: pojedyncza notatka (z nagłówkiem YAML jak w synchronizacji z Obsidianem) albo wszystkie w jednym pliku (do archiwum lub… · exp: noteMarkdownFile, allNotesMarkdown, downloadNoteMarkdown, downloadAllNotesMarkdown
- `folders.ts` – Foldery notatek (np. „Fundacje/Zapłon”): normalizacja nazwy, lista folderów i filtr. · exp: MAX_FOLDER_LENGTH, normalizeFolder, folderOptions, ALL_FOLDERS, matchesFolder, folderCounts

## lib/obsidian

- `frontMatter.ts` – Minimalny nagłówek YAML (front matter) dla Obsidiana. Zapisujemy wartości w składni zgodnej z JSON (cudzysłowy, listy w nawiasach) – to poprawny YAML. · exp: stringifyFrontMatter, parseFrontMatter
- `importItems.ts` – Nowe pliki utworzone w Obsidianie → wiersze w aplikacji: przepisy, osoby i protokoły (notatki mają osobną ścieżkę). · exp: recipeValues, personValues, reportValues, importValues
- `markdown.ts` – Notatki, przepisy, osoby i protokoły jako Markdown z nagłówkiem YAML (format Obsidiana) i z powrotem. · exp: noteToMarkdown, noteFromMarkdown, recipeToMarkdown, recipeFromMarkdown, personToMarkdown, personFromMarkdown, reportToMarkdown, reportFromMarkdown, +1
- `paths.ts` – Ścieżki plików w vaulcie. Tożsamość wpisu wyznacza dzisiaj_id w nagłówku, nie ścieżka – zmiana nazwy lub przeniesienie pliku w Obsidianie nie zrywa powiązania. · exp: VAULT_FOLDERS, safeSegment, noteFolderPath, vaultPath, typeFromPath, folderFromNotePath
- `runSync.ts` – Wykonanie synchronizacji: dane aplikacji → Markdown → plan (syncPlan) → zapis w vaulcie i w aplikacji. · exp: runVaultSync
- `storage.ts` – Dostęp do vaultu w chmurze za wspólnym interfejsem. Fetch wstrzykiwany (testy bez sieci). · exp: VaultStorageError, createOneDriveVault, createGoogleDriveVault
- `syncPlan.ts` – Plan synchronizacji dwukierunkowej aplikacja ↔ vault (OneDrive / Google Drive). Czysta logika. · exp: contentHash, planSync

## lib/server

- `accountData.ts` – Eksport i usuwanie wszystkich danych konta (RODO art. 15, 17, 20) na podstawie rejestru config/userData.ts. · exp: AccountDataError, exportUserData, deleteUserData
- `apiGuards.ts` – Wspólne sprawdzenia na początku endpointów: dozwolona metoda HTTP i zalogowany użytkownik. Zwracają null po wysłaniu odpowiedzi błędu. · exp: allowMethods, requireUser
- `calendarTime.ts` – exp: toSupabaseTime, outlookToSupabaseTime, warsawNaiveToRFC3339
- `cronAuth.ts` – exp: verifyCronRequest
- `exportTarget.ts` – Czy wydarzenie można przypiąć do docelowego kalendarza. - Cykliczne: nie. · exp: resolveExportTarget, canAttachToTarget · db: connected_calendars
- `fetchWithTimeout.ts`
- `googleCalendarApi.ts` – Builds the Google Calendar events endpoint URL for a calendar, optionally scoped to a single event. · exp: buildGoogleEventsUrl
- `googleScopes.ts` – Minimalny zestaw uprawnień Google. Wcześniej aplikacja prosiła o 8 zakresów, w tym nowe, bardzo szczegółowe (calendar.events.owned, calendar.calendars…), z… · exp: GOOGLE_CALENDAR_SCOPES
- `imageProxy.ts` – Pobieranie zdalnych obrazów z treści maili przez serwer (CSP aplikacji blokuje obce img-src, a proxy ukrywa adres IP użytkownika przed nadawcą). · exp: isPublicAddress, parseImageUrl, resolvePublicHost, pinnedLookup, fetchRemoteImage
- `inboundAuth.ts` – Czy nagłówek bramki poczty zawiera oczekiwany sekret. Brak sekretu po stronie serwera = odmowa. · exp: isInboundAuthorized
- `mailAttachments.ts` – Dołącza treść załączników kalendarza (.ics) do wiadomości – potrzebne do wykrycia zaproszenia. · exp: invitationFor
- `mailEvents.ts` – Wiersz wydarzenia z zaproszenia w formacie aplikacji: czas polski „YYYY-MM-DDTHH:MM:SS” (jak finalizacja ankiet i synchronizacja kalendarzy), brak miejsca =… · exp: buildMailEventRow
- `mailInlineImages.ts` – Obrazy osadzone (cid:) jako adresy data: – CSP aplikacji dopuszcza data: w img-src. · exp: inlineImageDataUris
- `mailOAuth.ts` – Wspólny przepływ OAuth kont poczty (Gmail, Outlook) – odpowiednik handleOAuthCallback z kalendarzy: start (nonce w ciasteczku) i powrót (stan, wymiana kodu,… · exp: startMailOAuth, handleMailOAuthCallback · db: mail_accounts
- `mailProviders.ts` – Konfiguracja OAuth dostawców poczty dla wspólnego przepływu z lib/server/mailOAuth.ts. · exp: GMAIL_OAUTH, OUTLOOK_OAUTH
- `mailRoute.ts` – Wspólne przygotowanie tras /api/mail/*: sesja (requireUser), identyfikator konta, ważny token (z odświeżeniem) i klient dostawcy (Gmail lub Outlook) za… · exp: isUuid, isValidMessageId, loadMailContext · db: mail_accounts
- `oauthCallback.ts` – exp: handleOAuthCallback · db: connected_calendars
- `oauthState.ts` – Nonce OAuth jest jednorazowy – kasujemy ciasteczko niezależnie od wyniku. · exp: clearStateCookie
- `oauthTokens.ts` – exp: GOOGLE_TOKEN_URL, refreshGoogleToken, refreshOutlookToken
- `pdfCanvasGlobals.ts` – exp: ensurePdfCanvasGlobals
- `rateLimit.ts` – Limit zapytań. W produkcji liczniki trzyma Upstash Redis (wspólne dla wszystkich instancji serverless). · exp: checkRateLimit, enforceRateLimit, clientIp, __resetRateLimit
- `rss.ts` – Pobieranie i parsowanie kanałów RSS 2.0, RSS 1.0 (RDF) i Atom po stronie serwera. · exp: stripHtml, parseFeed, checkPublicUrl, getFeed
- `safeEqual.ts` – Porównanie sekretów w czasie stałym. Obie strony są najpierw haszowane SHA-256, więc czas nie zdradza też długości oczekiwanej wartości (zwykłe…
- `shortcutAuth.ts` – exp: extractShortcutToken, resolveShortcutUser · db: shortcut_tokens
- `shortcutTokens.ts` – Nowy token: 32 losowe bajty. Jawna wartość trafia do użytkownika tylko raz. · exp: generateShortcutToken, hashShortcutToken, looksLikeShortcutToken
- `slackLists.ts` – exp: translateSlackError, listColumns, listColumnsSafe, findAssigneeColumn, lookupUserIdByEmail, readUserIds, buildAssigneeValue, listItems, +7
- `slackSync/pull.ts` – Uzupełnia w zadaniu pola puste w aplikacji, a wypełnione w Slacku (bez nadpisywania). · exp: pullItem, backfillFromItem, createTaskFromItem, applyAppDeletions · db: tasks, slack_task_links, slack_deleted_tasks
- `slackSync/push.ts` – exp: touchLink, pushTask · db: slack_task_links
- `slackSync/syncList.ts` – Filtr „pobieraj tylko zadania przypisane do”. Adresy zamieniamy na identyfikatory użytkowników Slacka; nieznane adresy są pomijane. · exp: belongsOnList, buildAssigneeFilter, syncList · db: slack_task_links, slack_deleted_tasks
- `slackSync/targets.ts` – exp: loadTargets, loadTasks · db: slack_lists, slack_connections, slack_task_links, slack_task_targets, tasks
- `slackSync/taskMapping.ts` – Pola puste w aplikacji, a wypełnione w Slacku (np. termin dodany do mapowania po pierwszym imporcie). · exp: withBuiltInColumns, missingFieldsFromItem, todayInPoland, isWithinImportHorizon, fingerprint, buildFields, itemToTaskPatch, itemChangedSince, +3
- `slackSync/types.ts`
- `supabaseAdmin.ts` – Klient Supabase z kluczem service_role – omija RLS, więc wolno go używać wyłącznie po stronie serwera i tylko po własnym sprawdzeniu, czy zasób należy do…
- `tokenCrypto.ts` – exp: encryptToken, decryptToken
- `vaultConnection.ts` – Połączenie z vaultem (OAuth OneDrive / Google Drive), ważny token i repozytorium danych dla runVaultSync. · exp: startVaultOAuth, handleVaultCallback, vaultStorageFor, supabaseVaultRepo · db: vault_connections, vault_sync_state, notes

## lib/supabase

- `client.ts` – Jeden klient przeglądarkowy na kartę. Kolejne wywołania zwracają ten sam obiekt – kilka instancji GoTrue rywalizowałoby o odświeżanie sesji. · exp: createClient
- `server.ts` – Klient z sesją użytkownika z ciasteczek (API routes, getServerSideProps). Obowiązuje RLS. · exp: createServerSupabase, createAnonSupabase

## pages

- `_app.tsx` – exp: MyApp
- `_document.tsx` – exp: Document
- `calendar.tsx` – exp: CalendarPage
- `demo.tsx` – exp: DemoPage
- `guide.tsx` – exp: GuidePage
- `health.tsx` – Zdrowie: sen (fazy) i tętno (rejestr pomiarów) z Apple Zdrowie, dzień po dniu. Kroki i treningi są w module Trening. Dane tylko przy aktualnej zgodzie (art. · exp: HealthPage
- `index.tsx` – exp: IndexPage
- `mail.tsx` – Poczta: konta Gmail/Outlook (odczyt, odpowiedź po potwierdzeniu, zadanie, wydarzenie, usuwanie) oraz przekierowania. · exp: MailPage
- `news.tsx` – Wiadomości z wybranych kanałów RSS: filtr grup, wyszukiwanie, ładowanie porcjami. Linki otwierają się w nowej karcie (ogłoszone czytnikom ekranu). · exp: NewsPage
- `people.tsx` – exp: PeoplePage
- `privacy.tsx` – exp: PrivacyPage
- `profiles.tsx` – exp: ProfilesPage
- `settings.tsx` – exp: SettingsPage
- `sitemap.xml.ts` – exp: getServerSideProps, SiteMap
- `start.tsx` – exp: StartPage
- `streaks.tsx` – exp: StreaksPage
- `training.tsx` – exp: TrainingPage
- `trains.tsx` – Ile odbytych podróży pokazujemy naraz. · exp: TrainsPage
- `transport.tsx` – exp: TransportPage
- `weather.tsx` – exp: WeatherPage
- `worklogs.tsx` – exp: WorkLogsPage

## pages/api

- `news.ts` – GET /api/news → wiadomości z wybranych źródeł użytkownika POST /api/news?check=1 → sprawdzenie własnego kanału przed dodaniem ({ url }) Źródła i własne kanały… · http: POST,GET · db: settings
- `quick-notes.ts` – http: POST · db: quick_notes
- `tmdb.ts` – exp: isAllowedPath, buildTmdbUrl · http: GET
- `vcard.ts` – GET /api/vcard?slug=… – plik .vcf publicznej wizytówki (bez logowania). · http: GET · db: vcard_profiles

## pages/api/account

- `delete.ts` – POST – usunięcie konta: wszystkie dane (config/userData.ts), pliki w Storage i konto logowania. Wymaga frazy potwierdzającej w treści.
- `export.ts` – GET – kopia wszystkich danych konta w jednym pliku JSON (RODO art. 15 i 20). Bez haseł, tokenów integracji, kluczy push i tokenów udostępniania ankiet.

## pages/api/auth

- `callback.ts` – Powrót z logowania Supabase (OAuth/magic link): wymiana kodu na sesję i krótka strona przejściowa, która powiadamia pozostałe karty i przechodzi pod adres z… · exp: renderCallbackPage · http: GET

## pages/api/calendar

- `sync-calendars.ts` – http: GET · db: events, connected_calendars

## pages/api/google-calendar

- `callback.ts`
- `index.ts` – http: GET,POST,DELETE · db: connected_calendars, events

## pages/api/health

- `shortcut.ts` – POST ze Skrótu iOS (Apple Zdrowie): kroki, tętno, sen, treningi. Uwierzytelnianie tokenem skrótów (jak czas pracy i szybkie notatki). Dane o zdrowiu (art. · db: health_daily, health_workouts, health_sleep_segments, health_heart_rate, settings

## pages/api/mail

- `accounts.ts` – Lista podłączonych kont poczty (bez tokenów) i odłączanie konta (z unieważnieniem tokenu Google). · http: GET · db: mail_accounts
- `delete.ts` – Usunięcie wiadomości z aplikacji (zapis identyfikatora w mail_hidden_messages) oraz – tylko gdy użytkownik wybrał to w potwierdzeniu (mailbox: true) –… · db: mail_hidden_messages
- `event.ts` – Dodaje wydarzenie z zaproszenia (załącznik .ics lub wiadomość z linkiem) do kalendarza użytkownika. · db: events
- `forwarding.ts` – Adresy przekierowania (wariant A): lista, utworzenie (adres pokazany jednorazowo) i odwołanie. W bazie zapisywany jest wyłącznie skrót tokenu. · http: GET,POST · db: mail_forwarding_addresses
- `gmail/callback.ts`
- `gmail/index.ts`
- `image.ts` – Proxy zdalnych obrazów z treści maili – wywoływane dopiero po kliknięciu „Pokaż obrazy”.
- `inbound.ts` – Odbiór wiadomości przekierowanej z bramki poczty (wariant A). Dostęp chroniony sekretem nagłówka. · db: mail_forwarding_addresses, mail_inbox
- `inbox.ts` – Odczyt i usuwanie przekierowanych wiadomości zalogowanego użytkownika (wygasłe nie są zwracane). · http: GET · db: mail_inbox
- `inbox/action.ts` – Dodaje zadanie albo wydarzenie z przekierowanej wiadomości. Wiersz zapisuje sesja użytkownika (RLS). · db: mail_inbox, tasks, events
- `inbox/purge.ts` – Usuwa wygasłe wiadomości z bufora. Wywoływane przez harmonogram (sekret CRON). · db: mail_inbox
- `message.ts` – Pełna treść wiadomości na żądanie użytkownika + wykryte zaproszenie. Treść nie jest zapisywana.
- `messages.ts` – Lista ostatnich wiadomości z folderu odbiorczego (tylko nagłówki; treść pobierana osobno, na żądanie). · db: mail_hidden_messages
- `outlook/callback.ts`
- `outlook/index.ts`
- `reply.ts` – Wysyła odpowiedź w wątku (Gmail lub Outlook). Wymaga jawnego potwierdzenia (confirm: true) z interfejsu; bez tej flagi nic nie jest wysyłane.
- `task.ts` – Tworzy zadanie „Odpowiedz: <temat>” w kategorii „poczta” z wiadomości (bez treści w zadaniu). · db: tasks

## pages/api/meeting-polls

- `[id]/finalize.ts` – http: POST · db: meeting_polls, meeting_poll_responses, meeting_poll_availabilities, events
- `[id]/responses.ts` – DELETE ?responseId=… – organizator ankiety usuwa pojedynczą odpowiedź (z dostępnością). · db: meeting_polls, meeting_poll_responses, meeting_poll_availabilities
- `close-expired.ts` – db: meeting_polls
- `public/[token]/book.ts` – Zapis uczestnika na terminy w ankiecie zapisów. Serwer waliduje dane i siatkę terminów, a rezerwację wykonuje funkcja bazy book_meeting_poll_slots (blokada… · http: POST · db: meeting_polls, meeting_poll_dates · rpc: book_meeting_poll_slots
- `public/[token]/index.ts` – http: GET · db: meeting_polls, meeting_poll_dates
- `public/[token]/respond.ts` – http: POST,GET · db: meeting_polls, meeting_poll_responses, meeting_poll_availabilities, meeting_poll_dates
- `public/[token]/results.ts` – Wyniki ankiety dla osoby, która już odpowiedziała. Dostęp wymaga tokenu edycji (nagłówek), czyli dowodu, że odpowiedź została wysłana, oraz włączenia opcji… · http: GET · db: meeting_polls, meeting_poll_responses, meeting_poll_availabilities
- `public/[token]/slots.ts` – Zajętość slotów w ankiecie zapisów (publiczny odczyt): tylko liczby zapisów na slot, bez imion i adresów. · http: GET · db: meeting_polls, meeting_poll_bookings

## pages/api/obsidian

- `connection.ts` – GET – stan połączenia z vaultem (bez tokenów); DELETE – odłączenie i usunięcie stanu synchronizacji. Pliki w chmurze i dane w aplikacji zostają bez zmian. · http: GET · db: vault_connections, vault_sync_state
- `gdrive/callback.ts`
- `gdrive/index.ts`
- `onedrive/callback.ts`
- `onedrive/index.ts`
- `sync.ts` – POST – synchronizacja z vaultem Obsidiana. Odpowiedź: liczba wysłanych, zaktualizowanych, zaimportowanych plików i konfliktów. · db: vault_connections

## pages/api/outlook-calendar

- `callback.ts`
- `index.ts` – http: POST · db: connected_calendars, events

## pages/api/slack

- `callback.ts` – http: GET · db: slack_connections
- `index.ts` – exp: extractListId · http: POST · db: slack_connections, slack_lists, tasks, slack_task_targets
- `sync.ts` – exp: belongsOnList, resolveDirection, taskUpdatedAt, itemUpdatedAt · http: GET,POST · db: slack_task_links, slack_task_targets

## pages/api/transport

- `locality.ts` – exp: parseCoord, pickLocality · http: GET
- `parse-ticket.ts` – exp: extractStationNames, extractRoute, parseTicketData · http: POST
- `station-board.ts` – Limit czasu jednego zapytania do API PKP PLK – bez niego zawieszone API trzymało ładowanie. · http: GET
- `train-status.ts` – http: GET

## pages/api/worklogs

- `auto.ts` – http: POST · db: work_logs
- `token.ts` – http: POST,DELETE · db: shortcut_tokens

## pages/bills

- `budget.tsx` – exp: BudgetPage
- `calculator.tsx` – exp: BillCalculator
- `index.tsx` – Finanse: rachunki stałe (tabela 1) i miesięczne wydatki/wpływy (tabela 2), z wyborem profilu i miesiąca. · exp: FinancePage

## pages/meet

- `[token].tsx` – exp: PublicMeetingPollPage

## pages/meetings

- `[id].tsx` – exp: MeetingPollResultsPage
- `index.tsx` – exp: MeetingsPage

## pages/notes

- `index.tsx` – exp: NotesPage
- `letters.tsx` – exp: LettersPage
- `movies.tsx` – exp: MoviesPage
- `recipes.tsx` – exp: RecipesPage
- `reports.tsx` – Protokoły: lista pogrupowana po miesiącach, wyszukiwanie i sortowanie, karta z datą, skrótem treści i rozwijanymi szczegółami. · exp: ReportsPage
- `shopping.tsx` – exp: ShoppingPage

## pages/packing

- `[id].tsx` – exp: DynamicPackingPage
- `index.tsx` – exp: PackingMenuPage

## pages/tasks

- `daySchema.tsx` – exp: DaySchemaPage
- `index.tsx` – exp: TasksPage
- `pomodoro.tsx` – exp: PomodoroPage
- `recurring.tsx` – Zadania cykliczne w jednym miejscu: lista reguł z opisem powtarzania, edycja (także reguły) i usuwanie. · exp: RecurringTasksPage

## pages/v

- `[slug].tsx` – exp: PublicVCard, getServerSideProps · db: vcard_profiles

## providers

- `AuthProvider.tsx` – exp: AuthProvider, useAuth
- `QueryProvider.tsx` – TanStack Query z zapisem pamięci w IndexedDB (lib/queryPersister.ts). 'buster' = wersja aplikacji: po wdrożeniu nowej wersji stary zapis jest pomijany.
- `SettingsProvider.tsx` – Ustawienia użytkownika – jedno źródło dla całej aplikacji. Wiersz 'settings' pobieramy raz po zalogowaniu; wszystkie komponenty (pasek, formularze, kategorie… · exp: SettingsContext, SettingsProvider · db: settings
- `ToastProvider.tsx` – exp: ToastProvider, useToast

## scripts

- `check-inline-scripts.mjs` – Kontrola po buildzie: każdy skrypt wykonywalny wstawiony w treść wygenerowanych stron musi mieć skrót dopuszczony w CSP (next.config.mjs).
- `codemap.mjs` – Generuje docs/CODEMAP.md: katalog plików źródłowych (ścieżka, opis z nagłówka, eksporty, tabele Supabase, metody HTTP endpointów).
- `encrypt-legacy-tokens.mjs`
- `release.mjs` – Wydanie: sprawdzenie (format, lint, typecheck, testy, knip, deno check, build), podbicie wersji w package.json i package-lock.json, podsumowanie, opis commita…

## supabase

- `introspect_schema.sql` – Pełny obraz bazy Supabase w JEDNYM wyniku JSON: tabele (kolumny, klucze, indeksy, triggery, RLS, polityki, uprawnienia ról), widoki, funkcje (z kodem i…

## supabase/functions/_shared

- `asyncPool.ts` – Wspólne dla aplikacji (import "@/shared/asyncPool") i Edge Functions. · exp: mapPool, chunk, forEachPage
- `auth.ts` – Wspólne nagłówki HTTP, CORS i sprawdzanie sekretu crona dla Edge Functions. · exp: safeEqual, verifyCronSecret, ALLOWED_ORIGINS, ALLOWED_ORIGIN, corsHeaders, jsonHeaders, json, preflight, +2
- `bills.ts` – Terminy rachunków stałych – wspólne dla aplikacji i edge functions (bez zależności zewnętrznych, jak recurrence.ts). · exp: billOccurrences, isBillDueOn, BILL_TASK_CATEGORY, billTaskTitle
- `columns.ts` – Kopia list kolumn z lib/db/columns.ts dla funkcji Edge (Deno nie importuje spoza supabase/functions). · exp: TABLE_COLUMNS, cols
- `config.ts` – Limity i ustawienia funkcji Edge (Deno). Pliki z config/ są poza bundlem funkcji, dlatego wartości używane także w aplikacji (np. · exp: MAX_INTERVAL, MAX_COUNT, MAX_STEPS, MAX_SHARED_NOTIFY_TEXT, MAX_ERROR_CONTEXT, MAX_ERROR_MESSAGE, MAX_ERROR_STACK, MAX_MINUTES_AHEAD, +3
- `errors.ts` – exp: getErrorMessage
- `notificationTime_test.ts`
- `notificationTime.ts` – Obliczenia czasu dla powiadomień – wydzielone, żeby dało się je testować. · exp: weekdayIndexPL, plDayBoundsUTC, REMINDER_TOLERANCE_MS, warsawWallClockToInstant, warsawWallClockNow, isAllDayStored, wallClockDayBounds, eventReminderType
- `recurrence.ts` – 0 = poniedziałek … 6 = niedziela. · exp: parseDay, formatDay, weekdayOf, weekdayPosition, normalizeRule, ruleFromLegacyRepeat, withMonthDay, legacyRepeatFor, +4
- `sharedNotifyRules.ts` – Czyste reguły powiadomień o współdzieleniu (bez zależności Deno, testowalne w Vitest). · exp: PREFERENCE_BY_KIND, NOTIFICATION_TYPE_BY_KIND, PUSH_URL_BY_KIND, isRecipientEnabled, planListDelivery, resolveRecipient, summarizeListChange, pozycjaForm, +2
- `stopGrouping.ts` – exp: CLUSTER_RADIUS_M, networkOf, normalizeStopName, distanceM, clusterStops, ambiguousNames, isAmbiguous, pickClusterForFavorite, +4
- `supabase.ts` – Jedyny import klienta Supabase w Edge Functions – jedna, przypięta wersja (ta sama co w aplikacji Next.js). Aktualizacja: zmień numer tutaj. · exp: createClient, SupabaseClient

## supabase/functions/log-error

- `index.ts` – Zapis błędu aplikacji zgłoszonego przez zalogowanego użytkownika (tabela 'errors'). Limit: LOG_LIMIT zgłoszeń na LOG_WINDOW_MINUTES minut na konto. · db: errors

## supabase/functions/notify-shared

- `index.ts` – Powiadomienia o współdzieleniu: zmiany na wspólnej liście (dodane i usunięte pozycje, zbiorczo), zadanie lub wydarzenie przydzielone innej osobie. · db: notifications, settings

## supabase/functions/process-notifications

- `batch_test.ts`
- `batch.ts` – Zapytania zbiorcze zamiast zapytań w pętli po użytkownikach (N+1): jedno zapytanie na typ powiadomienia i jedno na tabelę danych, wyniki pogrupowane po user_id… · exp: usersNotifiedToday, sentDataKeys, sentKey, rowsByUser · db: notifications
- `index.ts` – db: settings, notifications, tasks, events, day_schemas, day_schema_choices, letters, letter_attachments, meeting_polls, meeting_poll_responses, people, task_reminders, recurring_bills, transactions

## supabase/functions/process-reminders

- `index.ts` – Następny termin po wykonaniu. Kotwicą reguły jest dotychczasowy termin (to wystąpienie reguły), a szukamy po dniu późniejszym z: terminu i dnia wykonania –… · exp: nextDueDate · db: tasks, recurring_bills, transactions

## supabase/functions/send-love

- `index.ts` – db: settings, notifications · rpc: find_user_id_by_email

## supabase/functions/send-push

- `index.ts` – db: push_subscriptions

## supabase/functions/transport-departures

- `index.ts` – db: stops

## supabase/sql

- `2026-10-25_mail_accounts.sql` – Konta poczty (Gmail, Outlook) i adresy przekierowania (wariant A). · obj: mail_accounts, mail_accounts_select_own, mail_accounts_insert_own, mail_accounts_update_own, mail_accounts_delete_own, mail_forwarding_addresses, mail_forwarding_select_own, mail_forwarding_insert_own, mail_forwarding_update_own
- `2026-10-26_mail_inbox.sql` – Bufor przekierowanych wiadomości (wariant A). Treść jest szyfrowana (AES-256-GCM) i usuwana po wygaśnięciu (expires_at). · obj: mail_inbox, mail_inbox_select_own, mail_inbox_delete_own
- `2026-10-28_mail_hidden_messages.sql` – Wiadomości usunięte z aplikacji (bez usuwania w skrzynce). Tylko identyfikatory – bez treści. Uruchom PO 2026-10-25_mail_accounts.sql. · obj: mail_hidden_messages, mail_hidden_select_own, mail_hidden_insert_own, mail_hidden_delete_own
- `2026-10-30_health_shortcuts.sql` – Dane o zdrowiu przekazywane ze Skrótów iOS (Apple Zdrowie): kroki, tętno, sen, treningi. Szczególna kategoria danych (art. · obj: health_daily, health_workouts, health_daily_select_own, health_daily_delete_own, health_workouts_select_own, health_workouts_delete_own
- `2026-10-31_notes_folders.sql` – Foldery notatek (np. „Fundacje/Zapłon”) – także struktura folderów w vaulcie Obsidiana.
- `2026-11-01_obsidian_vault.sql` – Synchronizacja z vaultem Obsidiana w OneDrive (folder aplikacji) lub Google Drive (folder „dzisiaj.fun”). Jedno połączenie na użytkownika. · obj: vault_connections, vault_sync_state, vault_connections_own, vault_sync_state_own
- `2026-11-03_health_tab.sql` – Zakładka „Zdrowie”: pełne dane o śnie (fazy) i rejestr tętna ze Skrótów iOS oraz ręczne treningi. Dane o zdrowiu (art. · obj: health_sleep_segments, health_heart_rate, health_sleep_select_own, health_sleep_delete_own, health_heart_rate_select_own, health_heart_rate_delete_own, health_workouts_insert_manual
- `2026-11-04_sleep_sessions.sql` – Sen: odcinki są unikalne po czasie, nie po dobie. Skrót mógł wysłać ten sam odcinek z różnymi datami (np.
- `2026-11-05_fk_indexes.sql` – Indeksy kluczy obcych wskazane przez introspekcję (fk_without_index): szybsze usuwanie konta (ON DELETE CASCADE) i zapytania po tych kolumnach.
- `2026-11-05_poll_signups.sql` – Ankiety w trybie zapisów: terminy z ograniczoną liczbą miejsc (pojemność slotu) i limitem terminów na osobę. · obj: meeting_poll_bookings, meeting_poll_bookings_select_own, meeting_poll_bookings_delete_own, _meeting_poll_fail, _meeting_poll_slot_rows, _meeting_poll_slot_json, book_meeting_poll_slots

## supabase/tests

- `poll_signups.sql` – Test funkcji book_meeting_poll_slots na czystym PostgreSQL (psql -v ON_ERROR_STOP=1 -f ...). · obj: pg_temp, auth, meeting_polls
- `rls_enabled.test.sql` – Każda tabela w schemacie public ma włączone RLS (poza publicznym rozkładem przystanków), a rola anon nie ma dostępu do tabel poza wizytówkami.

## types

- `bills.ts`
- `connectedCalendars.ts`
- `events.ts`
- `finance.ts` – Finanse (od 1.40): profile, rachunki stałe (zaplanowane, z regułą powtarzania) i transakcje (faktyczne wpływy/wydatki).
- `googleCalendar.ts`
- `habits.ts` – Nawyk zdefiniowany przez użytkownika (max 8). 'id' dawnych nawyków = ich HabitKey.
- `letters.ts` – exp: LETTER_CATEGORIES, CATEGORY_CODE_MAP, RESPONSE_DAYS_MAP
- `meetingPolls.ts` – availability – uczestnicy zaznaczają, kiedy mogą; signup – zapisują się na terminy z ograniczoną liczbą miejsc. · exp: MEETING_POLL_SLOT_DURATIONS
- `moods.ts`
- `movies.ts` – Wynik /search/multi – filmy mają 'title', seriale 'name'. · exp: MEDIA_TYPE_LABELS
- `notes.ts`
- `outlookCalendar.ts`
- `people.ts`
- `pkpplk.ts`
- `profiles.ts`
- `recipes.ts` – Jedyne źródło prawdy dla kategorii przepisów. Wartości muszą być zgodne z enumem 'public.recipe_category' w bazie (patrz migracja… · exp: RECIPE_CATEGORIES, DEFAULT_RECIPE_CATEGORY, isRecipeCategory
- `reports.ts` – Rola czcionki w szablonie protokołu.
- `schemas.ts`
- `settings.ts`
- `shopping.ts`
- `streaks.ts`
- `tasks.ts`
- `toasts.ts`
- `transport.ts`
- `weather.ts`
- `worklogs.ts`

