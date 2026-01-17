// config/features.ts
import { 
  Backpack, 
  Bell, 
  Brain, 
  Calendar, 
  ChartColumnBig, 
  CheckCircle, 
  Clock, 
  Coins, 
  CookingPot, 
  Dumbbell, 
  FileText, 
  ListTodo, 
  Luggage, 
  Pen, 
  Settings, 
  Shield, 
  ShoppingCart, 
  Star, 
  Sun, 
  Timer, 
  UsersRound,
  LucideIcon
} from "lucide-react";

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const features: Feature[] = [
  {
    title: "Zadania",
    description: "Organizuj zadania z\u00A0priorytetami, datami i\u00A0kategoriami. Filtruj i\u00A0sortuj.",
    icon: ListTodo,
  },
  {
    title: "Pomodoro",
    description: "Zwiększ produktywność z\u00A0techniką Pomodoro i\u00A0timerem.",
    icon: Timer,
  },
  {
    title: "Eisenhower",
    description: "Priorytetyzuj zadania z\u00A0macierzą Eisenhowera (pilne/ważne).",
    icon: Brain,
  },
  {
    title: "Kalendarz",
    description: "Planuj wydarzenia, spotkania i\u00A0terminy. Eksportuj jako .ics.",
    icon: Calendar,
  },
  {
    title: "Notatki",
    description: "Twórz notatki, listy zakupów, przepisy i\u00A0plany podróży.",
    icon: Pen,
  },
  {
    title: "Sprawozdania",
    description: "Twórz sprawozdania ze\u00A0spotkań z\u00A0agendą, uczestnikami i\u00A0zadaniami.",
    icon: FileText,
  },
  {
    title: "Harmonogram Dnia",
    description: "Zadbaj o\u00A0regularność, stwórz własny plan dnia.",
    icon: Clock,
  },
  {
    title: "Nawyki",
    description: "Śledź codzienne nawyki: tabletki, trening, woda i\u00A0więcej.",
    icon: CheckCircle,
  },
  {
    title: "Przypomnienia",
    description: "Ustaw cykliczne przypomnienia o\u00A0ważnych rzeczach.",
    icon: Bell,
  },
  {
    title: "Rachunki",
    description: "Monitoruj swoje wydatki, planuj budżet i\u00A0śledź statystyki.",
    icon: Coins,
  },
  {
    title: "Budżet Roczny",
    description: "Analizuj wydatki i\u00A0przychody miesięczne. Obliczaj godziny pracy.",
    icon: ChartColumnBig,
  },
  {
    title: "Pogoda",
    description: "Sprawdzaj aktualną pogodę i\u00A0prognozę dla swojej lokalizacji.",
    icon: Sun,
  },
  {
    title: "Trening",
    description: "Planuj treningi, zapisuj ćwiczenia i\u00A0śledź swoje postępy.",
    icon: Dumbbell,
  },
  {
    title: "Listy Zakupów",
    description: "Twórz i\u00A0udostępniaj listy zakupów z\u00A0możliwością odznaczania.",
    icon: ShoppingCart,
  },
  {
    title: "Przepisy",
    description: "Zarządzaj przepisami kulinarnymi z\u00A0listą produktów i\u00A0kategoryzacją.",
    icon: CookingPot,
  },
  {
    title: "Plecak",
    description: "Autorska lista wyposażenia plecaka lub torebki.",
    icon: Backpack,
  },
  {
    title: "Walizka Podróżna",
    description: "Uniwersalna lista rzeczy na\u00A0wyjazd: odzież, dokumenty, elektronika.",
    icon: Luggage,
  },
  {
    title: "Plecak Bezpieczeństwa",
    description: "Pełna lista niezbędnych rzeczy na\u00A0wypadek kryzysu.",
    icon: Shield,
  },
  {
    title: "Udostępnianie",
    description: "Udostępniaj zadania, wydarzenia i\u00A0listy innym użytkownikom.",
    icon: UsersRound,
  },
  {
    title: "Ustawienia",
    description: "Dostosuj preferencje aplikacji do\u00A0swoich potrzeb.",
    icon: Settings,
  },
  {
    title: "Wiele więcej...",
    description: "Aplikacja jest rozwijana i\u00A0pojawiają się nowe funkcje.",
    icon: Star,
  },
];