import { Calendar, LayoutDashboard, ListTodo, Menu, Pen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();

  return (
    <nav className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-card backdrop-blur-xl border border-gray-200 dark:border-gray-800 p-2 shadow-2xl rounded-2xl z-50 transition-colors">
      <div className="flex justify-between items-center gap-1 sm:gap-2">
        <NavLink href="/" Icon={LayoutDashboard} label="Dzisiaj" currentPath={router.pathname} />
        <NavLink href="/tasks" Icon={ListTodo} label="Zadania" currentPath={router.pathname} />
        <NavLink href="/notes" Icon={Pen} label="Notatki" currentPath={router.pathname} />
        <NavLink href="/calendar" Icon={Calendar} label="Kalendarz" currentPath={router.pathname} />
        <NavLink href="/settings" Icon={Menu} label="Menu" currentPath={router.pathname} />
      </div>
    </nav>
  );
}

function NavLink({
  href,
  Icon,
  label,
  currentPath,
}: {
  href: string;
  Icon: any;
  label: string;
  currentPath: string;
}) {
  // Oznacz element jako aktywny, jeśli ścieżka dokładnie pasuje 
  // lub jeśli jest to strona podrzędna (np. /tasks/pomodoro podświetla /tasks)
  const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));

  return (
    <Link 
      href={href}
      className={`flex flex-col items-center justify-center flex-1 py-2 sm:py-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
        isActive 
          ? "text-primary" 
          : "text-textMuted hover:text-text hover:bg-surface"
      }`}
    >
      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-transform ${isActive ? "scale-110" : ""}`} />
      <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider leading-none ${`isActive ? "font-bold" : "font-medium"`}`}>
        {label}
      </span>
    </Link>
  );
}