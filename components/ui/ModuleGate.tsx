// components/ui/ModuleGate.tsx

import React, { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { PowerOff } from "lucide-react";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { TOGGLEABLE_MODULES, moduleForPath } from "@/config/modules";

export default function ModuleGate({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const { isEnabled } = useEnabledModules();
  if (isEnabled(router.pathname)) return <>{children}</>;

  const title = TOGGLEABLE_MODULES.find((m) => m.path === moduleForPath(router.pathname))?.title ?? "Ten moduł";
  return (
    <section className="mx-auto max-w-md rounded-card border border-line bg-card p-6 text-center">
      <PowerOff className="mx-auto mb-3 h-8 w-8 text-text-secondary" aria-hidden="true" />
      <h1 className="page-title mb-2">{title} – moduł wyłączony</h1>
      <p className="mb-5 text-text-secondary">
        Włączysz go w Ustawieniach, w sekcji „Moduły”. Twoje dane są zachowane.
      </p>
      <Link
        href="/settings#modules-heading"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-secondary px-5 font-semibold text-white hover:bg-secondary-hover"
      >
        Przejdź do ustawień
      </Link>
    </section>
  );
}
