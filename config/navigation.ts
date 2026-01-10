// config/navigation.ts
import {
  ListTodo,
  Logs,
  Timer,
  Brain,
  Table2,
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
} from "lucide-react";

export interface NavigationButton {
  path: string;
  title: string;
  icon: LucideIcon;
  label: string;
}

export const NAVIGATION_CONFIG: NavigationButton[][] = [
  // Zadania
  [
    { path: "/tasks", title: "Zadania", icon: ListTodo, label: "Zadania" },
    { path: "/tasks/daySchema", title: "Plan dnia", icon: Logs, label: "Plan dnia" },
    { path: "/tasks/pomodoro", title: "Pomodoro", icon: Timer, label: "Pomodoro" },
    { path: "/tasks/eisenhower", title: "Eisenhower Matrix", icon: Brain, label: "Eisenhower" },
    { path: "/tasks/kanban", title: "Kanban", icon: Table2, label: "Kanban" },
  ],
  // Notatki
  [
    { path: "/notes", title: "Notatki", icon: Edit2, label: "Notatki" },
    { path: "/notes/backpack", title: "Plecak", icon: Backpack, label: "Plecak" },
    { path: "/notes/suitcase", title: "Walizka", icon: Luggage, label: "Walizka" },
    { path: "/notes/safety", title: "Plecak ICE", icon: Siren, label: "Plecak ICE" },
  ],
  // Kalendarz i narzędzia
  [
    { path: "/calendar", title: "Kalendarz", icon: Calendar, label: "Kalendarz" },
    { path: "/reports", title: "Sprawozdanie", icon: ScrollText, label: "Sprawozdanie" },
    { path: "/weather", title: "Pogoda", icon: Sun, label: "Pogoda" },
    { path: "/training", title: "Trening", icon: Dumbbell, label: "Trening" },
    { path: "/streaks", title: "Cele", icon: Target, label: "Cele" },
  ],
  // Finanse i zakupy
  [
    { path: "/bills", title: "Finanse", icon: Coins, label: "Finanse" },
    { path: "/bills/budget", title: "Budżet", icon: ChartColumnBig, label: "Budżet" },
    { path: "/notes/recipes", title: "Przepisy", icon: CookingPot, label: "Przepisy" },
    { path: "/notes/shopping", title: "Zakupy", icon: ShoppingCart, label: "Zakupy" },
    { path: "/places", title: "Miejsca", icon: MapPin, label: "Miejsca" },
  ],
];
