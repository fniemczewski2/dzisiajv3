// config/features.ts

import {
  Backpack,
  Mail,
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
  NotebookPen,
  Newspaper,
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

export type FeatureCategory = "Zadania" | "Spotkania" | "Notatki" | "Finanse" | "Wyjścia i wyjazdy" | "Osobiste";

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
        description:
          "Oś czasu 06:00–23:00 z zadaniami, wydarzeniami, rutynami i pociągami. Przeciągasz zadanie na godzinę, a plan układa się sam.",
        icon: LayoutDashboard,
        path: "/",
        guideId: "dashboard",
      },
      {
        title: "Zadania",
        description:
          "Priorytety, terminy, kategorie i filtry. Zadania od zaufanych osób przyjmujesz jednym kliknięciem.",
        icon: ListTodo,
        path: "/tasks",
        guideId: "tasks_list",
        status: "zmienione",
        note: "Rozbudowane powtarzanie (dni tygodnia, „ostatni piątek”), przypomnienia push i lista Slack zamiast kategorii.",
        since: "1.40.0",
      },
      {
        title: "Plan dnia",
        description:
          "Schematy powtarzalnych dni, które same trafiają do kokpitu, np. osobny plan na dni robocze i weekend.",
        icon: Logs,
        path: "/tasks/daySchema",
        guideId: "day_schema",
        status: "zmienione",
        note: "Kilka schematów na ten sam dzień: jeden domyślny, inny wybierzesz na planie dnia.",
        since: "1.40.0",
      },
      {
        title: "Szybkie notatki",
        description:
          "Punkty na górze planu dnia, dodawane w aplikacji albo Skrótem z iPhone'a. Każdy punkt zamienisz jednym dotknięciem w zadanie lub wydarzenie.",
        icon: NotebookPen,
        path: "/",
        guideId: "dashboard",
        status: "nowe",
        since: "1.39.0",
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
        description:
          "Dwukierunkowa synchronizacja zadań z listami Slack. Wybierasz listę domyślną i dopasowujesz kolumny do pól zadania.",
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
        description:
          "Wydarzenia z Google Calendar i Outlooka (Microsoft 365); edycja i usunięcie wydarzeń powiązanych trafia też do kalendarza zewnętrznego.",
        icon: Calendar,
        path: "/calendar",
        guideId: "calendar",
        status: "zmienione",
        note: "Rozbudowane powtarzanie, dodawanie wielu wydarzeń z wklejonej listy i przypomnienie o biletach przed podróżą.",
        since: "1.40.0",
      },
      {
        title: "Terminy zespołowe",
        description:
          "Ankieta terminu z siatką dostępności. Link działa bez konta, a wybrany termin trafia do kalendarzy uczestników.",
        icon: CalendarClock,
        path: "/meetings",
        guideId: "meetings",
        status: "zmienione",
        note: "Podgląd dostępności jednej osoby, podpowiedzi najlepszych terminów i przebudowana lista ankiet.",
      },
      {
        title: "Protokoły",
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
        description: "Do pięciu list jednocześnie. Zmiany na udostępnionej liście widać u drugiej osoby na żywo.",
        icon: ShoppingCart,
        path: "/notes/shopping",
        guideId: "shopping",
      },
      {
        title: "Przepisy",
        description:
          "Książka kucharska z kategoriami, podpowiedziami składników i filtrem, który znajdzie danie z tego, co masz.",
        icon: CookingPot,
        path: "/notes/recipes",
        guideId: "recipes",
      },
      {
        title: "Filmy i seriale",
        description:
          "Katalog z bazą TMDB i dostępnością w polskich serwisach VOD. Przy serialach śledzisz sezon i odcinek.",
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
        title: "Finanse",
        description:
          "Rachunki stałe z terminami (zadanie „Zapłać” w dniu płatności) i miesięczne podsumowanie wydatków z importem wyciągów CSV.",
        icon: Coins,
        path: "/bills",
        guideId: "bills",
        status: "zmienione",
        note: "Automatyczne łączenie płatności z rachunkami, prognoza na kolejny miesiąc i do 5 profili finansowych.",
        since: "1.40.0",
      },
      {
        title: "Budżet roczny",
        description: "Limity kategorii, wykonanie z transakcji i zaplanowane rachunki w każdym miesiącu.",
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
      {
        title: "Poczta",
        description:
          "Konta Gmail i Outlook albo przekierowanie poczty: odczyt, odpowiedź po potwierdzeniu, zadanie i wydarzenie z wiadomości.",
        icon: Mail,
        path: "/mail",
        guideId: "mail",
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
        description:
          "Śledzenie pociągów PKP z opóźnieniem na żywo. Bilet PDF wypełnia formularz, a pociąg pojawia się w planie dnia.",
        icon: TrainFront,
        path: "/trains",
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
        description:
          "Gotowe checklisty: codzienny plecak, walizka na wyjazd i plecak bezpieczeństwa na sytuacje kryzysowe.",
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
        description: "Do 8 własnych nawyków z nazwą i ikoną, tracker wody i nastroju prosto z kokpitu.",
        icon: HeartPulse,
        path: "/",
        guideId: "habits",
        status: "zmienione",
        note: "Własne nawyki zamiast stałej ósemki.",
        since: "1.40.0",
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
        title: "Wiadomości",
        description:
          "Czytnik RSS: wybierasz źródła (Poznań, NGO i granty, kolej, klimat, prawa człowieka, technologia) i dodajesz własne kanały.",
        icon: Newspaper,
        path: "/news",
        status: "nowe",
        since: "1.41.0",
      },
      {
        title: "Pisma",
        description:
          "Rejestr pism urzędowych z automatyczną sygnaturą, załącznikami i pilnowaniem ustawowych terminów odpowiedzi.",
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

export const getFeaturesWithStatus = (): (Feature & { category: FeatureCategory })[] =>
  FEATURE_GROUPS.flatMap((group) =>
    group.features.filter((f) => f.status).map((f) => ({ ...f, category: group.category }))
  );
