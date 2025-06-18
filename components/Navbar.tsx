import { Calendar, Coins, ListTodo, Pen, Settings } from "lucide-react";

export default function Navbar() {
  return (
    <nav
      className="
    fixed bottom-4
    inset-x-4
    px-4
    bg-white/70 
    backdrop-blur-md S
    p-2
    flex justify-around 
    shadow-lg
    rounded-xl
  "
    >
      <div
        className="m-0 p-0 grid grid-cols-5 gap-4
        sm:grid-cols-5 sm:gap-0 max-w-[1600px] w-full"
      >
        <NavLink href="/tasks" Icon={ListTodo} label="Zadania" />
        <NavLink href="/notes" Icon={Pen} label="Notatki" />
        <NavLink href="/bills" Icon={Coins} label="Rachunki" />
        <NavLink href="/calendar" Icon={Calendar} label="Kalendarz" />
        <NavLink href="/settings" Icon={Settings} label="Ustawienia" />
      </div>
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
