// config/navigation.ts
import {
  ListTodo,
  Logs,
  Timer,
  Edit2,
  Backpack,
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
  Gavel,
  CalendarClock,
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
    name: "Zadania",
    items: [
      {path: "/", title: "Dzisiaj", icon: LayoutDashboard, label: "Dzisiaj" },
      { path: "/tasks/daySchema", title: "Plan dnia", icon: Logs, label: "Plan\u00a0dnia" },
      { path: "/tasks", title: "Zadania", icon: ListTodo, label: "Zadania" },
      { path: "/tasks/pomodoro", title: "Pomodoro", icon: Timer, label: "Pomodoro" },
    ],
  },
  {
    name: "Spotkania",
    items: [
      { path: "/calendar", title: "Kalendarz", icon: Calendar, label: "Kalendarz" },
      { path: "/meetings", title: "Terminy zespołowe", icon: CalendarClock, label: "Terminy" },
      { path: "/notes/reports", title: "Sprawozdanie", icon: ScrollText, label: "Sprawozdanie" },
      { path: "/people", title: "Ludzie", icon: User, label: "Ludzie" },
    ]
  },
  {
    name: "Notatki",
    items: [
      { path: "/notes", title: "Notatki", icon: Edit2, label: "Notatki" },
      { path: "/notes/shopping", title: "Zakupy", icon: ShoppingCart, label: "Zakupy" },
      { path: "/notes/recipes", title: "Przepisy", icon: CookingPot, label: "Przepisy" },   
      { path: "/notes/movies", title: "Filmy", icon: Clapperboard, label: "Filmy" },
    
    ],
  },
  {
    name: "Finanse",
    items: [
      { path: "/bills", title: "Finanse", icon: Coins, label: "Finanse" },
      { path: "/bills/budget", title: "Budżet", icon: ChartColumnBig, label: "Budżet" },
      { path: "/bills/calculator", title: "Kalkulator", icon: Calculator, label: "Kalkulator" },
      { path: "/worklogs", title: "Czas pracy", icon: Clock, label: "Czas\u00a0pracy" },
    ],
  },
  { name: "Wyjścia i wyjazdy",
    items: [
      { path: "/packing", title: "Pakowanie", icon: Backpack, label: "Pakowanie" },
      {path: "/transport", title: "Transport", icon: BusFront, label: "Transport" },
      { path: "/notes/places", title: "Miejsca", icon: MapPin, label: "Miejsca" },
      { path: "/weather", title: "Pogoda", icon: Sun, label: "Pogoda" },
    ],
  },
  {
    name: "Osobiste",
    items: [
      { path: "/profiles", title: "Wizytówka", icon: IdCard, label: "Wizytówka" },
      { path: "/training", title: "Trening", icon: Dumbbell, label: "Trening" },
      { path: "/streaks", title: "Cele", icon: Target, label: "Cele" },
      { path: "/notes/letters", title: "Pisma", icon: Gavel, label: "Pisma" },
    ]
  }
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