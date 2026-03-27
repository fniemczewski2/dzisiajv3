import { ReactNode } from "react";
import Header from "./Header";
import Navbar from "./Navbar";
import Link from "next/link";
import LoveCat from "./LoveCat";

export default function Layout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <Header />
      <LoveCat />
      <main className="flex-auto py-4 pb-0 sm:pb-0 mb-[80px] md:mb-[100px] max-w-[1600px] w-full">
        {children}
        <footer className="border-t border-gray-200 dark:border-gray-800 mt-10 py-4 px-4 text-center">
            <p className="text-sm text-textMuted">
              © {new Date().getFullYear()} Dzisiaj v3
              <span className="mx-2">·</span>
              <Link
                href="/privacy"
                className="text-primary hover:underline transition-colors"
              >
                Polityka prywatności
              </Link>
            </p>
        </footer>
      </main>
      <Navbar />
    </div>
  );
}
