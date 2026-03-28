import { Calendar, Coins, LayoutDashboard, ListTodo, Menu, Pen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Settings } from "../types";
import { useEffect, useState } from "react";
import { useSettings } from "../hooks/useSettings";

interface NavLinkProps {
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  currentPath: string;
}

export default function Navbar() {
  const router = useRouter();
  const { settings: dbSettings, DEFAULT_SETTINGS } = useSettings();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(dbSettings);
  }, [dbSettings]);

  useEffect(() => {
    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<Settings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };

    globalThis.addEventListener("settingsUpdated", handleSettingsChange);
    return () => globalThis.removeEventListener("settingsUpdated", handleSettingsChange);
  }, []);

  const renderMenuItems = (): React.ReactNode => {
    switch(settings.main_view){
        case "tasks":
          return (
            <>
              <NavLink href="/" Icon={ListTodo} label="Zadania" currentPath={router.pathname} />
              <NavLink href="/notes" Icon={Pen} label="Notatki" currentPath={router.pathname} />
              <NavLink href="/bills" Icon={Coins} label="Finanse" currentPath={router.pathname} />
              <NavLink href="/calendar" Icon={Calendar} label="Kalendarz" currentPath={router.pathname} />
              <NavLink href="/settings" Icon={Menu} label="Menu" currentPath={router.pathname} />
            </>
          )
        
        case "calendar": 
          return (
            <>
              <NavLink href="/" Icon={Calendar} label="Kalendarz" currentPath={router.pathname} />
              <NavLink href="/tasks" Icon={ListTodo} label="Zadania" currentPath={router.pathname} />
              <NavLink href="/notes" Icon={Pen} label="Notatki" currentPath={router.pathname} />
              <NavLink href="/bills" Icon={Coins} label="Finanse" currentPath={router.pathname} />
              <NavLink href="/settings" Icon={Menu} label="Menu" currentPath={router.pathname} />
            </>
          )
        case "day_view":
          return (
            <>
              <NavLink href="/" Icon={LayoutDashboard} label="Dzisiaj" currentPath={router.pathname} />
              <NavLink href="/tasks" Icon={ListTodo} label="Zadania" currentPath={router.pathname} />
              <NavLink href="/notes" Icon={Pen} label="Notatki" currentPath={router.pathname} />
              <NavLink href="/bills" Icon={Coins} label="Finanse" currentPath={router.pathname} />
              <NavLink href="/settings" Icon={Menu} label="Menu" currentPath={router.pathname} />
            </>
          )
        default:
          return (
            <div className="flex justify-between w-full items-center gap-1 sm:gap-2">
              <NavLink href="/" Icon={LayoutDashboard} label="Dzisiaj" currentPath={router.pathname} />
              <NavLink href="/tasks" Icon={ListTodo} label="Zadania" currentPath={router.pathname} />
              <NavLink href="/notes" Icon={Pen} label="Notatki" currentPath={router.pathname} />
              <NavLink href="/calendar" Icon={Calendar} label="Kalendarz" currentPath={router.pathname} />
              <NavLink href="/settings" Icon={Menu} label="Menu" currentPath={router.pathname} />
            </div>
          )
      }
    }
  return (
    <nav className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg card backdrop-blur-xl p-2 shadow-2xl rounded-2xl z-50 transition-colors">
      <div className="flex justify-between items-center gap-1 sm:gap-2">
        {renderMenuItems()}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  Icon,
  label,
  currentPath,
}: Readonly<NavLinkProps>) {
  const isActive =
    currentPath === href ||
    (href !== "/" && currentPath.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center flex-1 py-2 sm:py-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
        isActive
          ? "text-primary"
          : "text-textMuted hover:text-text hover:bg-surface"
      }`}
    >
      <Icon
        className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-transform ${
          isActive ? "scale-110" : ""
        }`}
      />
      <span
        className={`text-[9px] sm:text-[10px] uppercase tracking-wider leading-none ${
          isActive ? "font-bold" : "font-medium"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}