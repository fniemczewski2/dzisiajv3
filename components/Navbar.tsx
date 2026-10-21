// components/Navbar.tsx

import { Calendar, Coins, LayoutDashboard, ListTodo, Menu, Pen, Settings as SettingsIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { NAVIGATION_BUTTONS } from "@/config/modules";
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
  const { settings } = useSettings();

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
          className="fixed inset-0 z-40 animate-fade-in cursor-default bg-navy/40"
        />
      )}

      <nav
        aria-label="Nawigacja główna"
        className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 rounded-card border border-line-strong bg-card p-1.5 shadow-lg transition-colors sm:bottom-6"
      >
        <div
          id="navbar-menu-panel"
          aria-hidden={!isMenuOpen}
          inert={!isMenuOpen}
          className={`grid transition-all duration-300 ease-out ${
            isMenuOpen ? "mb-2 grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="max-h-[80vh] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
              <div className="grid grid-cols-4 gap-1.5 border-b border-line pb-1.5">
                {NAVIGATION_BUTTONS.map((item) => (
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
              <div className="flex w-full items-center gap-2 border-b border-line pb-1.5">
                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
                >
                  <SettingsIcon className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">Ustawienia</span>
                </Link>
                <GlobalSearch />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {user ? <AuthenticatedNav /> : <DefaultNav />}

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="navbar-menu-panel"
            aria-label={isMenuOpen ? "Zamknij menu" : "Otwórz menu"}
            className={`flex min-h-12 flex-1 flex-col items-center justify-center rounded-xl py-1.5 transition-colors duration-200 ${
              isMenuOpen ? "bg-text text-card" : "text-text-secondary hover:bg-surface hover:text-text"
            }`}
          >
            {isMenuOpen ? (
              <X aria-hidden="true" className="mb-1 h-5 w-5 transition-transform sm:h-6 sm:w-6" />
            ) : (
              <Menu aria-hidden="true" className="mb-1 h-5 w-5 transition-transform sm:h-6 sm:w-6" />
            )}
            <span className={`text-xs leading-none ${isMenuOpen ? "font-semibold" : "font-medium"}`}>Menu</span>
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

function MenuItemLink({ href, title, Icon, label, badge, isActive, onNavigate }: Readonly<MenuItemLinkProps>) {
  return (
    <Link
      href={href}
      title={title}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg border p-1.5 transition-colors ${
        isActive ? "border-text bg-text" : "border-transparent bg-card hover:border-line-strong hover:bg-surface-hover"
      }`}
    >
      <Icon
        aria-hidden="true"
        className={`h-5 w-5 ${isActive ? "text-card" : "text-text-secondary group-hover:text-text"}`}
      />
      <span
        className={`text-center text-xs leading-tight font-semibold ${
          isActive ? "text-card" : "text-text-secondary group-hover:text-text"
        }`}
      >
        {label}
      </span>
      {badge && (
        <span className="absolute -top-1.5 -right-1 z-10 rounded-full border-2 border-card bg-danger-solid px-1.5 py-0.5 text-xs font-semibold text-white shadow-sm">
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
  const isActive = currentPath === href || (href !== "/" && currentPath.startsWith(href));

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex min-h-12 flex-1 flex-col items-center justify-center rounded-xl py-1.5 transition-colors duration-200 ${
        isActive ? "bg-text text-card" : "text-text-secondary hover:bg-surface hover:text-text"
      }`}
    >
      <Icon aria-hidden="true" className="mb-1 h-5 w-5 sm:h-6 sm:w-6" />
      <span className={`text-xs leading-none ${isActive ? "font-semibold" : "font-medium"}`}>{label}</span>
    </Link>
  );
}
