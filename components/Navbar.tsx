// components/Navbar.tsx
import {
  Calendar,
  Coins,
  LayoutDashboard,
  ListTodo,
  Menu,
  Pen,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Settings } from "../types/settings";
import { useEffect, useState } from "react";
import { useSettings } from "../hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { NAVIGATION_CATEGORIES } from "@/config/navigation";

interface NavLinkProps {
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  currentPath: string;
}

function DefaultNav() {
  const router = useRouter();

  return (
    <>
      <NavLink href="/" Icon={LayoutDashboard} label="Dzisiaj" currentPath={router.pathname} />
      <NavLink href="/tasks" Icon={ListTodo} label="Zadania" currentPath={router.pathname} />
      <NavLink href="/notes" Icon={Pen} label="Notatki" currentPath={router.pathname} />
      <NavLink href="/calendar" Icon={Calendar} label="Kalendarz" currentPath={router.pathname} />
    </>
  );
}

function AuthenticatedNav() {
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

  switch (settings.main_view) {
    case "tasks":
      return (
        <>
          <NavLink href="/" Icon={ListTodo} label="Zadania" currentPath={router.pathname} />
          <NavLink href="/notes" Icon={Pen} label="Notatki" currentPath={router.pathname} />
          <NavLink href="/bills" Icon={Coins} label="Finanse" currentPath={router.pathname} />
          <NavLink href="/calendar" Icon={Calendar} label="Kalendarz" currentPath={router.pathname} />
        </>
      );
    case "calendar":
      return (
        <>
          <NavLink href="/" Icon={Calendar} label="Kalendarz" currentPath={router.pathname} />
          <NavLink href="/tasks" Icon={ListTodo} label="Zadania" currentPath={router.pathname} />
          <NavLink href="/notes" Icon={Pen} label="Notatki" currentPath={router.pathname} />
          <NavLink href="/bills" Icon={Coins} label="Finanse" currentPath={router.pathname} />
        </>
      );
    case "day_view":
      return (
        <>
          <NavLink href="/" Icon={LayoutDashboard} label="Dzisiaj" currentPath={router.pathname} />
          <NavLink href="/tasks" Icon={ListTodo} label="Zadania" currentPath={router.pathname} />
          <NavLink href="/notes" Icon={Pen} label="Notatki" currentPath={router.pathname} />
          <NavLink href="/bills" Icon={Coins} label="Finanse" currentPath={router.pathname} />
        </>
      );
    default:
      return <DefaultNav />;
  }
}

export default function Navbar() {
  const { user } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Zamknij menu po zmianie strony
  useEffect(() => {
    const handleRouteChange = () => setIsMenuOpen(false);
    router.events.on("routeChangeStart", handleRouteChange);
    return () => router.events.off("routeChangeStart", handleRouteChange);
  }, [router.events]);

  // Zamknij menu klawiszem Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  return (
    <>
      {isMenuOpen && (
        <button
          type="button"
          aria-label="Zamknij menu"
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-fadeIn cursor-default"
        />
      )}

      <nav className={`${!isMenuOpen && "max-h-['65px']"} fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg card backdrop-blur-xl p-2 shadow-2xl rounded-2xl z-50 transition`}>
        <div
          id="navbar-menu-panel"
          aria-hidden={!isMenuOpen}
          className={`grid transition-all duration-300 ease-out ${
            isMenuOpen
              ? "grid-rows-[1fr] opacity-100 mb-2"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div className="max-h-[80vh] overflow-y-auto overscroll-contain space-y-2 pr-0.5">
              {NAVIGATION_CATEGORIES.map((category) => (
                <div key={category.name} className="bg-surface rounded-xl p-2">
                  <h3 className="text-[9px] sm:text-[10px] pb-1.5 px-1 font-bold text-textMuted uppercase tracking-widest">
                    {category.name}
                  </h3>
                  <div className="grid grid-cols-4 gap-1.5">
                    {category.items.map((item) => (
                      <MenuItemLink
                        key={item.path}
                        href={item.path}
                        title={item.title}
                        Icon={item.icon}
                        label={item.label}
                        badge={item.badge}
                        isActive={router.pathname === item.path}
                        onNavigate={() => setIsMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-surface hover:bg-surfaceHover text-textSecondary hover:text-text transition-colors active:scale-[0.98]"
              >
                <SettingsIcon className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Ustawienia
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-1 sm:gap-2">
          {user ? <AuthenticatedNav /> : <DefaultNav />}

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="navbar-menu-panel"
            aria-label={isMenuOpen ? "Zamknij menu" : "Otwórz menu"}
            className={`flex flex-col items-center justify-center flex-1 py-2 sm:py-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
              isMenuOpen
                ? "text-primary"
                : "text-textMuted hover:text-text hover:bg-surface"
            }`}
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6 mb-1 scale-110 transition-transform" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-transform" />
            )}
            <span
              className={`text-[9px] sm:text-[10px] uppercase tracking-wider leading-none ${
                isMenuOpen ? "font-bold" : "font-medium"
              }`}
            >
              Menu
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

interface MenuItemLinkProps {
  href: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  isActive: boolean;
  onNavigate: () => void;
}

function MenuItemLink({
  href,
  title,
  Icon,
  label,
  badge,
  isActive,
  onNavigate,
}: Readonly<MenuItemLinkProps>) {
  return (
    <Link
      href={href}
      title={title}
      onClick={onNavigate}
      className="relative p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-card hover:bg-surfaceHover transition-all active:scale-95 flex flex-col items-center justify-center gap-1 group"
    >
      <Icon
        className={`w-5 h-5 transition-transform group-hover:scale-110 ${
          isActive ? "text-primary" : "text-textMuted group-hover:text-text"
        }`}
      />
      <span
        className={`text-[8px] sm:text-[9px] text-center leading-tight font-bold tracking-wide uppercase ${
          isActive ? "text-primary" : "text-textSecondary group-hover:text-text"
        }`}
      >
        {label}
      </span>
      {badge && (
        <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 bg-red-500 dark:bg-red-600 text-white text-[8px] rounded-full shadow-sm border-2 border-card z-10">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavLink({ href, Icon, label, currentPath }: Readonly<NavLinkProps>) {
  const isActive =
    currentPath === href || (href !== "/" && currentPath.startsWith(href));

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