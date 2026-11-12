// pages/thanks.tsx
//
// Strona podziękowania po czynnościach kończących sesję. Komunikat wybiera parametr `z`
// z zamkniętej listy (nieznana wartość daje komunikat domyślny).

import Link from "next/link";
import { useRouter } from "next/router";
import Seo from "@/components/ui/SEO";

const MESSAGES = {
  konto: {
    title: "Konto zostało usunięte",
    text: "Usunęliśmy Twoje konto i wszystkie dane z bazy. Dziękujemy, że korzystałeś z Dzisiaj.Fun.",
  },
  default: {
    title: "Dziękujemy",
    text: "Twoja odpowiedź została zapisana.",
  },
} as const;

type MessageKey = keyof typeof MESSAGES;

function resolveMessage(value: string | string[] | undefined) {
  const key = typeof value === "string" && value in MESSAGES ? (value as MessageKey) : "default";
  return MESSAGES[key];
}

export default function ThanksPage() {
  const router = useRouter();
  const message = resolveMessage(router.query.z);

  return (
    <>
      <Seo title="Dziękujemy" description="Dziękujemy za skorzystanie z Dzisiaj.Fun." noindex={true} />
      <section
        aria-labelledby="thanks-heading"
        className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center"
      >
        <h1 id="thanks-heading" className="page-title">
          {message.title}
        </h1>
        <p className="text-text-secondary">{message.text}</p>
        <Link
          href="/start"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-secondary px-6 py-3 font-semibold text-on-solid transition-colors hover:bg-secondary-hover"
        >
          Przejdź do strony startowej
        </Link>
      </section>
    </>
  );
}
