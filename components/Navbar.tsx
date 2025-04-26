import Link from "next/link";
import {
  ClipboardListIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
export default function Navbar() {
  return (
    <nav className="bg-white shadow-inner p-2 fixed bottom-0 w-full flex justify-around">
      <Link href="/tasks">
        <ClipboardListIcon className="w-6 h-6" aria-label="Tasks" />
      </Link>
      <Link href="/notes">
        <DocumentTextIcon className="w-6 h-6" aria-label="Notes" />
      </Link>
      <Link href="/bills">
        <CurrencyDollarIcon className="w-6 h-6" aria-label="Bills" />
      </Link>
      <Link href="/calendar">
        <CalendarIcon className="w-6 h-6" aria-label="Calendar" />
      </Link>
      <Link href="/settings">
        <CogIcon className="w-6 h-6" aria-label="Settings" />
      </Link>
    </nav>
  );
}
