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
import GlobalSearch from "./ui/GlobalSearch";
import { useEnabledModules } from "@/hooks/useEnabledModules";

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
  const { isEnabled } = useEnabledModules();

  useEffect(() => {
    const handleRouteChange = () => setIsMenuOpen(false);
    router.events.on("routeChangeStart", handleRouteChange);
    return () => router.events.off("routeChangeStart", handleRouteChange);
  }, [router.events]);

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
          className="fixed inset-0 z-40 bg-navy/40 animate-fade-in cursor-default"
        />
      )}

      <nav aria-label="Nawigacja główna" className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-lg bg-card border border-line-strong p-1.5 shadow-lg rounded-card z-50 transition-colors">
        <div
          id="navbar-menu-panel"
          aria-hidden={!isMenuOpen}
          inert={!isMenuOpen}
          className={`grid transition-all duration-300 ease-out ${
            isMenuOpen
              ? "grid-rows-[1fr] opacity-100 mb-2"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div className="max-h-[80vh] overflow-y-auto overscroll-contain space-y-2 pr-0.5">
              {NAVIGATION_CATEGORIES.map((category) => ({ ...category, items: category.items.filter((i) => isEnabled(i.path)) }))
                .filter((category) => category.items.length > 0)
                .map((category) => (
                  <div className="flex gap-1.5 border-b border-line pb-1.5" key={category.name}>
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
              ))}
              <div className="w-full flex items-center gap-2 border-b border-line pb-1.5">
              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-center gap-2 flex-1 min-h-11 rounded-xl hover:bg-surface-hover text-text-secondary hover:text-text transition-colors"
              >
                <SettingsIcon className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs font-semibold">
                  Ustawienia
                </span>
              </Link>
              <GlobalSearch/>
              </div>
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
            className={`flex flex-col items-center justify-center flex-1 min-h-12 py-1.5 rounded-xl transition-colors duration-200 ${
              isMenuOpen
                ? "bg-text text-card"
                : "text-text-secondary hover:text-text hover:bg-surface"
            }`}
          >
            {isMenuOpen ? (
              <X aria-hidden="true" className="w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-transform" />
            ) : (
              <Menu aria-hidden="true" className="w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-transform" />
            )}
            <span
              className={`text-xs leading-none ${
                isMenuOpen ? "font-semibold" : "font-medium"
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
      aria-current={isActive ? "page" : undefined}
      className={`flex-1 relative min-h-14 p-1.5 rounded-lg border transition-colors flex flex-col items-center justify-center gap-1 group ${
        isActive
          ? "border-text bg-text"
          : "border-transparent hover:border-line-strong bg-card hover:bg-surface-hover"
      }`}
    >
      <Icon
        aria-hidden="true"
        className={`w-5 h-5 ${
          isActive ? "text-card" : "text-text-secondary group-hover:text-text"
        }`}
      />
      <span
        className={`text-xs text-center leading-tight font-semibold ${
          isActive ? "text-card" : "text-text-secondary group-hover:text-text"
        }`}
      >
        {label}
      </span>
      {badge && (
        <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 bg-red-600 text-white text-xs font-semibold rounded-full shadow-sm border-2 border-card z-10">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavLink(props: Readonly<NavLinkProps>) {
  const { isEnabled } = useEnabledModules();
  if (!isEnabled(props.href)) return null;
  return <NavLinkInner {...props} />;
}

function NavLinkInner({ href, Icon, label, currentPath }: Readonly<NavLinkProps>) {
  const isActive =
    currentPath === href || (href !== "/" && currentPath.startsWith(href));

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex flex-col items-center justify-center flex-1 min-h-12 py-1.5 rounded-xl transition-colors duration-200 ${
        isActive
          ? "bg-text text-card"
          : "text-text-secondary hover:text-text hover:bg-surface"
      }`}
    >
      <Icon
        aria-hidden="true"
        className="w-5 h-5 sm:w-6 sm:h-6 mb-1"
      />
      <span
        className={`text-xs leading-none ${
          isActive ? "font-semibold" : "font-medium"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
