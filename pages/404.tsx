// pages/404.tsx
//
// Własna strona „nie znaleziono”: statyczna, bez zapytań do bazy.

import Link from "next/link";
import Seo from "@/components/ui/SEO";
import { useAuth } from "@/providers/AuthProvider";

export default function NotFoundPage() {
  const { user } = useAuth();

  return (
    <>
      <Seo title="Nie znaleziono strony" description="Strona, której szukasz, nie istnieje." noindex={true} />
      <section
        aria-labelledby="not-found-heading"
        className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center"
      >
        <p className="text-5xl font-bold text-primary" aria-hidden="true">
          404
        </p>
        <h1 id="not-found-heading" className="page-title">
          Nie znaleziono strony
        </h1>
        <p className="text-text-secondary">Adres jest błędny albo strona została usunięta.</p>
        <Link
          href={user ? "/" : "/start"}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-secondary px-6 py-3 font-semibold text-on-solid transition-colors hover:bg-secondary-hover"
        >
          {user ? "Wróć do planu dnia" : "Przejdź do logowania"}
        </Link>
      </section>
    </>
  );
}
