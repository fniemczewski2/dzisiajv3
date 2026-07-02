// config/navigation.ts
import {
  ListTodo,
  Logs,
  Timer,
  Edit2,
  Backpack,
  Luggage,
  Siren,
  Calendar,
  ScrollText,
  Sun,
  Dumbbell,
  Coins,
  ChartColumnBig,
  CookingPot,
  ShoppingCart,
  LucideIcon,
  MapPin,
  Target,
  Clapperboard,
  Calculator,
  LayoutDashboard,
  BusFront,
  User,
  IdCard,
  Clock,
} from "lucide-react";

export interface NavigationButton {
  path: string;
  title: string;
  icon: LucideIcon;
  label: string;
  badge?: string; 
  external?: boolean; 
}

export interface NavigationCategory {
  name: string;
  items: NavigationButton[];
  color?: string; 
}

export const NAVIGATION_CATEGORIES: NavigationCategory[] = [
  {
    name: "Zadania i Produktywność",
    items: [
      {path: "/", title: "Dzisiaj", icon: LayoutDashboard, label: "Dzisiaj" },
      { path: "/tasks/daySchema", title: "Plan dnia", icon: Logs, label: "Plan\u00a0dnia" },
      { path: "/tasks", title: "Zadania", icon: ListTodo, label: "Zadania" },
      { path: "/tasks/pomodoro", title: "Pomodoro", icon: Timer, label: "Pomodoro" },
      { path: "/worklogs", title: "Czas pracy", icon: Clock, label: "Czas\u00a0pracy" },
     
    ],
  },
  {
    name: "Notatki i planowanie",
    items: [
      { path: "/calendar", title: "Kalendarz", icon: Calendar, label: "Kalendarz" },
      { path: "/notes", title: "Notatki", icon: Edit2, label: "Notatki" },
      { path: "/notes/reports", title: "Sprawozdanie", icon: ScrollText, label: "Sprawozdanie" },
      { path: "/streaks", title: "Cele", icon: Target, label: "Cele" },
    
    ],
  },
    {
    name: "Finanse i Dom",
    items: [
      { path: "/bills", title: "Finanse", icon: Coins, label: "Finanse" },
      { path: "/bills/budget", title: "Budżet", icon: ChartColumnBig, label: "Budżet" },
      { path: "/bills/calculator", title: "Kalkulator", icon: Calculator, label: "Kalkulator" },
      { path: "/notes/shopping", title: "Zakupy", icon: ShoppingCart, label: "Zakupy" },
      { path: "/notes/recipes", title: "Przepisy", icon: CookingPot, label: "Przepisy" },
      
    ],
  },
  { name: "Wyjścia i wyjazdy",
    items: [
      { path: "/packing/backpack", title: "Plecak", icon: Backpack, label: "Plecak" },
      { path: "/packing/suitcase", title: "Walizka", icon: Luggage, label: "Walizka" },
      { path: "/packing/safety", title: "Plecak bezpieczeństwa", icon: Siren, label: "Safety" },
      {path: "/transport", title: "Transport", icon: BusFront, label: "Transport" },
      { path: "/notes/places", title: "Miejsca", icon: MapPin, label: "Miejsca" },
    ],
  },
  {
    name: "Rozrywka",
    items: [

      { path: "/training", title: "Trening", icon: Dumbbell, label: "Trening" },
      { path: "/notes/movies", title: "Filmy", icon: Clapperboard, label: "Filmy" },
      { path: "/weather", title: "Pogoda", icon: Sun, label: "Pogoda" },
      { path: "/people", title: "Ludzie", icon: User, label: "Ludzie" },
      { path: "/profiles", title: "Wizytówka", icon: IdCard, label: "Wizytówka" },
    ],
  },
];

export const QUICK_ACTIONS: NavigationButton[] = [
  { path: "/tasks?action=add", title: "Dodaj zadanie", icon: ListTodo, label: "Zadanie" },
  { path: "/notes?action=add", title: "Dodaj notatkę", icon: Edit2, label: "Notatka" },
  { path: "/bills?action=add", title: "Dodaj wydatek", icon: Coins, label: "Wydatek" },
  { path: "/calendar?action=add", title: "Dodaj wydarzenie", icon: Calendar, label: "Wydarzenie" },
];

export const getAllNavigationItems = (): NavigationButton[] => {
  return NAVIGATION_CATEGORIES.flatMap(category => category.items);
};

export const getNavigationItemByPath = (path: string): NavigationButton | undefined => {
  return getAllNavigationItems().find(item => item.path === path);
};

export const getCategoryByPath = (path: string): NavigationCategory | undefined => {
  return NAVIGATION_CATEGORIES.find(category => 
    category.items.some(item => item.path === path)
  );
};