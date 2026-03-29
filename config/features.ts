// config/features.ts
import { 
  Backpack, 
  Bell, 
  Calendar, 
  ChartColumnBig, 
  CheckCircle, 
  Clapperboard,
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
  Target,
  Timer, 
  UsersRound,
  Calculator,
  Bus,
  LucideIcon
} from "lucide-react";

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  category?: FeatureCategory;
  path?: string; 
  badge?: "Nowe" | "Beta" | "Popularne"; 
  comingSoon?: boolean; 
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

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    category: "Produktywność",
    color: "blue",
    features: [
      {
        title: "Zadania",
        description: "Organizuj zadania z priorytetami i datami. Przeciągaj je bezpośrednio na oś czasu (Drag & Drop).",
        icon: ListTodo,
        category: "Produktywność",
        path: "/tasks",
        badge: "Popularne",
      },
      {
        title: "Pomodoro",
        description: "Zwiększ produktywność pracując w pełnym skupieniu z wbudowanym timerem Pomodoro.",
        icon: Timer,
        category: "Produktywność",
        path: "/tasks/pomodoro",
      },
      {
        title: "Harmonogram Dnia",
        description: "Automatyzuj swoje rutyny. Twórz schematy dni, które same pojawią się w Twoim planie.",
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
        description: "Planuj wydarzenia z pełną dwukierunkową synchronizacją z Google Calendar.",
        icon: Calendar,
        category: "Organizacja",
        path: "/calendar",
        badge: "Popularne",
      },
      {
        title: "Notatki",
        description: "Twórz szybkie zapiski listowe, oznaczaj je kolorami i buduj swoją bazę wiedzy.",
        icon: Pen,
        category: "Organizacja",
        path: "/notes",
      },
      {
        title: "Sprawozdania",
        description: "Protokołuj spotkania z agendą i uczestnikami, a na koniec eksportuj je do PDF.",
        icon: FileText,
        category: "Organizacja",
        path: "/notes/reports",
      },
      {
        title: "Przypomnienia",
        description: "Ustaw cykliczne przypomnienia, które automatycznie zamienią się w zadania we właściwym czasie.",
        icon: Bell,
        category: "Organizacja",
        badge: "Nowe",
      },
      {
        title: "Plecak",
        description: "Autorska lista wyposażenia plecaka lub torebki (codzienne EDC).",
        icon: Backpack,
        category: "Organizacja",
        path: "/packing/backpack",
      },
      {
        title: "Walizka Podróżna",
        description: "Inteligentna lista rzeczy na wyjazd. Podzielona na kategorie pakowania.",
        icon: Luggage,
        category: "Organizacja",
        path: "/packing/suitcase",
      },
      {
        title: "Plecak Bezpieczeństwa",
        description: "Pełna gotowa lista niezbędnych rzeczy na wypadek kryzysu lub ewakuacji.",
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
        description: "Monitoruj swoje wydatki, odznaczaj opłacone faktury i miej pełną kontrolę nad budżetem.",
        icon: Coins,
        category: "Finanse",
        path: "/bills",
        badge: "Popularne",
      },
      {
        title: "Budżet Roczny",
        description: "Analizuj wydatki i zarządzaj kategoriami. Importuj wyciągi CSV z mBanku i PKO BP.",
        icon: ChartColumnBig,
        category: "Finanse",
        path: "/bills/budget",
      },
      {
        title: "Kalkulator Rachunków",
        description: "Sprawiedliwie podziel koszty życia z partnerem na podstawie dochodów (Algorytm hybrydowy).",
        icon: Calculator,
        category: "Finanse",
        path: "/bills/calculator",
        badge: "Nowe",
      },
      {
        title: "Listy Zakupów",
        description: "Twórz listy zakupów z możliwością odznaczania w czasie rzeczywistym z bliskimi.",
        icon: ShoppingCart,
        category: "Finanse",
        path: "/notes/shopping",
      },
      {
        title: "Przepisy",
        description: "Książka kucharska z inteligentnym filtrowaniem po dodanych składnikach.",
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
        description: "Śledź codzienne nawyki: leki, higiena cyfrowa, tracker wody i śledzenie nastroju.",
        icon: CheckCircle,
        category: "Styl życia",
        badge: "Popularne",
      },
      {
        title: "Cele i Pasma",
        description: "Utrzymuj dyscyplinę (streaks). Algorytm pogratuluje Ci okrągłych kamieni milowych.",
        icon: Target,
        category: "Styl życia",
        path: "/streaks",
      },
      {
        title: "Trening Interwałowy",
        description: "Zaawansowany stoper do treningów HIIT / Tabata z funkcją Wake-Lock.",
        icon: Dumbbell,
        category: "Styl życia",
        path: "/training",
      },
      {
        title: "Pogoda",
        description: "Godzinowe prognozy pogody i autorski wskaźnik samopoczucia z alertami Smogowymi.",
        icon: Sun,
        category: "Styl życia",
        path: "/weather",
      },
      {
        title: "Transport Miejski",
        description: "Tablice odjazdów autobusów i tramwajów na żywo. Odczyt po GPS lub ulubione.",
        icon: Bus,
        category: "Styl życia",
        path: "/transport",
        badge: "Nowe",
      },
    ],
  },
  {
    category: "Rozrywka",
    color: "pink",
    features: [
      {
        title: "Miejsca i Mapa",
        description: "Importuj miejsca z Google Maps. Przeglądaj je na mapie i filtruj po godzinach otwarcia.",
        icon: MapPin,
        category: "Rozrywka",
        path: "/notes/places",
      },
      {
        title: "Filmy i Seriale",
        description: "Kataloguj produkcje integrując się z bazą TMDB. Sprawdzaj dostępność VOD (Netflix, HBO).",
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
        description: "Zbuduj listę Zaufanych Użytkowników by współdzielić z nimi zadania, kalendarz i listy.",
        icon: UsersRound,
        category: "Narzędzia",
        badge: "Beta",
      },
      {
        title: "Ustawienia Systemowe",
        description: "Zarządzaj powiadomieniami Push, motywami oraz bazą danych na swoim koncie PWA.",
        icon: Settings,
        category: "Narzędzia",
        path: "/settings",
      },
    ],
  },
];

export const features: Feature[] = FEATURE_GROUPS.flatMap(group => group.features);

features.push({
  title: "Wiele więcej...",
  description: "Aplikacja stale się rozwija, regularnie dodajemy nowe, innowacyjne funkcje.",
  icon: Star,
  category: "Narzędzia",
});

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

export const featureStats = {
  total: features.length - 1, 
  byCategory: FEATURE_GROUPS.reduce((acc, group) => {
    acc[group.category] = group.features.length;
    return acc;
  }, {} as Record<FeatureCategory, number>),
  popular: getPopularFeatures().length,
  new: getNewFeatures().length,
};