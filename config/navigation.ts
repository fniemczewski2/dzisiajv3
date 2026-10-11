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
  Target,
  Clapperboard,
  Calculator,
  LayoutDashboard,
  BusFront,
  TrainFront,
  User,
  IdCard,
  Clock,
  Gavel,
  CalendarClock,
  Newspaper,
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
    name: "Produktywność",
    items: [
      { path: "/tasks/daySchema", title: "Plan dnia", icon: Logs, label: "Plan\u00a0dnia" },
      { path: "/tasks", title: "Zadania", icon: ListTodo, label: "Zadania" },
      { path: "/tasks/pomodoro", title: "Pomodoro", icon: Timer, label: "Pomodoro" },
      { path: "/worklogs", title: "Czas pracy", icon: Clock, label: "Czas\u00a0pracy" },
    ],
  },
  {
    name: "Spotkania i Kontakty",
    items: [
      { path: "/calendar", title: "Kalendarz", icon: Calendar, label: "Kalendarz" },
      { path: "/meetings", title: "Terminy", icon: CalendarClock, label: "Terminy" },
      { path: "/people", title: "Ludzie", icon: User, label: "Ludzie" },
      { path: "/profiles", title: "Wizytówki", icon: IdCard, label: "Wizytówki" },
    ]
  },
  {
    name: "Dokumenty i Teksty",
    items: [
      { path: "/notes", title: "Notatki", icon: Edit2, label: "Notatki" },
      { path: "/notes/reports", title: "Protokół", icon: ScrollText, label: "Protokół" },
      { path: "/notes/letters", title: "Pisma", icon: Gavel, label: "Pisma" },
      { path: "/news", title: "Wiadomości", icon: Newspaper, label: "Wiadomości" },
    ],
  },
  {
    name: "Finanse i Pomiary",
    items: [
      { path: "/bills", title: "Finanse", icon: Coins, label: "Finanse" },
      { path: "/bills/budget", title: "Budżet", icon: ChartColumnBig, label: "Budżet" },
      { path: "/bills/calculator", title: "Kalkulator", icon: Calculator, label: "Kalkulator" },
      { path: "/streaks", title: "Postępy", icon: Target, label: "Postępy" },
    ],
  },
  { 
    name: "Wyjazdy i Transport",
    items: [
      { path: "/weather", title: "Pogoda", icon: Sun, label: "Pogoda" },
      { path: "/transport", title: "Komunikacja miejska", icon: BusFront, label: "Komunikacja" },
      { path: "/trains", title: "Pociągi", icon: TrainFront, label: "Pociągi" },
      { path: "/packing", title: "Pakowanie", icon: Backpack, label: "Pakowanie" },
    ],
  },
  {
    name: "Życie Codzienne",
    items: [
      { path: "/notes/shopping", title: "Zakupy", icon: ShoppingCart, label: "Zakupy" },
      { path: "/notes/recipes", title: "Przepisy", icon: CookingPot, label: "Przepisy" },   
      { path: "/notes/movies", title: "Filmy", icon: Clapperboard, label: "Filmy" },
      { path: "/training", title: "Trening", icon: Dumbbell, label: "Trening" },
    ],
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
