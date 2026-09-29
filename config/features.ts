// config/features.ts

import {
  Backpack,
  Bell,
  BusFront,
  Calculator,
  Calendar,
  CalendarClock,
  ChartColumnBig,
  Clapperboard,
  Clock,
  Coins,
  CookingPot,
  Dumbbell,
  Edit2,
  Gavel,
  HeartPulse,
  IdCard,
  LayoutDashboard,
  ListTodo,
  Logs,
  MessageSquareShare,
  ScrollText,
  ShoppingCart,
  Sun,
  Target,
  Timer,
  TrainFront,
  User,
  type LucideIcon,
} from "lucide-react";

export type FeatureStatus = "nowe" | "zmienione";

export type FeatureCategory =
  | "Zadania"
  | "Spotkania"
  | "Notatki"
  | "Finanse"
  | "Wyjścia i wyjazdy"
  | "Osobiste";

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  path?: string;
  guideId?: string;
  status?: FeatureStatus;
  /** Jedno zdanie o tym, co się zmieniło – pokazywane przy oznaczeniu. */
  note?: string;
  since?: string;
}

export interface FeatureGroup {
  category: FeatureCategory;
  summary: string;
  features: Feature[];
}

export const FEATURE_STATUS_LABEL: Record<FeatureStatus, string> = {
  nowe: "Nowość",
  zmienione: "Zmiana",
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    category: "Zadania",
    summary: "Plan dnia i praca w skupieniu",
    features: [
      {
        title: "Kokpit dnia",
        description: "Oś czasu 06:00–23:00 z zadaniami, wydarzeniami, rutynami i pociągami. Przeciągasz zadanie na godzinę, a plan układa się sam.",
        icon: LayoutDashboard,
        path: "/",
        guideId: "dashboard",
      },
      {
        title: "Zadania",
        description: "Priorytety, terminy, kategorie i filtry. Zadania od zaufanych osób przyjmujesz jednym kliknięciem.",
        icon: ListTodo,
        path: "/tasks",
        guideId: "tasks_list",
      },
      {
        title: "Plan dnia",
        description: "Schematy powtarzalnych dni, które same trafiają do kokpitu, np. osobny plan na dni robocze i weekend.",
        icon: Logs,
        path: "/tasks/daySchema",
        guideId: "day_schema",
      },
      {
        title: "Pomodoro",
        description: "Konfigurowalny timer pracy i przerw z sygnałem dźwiękowym. Ekran nie gaśnie w trakcie sesji.",
        icon: Timer,
        path: "/tasks/pomodoro",
        guideId: "pomodoro",
      },
      {
        title: "Listy Slack",
        description: "Dwukierunkowa synchronizacja zadań z listami Slack. Wybierasz listę domyślną i dopasowujesz kolumny do pól zadania.",
        icon: MessageSquareShare,
        path: "/settings",
        guideId: "slack",
        status: "nowe",
        since: "1.37.0",
      },
    ],
  },
  {
    category: "Spotkania",
    summary: "Kalendarz, ludzie i ustalenia",
    features: [
      {
        title: "Kalendarz",
        description: "Wydarzenia z dwukierunkową synchronizacją z Google Calendar i Outlookiem (Microsoft 365).",
        icon: Calendar,
        path: "/calendar",
        guideId: "calendar",
      },
      {
        title: "Terminy zespołowe",
        description: "Ankieta terminu z siatką dostępności. Link działa bez konta, a wybrany termin trafia do kalendarzy uczestników.",
        icon: CalendarClock,
        path: "/meetings",
        guideId: "meetings",
        status: "zmienione",
        note: "Podgląd dostępności jednej osoby, podpowiedzi najlepszych terminów i przebudowana lista ankiet.",
      },
      {
        title: "Sprawozdania",
        description: "Protokół spotkania z agendą, uczestnikami i zadaniami do wykonania, gotowy do eksportu w PDF.",
        icon: ScrollText,
        path: "/notes/reports",
        guideId: "reports",
      },
      {
        title: "Osoby i relacje",
        description: "Kontakty z priorytetem przypominania o kontakcie, kodem QR, vCard oraz importem i eksportem CSV.",
        icon: User,
        path: "/people",
        guideId: "people",
      },
      {
        title: "Przypomnienia",
        description: "Zadania cykliczne i powiadomienia push o urodzinach, imieninach oraz kontakcie z bliskimi.",
        icon: Bell,
        path: "/tasks",
        guideId: "reminders",
      },
    ],
  },
  {
    category: "Notatki",
    summary: "Zapiski, listy i kuchnia",
    features: [
      {
        title: "Notatki",
        description: "Szybkie zapiski z kolorami, przypinaniem i archiwum. Proste formatowanie i klikalne linki.",
        icon: Edit2,
        path: "/notes",
        guideId: "notes",
        status: "zmienione",
        note: "Nowy pasek formatowania i automatyczne linki w treści.",
        since: "1.37.16",
      },
      {
        title: "Listy zakupów",
        description: "Do pięciu list jednocześnie. Udostępniona lista zmienia się u wszystkich w czasie rzeczywistym.",
        icon: ShoppingCart,
        path: "/notes/shopping",
        guideId: "shopping",
      },
      {
        title: "Przepisy",
        description: "Książka kucharska z kategoriami, podpowiedziami składników i filtrem, który znajdzie danie z tego, co masz.",
        icon: CookingPot,
        path: "/notes/recipes",
        guideId: "recipes",
      },
      {
        title: "Filmy i seriale",
        description: "Katalog z bazą TMDB i dostępnością w polskich serwisach VOD. Przy serialach śledzisz sezon i odcinek.",
        icon: Clapperboard,
        path: "/notes/movies",
        guideId: "movies",
        status: "nowe",
        note: "Seriale: sezony, status emisji i postęp oglądania.",
        since: "1.38.0",
      },
    ],
  },
  {
    category: "Finanse",
    summary: "Wydatki, budżet i czas pracy",
    features: [
      {
        title: "Rachunki",
        description: "Wydatki i wpływy z kategoriami oraz import wyciągów CSV z mBanku i PKO BP z automatycznymi kategoriami.",
        icon: Coins,
        path: "/bills",
        guideId: "bills",
        status: "zmienione",
        note: "Przed importem CSV widzisz, do jakich kategorii trafią operacje.",
      },
      {
        title: "Budżet roczny",
        description: "Plan i wykonanie w każdym miesiącu oraz przeliczenie wydatków na godziny pracy.",
        icon: ChartColumnBig,
        path: "/bills/budget",
        guideId: "budget",
      },
      {
        title: "Kalkulator rachunków",
        description: "Sprawiedliwy podział wspólnych kosztów według dochodów, z obsługą EUR i kursem NBP.",
        icon: Calculator,
        path: "/bills/calculator",
        guideId: "calculator",
      },
      {
        title: "Czas pracy",
        description: "Godziny pracy wpisywane ręcznie lub automatycznie przez Skróty na iPhonie, z sumą za miesiąc.",
        icon: Clock,
        path: "/worklogs",
        guideId: "worklogs",
      },
    ],
  },
  {
    category: "Wyjścia i wyjazdy",
    summary: "W drodze i przed wyjściem",
    features: [
      {
        title: "Transport miejski",
        description: "Odjazdy na żywo z przystanków w pobliżu i ulubionych w Poznaniu i Szczecinie.",
        icon: BusFront,
        path: "/transport",
        guideId: "transport",
        status: "zmienione",
        note: "Przystanki rozróżniane po miejscowości, a lokalizacja nie jest pobierana przy każdym wejściu.",
        since: "1.38.0",
      },
      {
        title: "Pociągi",
        description: "Śledzenie pociągów PKP z opóźnieniem na żywo. Bilet PDF wypełnia formularz, a pociąg pojawia się w planie dnia.",
        icon: TrainFront,
        path: "/transport",
        guideId: "trains",
        status: "zmienione",
        note: "Po odczycie biletu widać, których pól nie rozpoznano.",
      },
      {
        title: "Pogoda",
        description: "Prognoza godzinowa i 5-dniowa, jakość powietrza i autorski wskaźnik samopoczucia.",
        icon: Sun,
        path: "/weather",
        guideId: "weather",
      },
      {
        title: "Listy pakowania",
        description: "Gotowe checklisty: codzienny plecak, walizka na wyjazd i plecak bezpieczeństwa na sytuacje kryzysowe.",
        icon: Backpack,
        path: "/packing",
        guideId: "packing",
      },
    ],
  },
  {
    category: "Osobiste",
    summary: "Zdrowie, nawyki i sprawy urzędowe",
    features: [
      {
        title: "Nawyki i nastrój",
        description: "Codzienne nawyki, tracker wody i nastroju prosto z kokpitu, bez przechodzenia między ekranami.",
        icon: HeartPulse,
        path: "/",
        guideId: "habits",
      },
      {
        title: "Postępy",
        description: "Serie dni (streaks) z kamieniami milowymi, które pomagają utrzymać dyscyplinę.",
        icon: Target,
        path: "/streaks",
        guideId: "streaks",
      },
      {
        title: "Trening interwałowy",
        description: "Timer HIIT i Tabata z konfigurowalnymi fazami i niegasnącym ekranem.",
        icon: Dumbbell,
        path: "/training",
        guideId: "training",
      },
      {
        title: "Pisma",
        description: "Rejestr pism urzędowych z automatyczną sygnaturą, załącznikami i pilnowaniem ustawowych terminów odpowiedzi.",
        icon: Gavel,
        path: "/notes/letters",
        guideId: "letters",
        status: "nowe",
        since: "1.35.0",
      },
      {
        title: "Cyfrowa wizytówka",
        description: "Wizytówka z kodem QR i publicznym linkiem, który otworzy każdy, także bez konta.",
        icon: IdCard,
        path: "/profiles",
        guideId: "profiles",
      },
    ],
  },
];

export const features: Feature[] = FEATURE_GROUPS.flatMap((group) => group.features);

export const getFeaturesWithStatus = (): (Feature & { category: FeatureCategory })[] =>
  FEATURE_GROUPS.flatMap((group) =>
    group.features.filter((f) => f.status).map((f) => ({ ...f, category: group.category }))
  );
