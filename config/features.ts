// config/features.ts
import { 
  Backpack, 
  Bell, 
  Brain, 
  Calendar, 
  ChartColumnBig, 
  CheckCircle, 
  Clapperboard,
  Clock, 
  Coins, 
  CookingPot, 
  Dumbbell, 
  FileText, 
  ListTodo, 
  Logs,
  Luggage, 
  MapPin,
  Pen, 
  Settings, 
  Shield, 
  ShoppingCart, 
  Star, 
  Sun, 
  Table2,
  Target,
  Timer, 
  UsersRound,
  LucideIcon
} from "lucide-react";

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  category?: FeatureCategory;
  path?: string; // Opcjonalna ścieżka do funkcji
  badge?: "Nowe" | "Beta" | "Popularne"; // Opcjonalne odznaki
  comingSoon?: boolean; // Czy funkcja jest w planach
}

export type FeatureCategory = 
  | "Produktywność"
  | "Organizacja"
  | "Finanse"
  | "Styl życia"
  | "Rozrywka"
  | "Narzędzia";

export interface FeatureGroup {
  category: FeatureCategory;
  color: string;
  features: Feature[];
}

// Wszystkie funkcje pogrupowane w kategorie
export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    category: "Produktywność",
    color: "blue",
    features: [
      {
        title: "Zadania",
        description: "Organizuj zadania z\u00A0priorytetami, datami i\u00A0kategoriami. Filtruj i\u00A0sortuj.",
        icon: ListTodo,
        category: "Produktywność",
        path: "/tasks",
        badge: "Popularne",
      },
      {
        title: "Pomodoro",
        description: "Zwiększ produktywność z\u00A0techniką Pomodoro i\u00A0timerem.",
        icon: Timer,
        category: "Produktywność",
        path: "/tasks/pomodoro",
      },
      {
        title: "Eisenhower",
        description: "Priorytetyzuj zadania z\u00A0macierzą Eisenhowera (pilne/ważne).",
        icon: Brain,
        category: "Produktywność",
        path: "/tasks/eisenhower",
      },
      {
        title: "Kanban",
        description: "Zarządzaj zadaniami metodą Kanban z\u00A0kolumnami statusów.",
        icon: Table2,
        category: "Produktywność",
        path: "/tasks/kanban",
      },
      {
        title: "Harmonogram Dnia",
        description: "Zadbaj o\u00A0regularność, stwórz własny plan dnia.",
        icon: Logs,
        category: "Produktywność",
        path: "/tasks/daySchema",
      },
    ],
  },
  {
    category: "Organizacja",
    color: "purple",
    features: [
      {
        title: "Kalendarz",
        description: "Planuj wydarzenia, spotkania i\u00A0terminy. Eksportuj jako .ics.",
        icon: Calendar,
        category: "Organizacja",
        path: "/calendar",
        badge: "Popularne",
      },
      {
        title: "Notatki",
        description: "Twórz notatki, listy zakupów, przepisy i\u00A0plany podróży.",
        icon: Pen,
        category: "Organizacja",
        path: "/notes",
      },
      {
        title: "Sprawozdania",
        description: "Twórz sprawozdania ze\u00A0spotkań z\u00A0agendą, uczestnikami i\u00A0zadaniami.",
        icon: FileText,
        category: "Organizacja",
        path: "/notes/reports",
      },
      {
        title: "Przypomnienia",
        description: "Ustaw cykliczne przypomnienia o\u00A0ważnych rzeczach.",
        icon: Bell,
        category: "Organizacja",
        badge: "Nowe",
      },
      {
        title: "Plecak",
        description: "Autorska lista wyposażenia plecaka lub torebki.",
        icon: Backpack,
        category: "Organizacja",
        path: "/packing/backpack",
      },
      {
        title: "Walizka Podróżna",
        description: "Uniwersalna lista rzeczy na\u00A0wyjazd: odzież, dokumenty, elektronika.",
        icon: Luggage,
        category: "Organizacja",
        path: "/packing/suitcase",
      },
      {
        title: "Plecak Bezpieczeństwa",
        description: "Pełna lista niezbędnych rzeczy na\u00A0wypadek kryzysu.",
        icon: Shield,
        category: "Organizacja",
        path: "/packing/safety",
      },
    ],
  },
  {
    category: "Finanse",
    color: "yellow",
    features: [
      {
        title: "Rachunki",
        description: "Monitoruj swoje wydatki, planuj budżet i\u00A0śledź statystyki.",
        icon: Coins,
        category: "Finanse",
        path: "/bills",
        badge: "Popularne",
      },
      {
        title: "Budżet Roczny",
        description: "Analizuj wydatki i\u00A0przychody miesięczne. Obliczaj godziny pracy.",
        icon: ChartColumnBig,
        category: "Finanse",
        path: "/bills/budget",
      },
      {
        title: "Listy Zakupów",
        description: "Twórz i\u00A0udostępniaj listy zakupów z\u00A0możliwością odznaczania.",
        icon: ShoppingCart,
        category: "Finanse",
        path: "/notes/shopping",
      },
      {
        title: "Przepisy",
        description: "Zarządzaj przepisami kulinarnymi z\u00A0listą produktów i\u00A0kategoryzacją.",
        icon: CookingPot,
        category: "Finanse",
        path: "/notes/recipes",
      },
    ],
  },
  {
    category: "Styl życia",
    color: "green",
    features: [
      {
        title: "Nawyki",
        description: "Śledź codzienne nawyki: tabletki, trening, woda i\u00A0więcej.",
        icon: CheckCircle,
        category: "Styl życia",
        badge: "Popularne",
      },
      {
        title: "Cele",
        description: "Wyznaczaj i\u00A0śledź długoterminowe cele z\u00A0seriami dni.",
        icon: Target,
        category: "Styl życia",
        path: "/streaks",
        badge: "Nowe",
      },
      {
        title: "Trening",
        description: "Planuj treningi, zapisuj ćwiczenia i\u00A0śledź swoje postępy.",
        icon: Dumbbell,
        category: "Styl życia",
        path: "/training",
      },
      {
        title: "Pogoda",
        description: "Sprawdzaj aktualną pogodę i\u00A0prognozę dla swojej lokalizacji.",
        icon: Sun,
        category: "Styl życia",
        path: "/weather",
      },
    ],
  },
  {
    category: "Rozrywka",
    color: "pink",
    features: [
      {
        title: "Miejsca",
        description: "Zapisuj i\u00A0kataloguj ciekawe miejsca z\u00A0mapą i\u00A0tagami.",
        icon: MapPin,
        category: "Rozrywka",
        path: "/notes/places",
      },
      {
        title: "Filmy",
        description: "Twórz listy filmów do obejrzenia i\u00A0już obejrzanych.",
        icon: Clapperboard,
        category: "Rozrywka",
        path: "/notes/movies",
      },
    ],
  },
  {
    category: "Narzędzia",
    color: "gray",
    features: [
      {
        title: "Udostępnianie",
        description: "Udostępniaj zadania, wydarzenia i\u00A0listy innym użytkownikom.",
        icon: UsersRound,
        category: "Narzędzia",
        badge: "Beta",
      },
      {
        title: "Ustawienia",
        description: "Dostosuj preferencje aplikacji do\u00A0swoich potrzeb.",
        icon: Settings,
        category: "Narzędzia",
        path: "/settings",
      },
    ],
  },
];

// Płaska lista wszystkich funkcji (dla kompatybilności wstecznej)
export const features: Feature[] = FEATURE_GROUPS.flatMap(group => group.features);

// Dodaj na końcu placeholder dla nowych funkcji
features.push({
  title: "Wiele więcej...",
  description: "Aplikacja jest rozwijana i\u00A0pojawiają się nowe funkcje.",
  icon: Star,
  category: "Narzędzia",
});

// Helper functions
export const getFeaturesByCategory = (category: FeatureCategory): Feature[] => {
  return features.filter(feature => feature.category === category);
};

export const getPopularFeatures = (): Feature[] => {
  return features.filter(feature => feature.badge === "Popularne");
};

export const getNewFeatures = (): Feature[] => {
  return features.filter(feature => feature.badge === "Nowe");
};

export const getFeatureByTitle = (title: string): Feature | undefined => {
  return features.find(feature => feature.title === title);
};

// Statystyki funkcji
export const featureStats = {
  total: features.length - 1, // Minus "Wiele więcej..."
  byCategory: FEATURE_GROUPS.reduce((acc, group) => {
    acc[group.category] = group.features.length;
    return acc;
  }, {} as Record<FeatureCategory, number>),
  popular: getPopularFeatures().length,
  new: getNewFeatures().length,
};