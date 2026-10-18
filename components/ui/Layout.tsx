// components/ui/Layout.tsx

import { useNow } from "@/hooks/useNow";
import { ReactNode } from "react";
import Header from "../Header";
import Navbar from "../Navbar";
import Link from "next/link";
import LoveCat from "../settings/LoveCat";
import ModuleGate from "./ModuleGate";
import { useAuth } from "@/providers/AuthProvider";
import { usePushNotifications } from "@/hooks/db/usePushNotifications";

function PushSubscriptionKeeper({ userId }: { readonly userId: string }) {
  usePushNotifications(userId);
  return null;
}

export default function Layout({ children }: { readonly children: ReactNode }) {
  const year = useNow(3_600_000).getFullYear();
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
      <main
        id="main-content"
        tabIndex={-1}
        className="mb-24 w-full max-w-[1600px] flex-auto py-4 pb-0 focus:outline-none sm:py-6 sm:pb-0 md:mb-28"
      >
        {user ? <ModuleGate>{children}</ModuleGate> : children}
        <footer className="mt-10 border-t border-line px-4 py-4 text-center">
          <p className="text-sm text-text-muted">
            © {year} Dzisiaj.Fun
            <span aria-hidden="true" className="mx-2">
              ·
            </span>
            <Link
              href="/privacy"
              className="text-primary underline-offset-4 transition-colors hover:text-primary-strong hover:underline"
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
