// pages/500.tsx
//
// Własna strona błędu serwera: statyczna, bez zapytań do bazy.

import Link from "next/link";
import Seo from "@/components/ui/SEO";

export default function ServerErrorPage() {
  return (
    <>
      <Seo title="Błąd serwera" description="Coś poszło nie tak po naszej stronie." noindex={true} />
      <section
        aria-labelledby="server-error-heading"
        className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center"
      >
        <p className="text-5xl font-bold text-danger" aria-hidden="true">
          500
        </p>
        <h1 id="server-error-heading" className="page-title">
          Coś poszło nie tak
        </h1>
        <p className="text-text-secondary">Błąd po naszej stronie. Spróbuj ponownie za chwilę.</p>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-secondary px-6 py-3 font-semibold text-on-solid transition-colors hover:bg-secondary-hover"
        >
          Wróć na stronę główną
        </Link>
      </section>
    </>
  );
}
