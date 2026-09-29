// components/ui/Layout.tsx

import { ReactNode } from "react";
import Header from "../Header";
import Navbar from "../Navbar";
import Link from "next/link";
import LoveCat from "../settings/LoveCat";
import { useAuth } from "@/providers/AuthProvider";
import { usePushNotifications } from "@/hooks/db/usePushNotifications";

function PushSubscriptionKeeper({ userId }: { readonly userId: string }) {
  usePushNotifications(userId);
  return null;
}

export default function Layout({ children }: { readonly children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:bg-secondary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Przejdź do treści
      </a>
      {user && <PushSubscriptionKeeper userId={user.id} />}
      <Header />
      <LoveCat />
      <main id="main-content" tabIndex={-1} className="flex-auto py-4 sm:py-6 pb-0 sm:pb-0 mb-24 md:mb-28 max-w-[1600px] w-full focus:outline-none">
        {children}
        <footer className="border-t border-gray-200 dark:border-gray-800 mt-10 py-4 px-4 text-center">
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} Dzisiaj.Fun
              <span aria-hidden="true" className="mx-2">·</span>
              <Link
                href="/privacy"
                className="text-primary hover:text-primary-strong underline-offset-4 hover:underline transition-colors"
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
