import Link from "next/link";
import {
  ClipboardIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

export default function Navbar() {
  return (
    <nav className="fixed bottom-4 inset-x-4 bg-white/70 backdrop-blur-md rounded-2xl p-2 flex justify-around shadow-lg">
      <NavLink href="/tasks" Icon={ClipboardIcon} label="Zadania" />
      <NavLink href="/notes" Icon={DocumentTextIcon} label="Notatki" />
      <NavLink href="/bills" Icon={CurrencyDollarIcon} label="Rachunki" />
      <NavLink href="/calendar" Icon={CalendarIcon} label="Kalendarz" />
      <NavLink href="/settings" Icon={CogIcon} label="Ustawienia" />
    </nav>
  );
}

function NavLink({
  href,
  Icon,
  label,
}: {
  href: string;
  Icon: any;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center text-gray-600 hover:text-primary transition-colors"
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs">{label}</span>
    </a>
  );
}
