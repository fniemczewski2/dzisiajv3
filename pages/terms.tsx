// pages/terms.tsx

import type { ReactNode } from "react";
import Link from "next/link";
import Seo from "@/components/ui/SEO";

const EFFECTIVE_FROM = "12 listopada 2026 r.";

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="section-title mb-4">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <Seo
        title="Regulamin"
        description="Regulamin korzystania z aplikacji Dzisiaj.Fun: zasady świadczenia usługi, obowiązki użytkownika, odpowiedzialność i reklamacje."
        canonical="https://www.dzisiaj.fun/terms"
      />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="page-title mb-2 sm:text-4xl">Regulamin</h1>
        <p className="mb-10 border-b border-line pb-4 text-sm text-text-muted">
          Obowiązuje od: {EFFECTIVE_FROM} &nbsp;•&nbsp; Aplikacja: Dzisiaj.Fun
        </p>

        <Section title="1. Postanowienia ogólne">
          <p>
            Regulamin określa zasady korzystania z aplikacji internetowej <strong>Dzisiaj.Fun</strong> (adres{" "}
            <a href="https://www.dzisiaj.fun" className="text-primary hover:underline">
              dzisiaj.fun
            </a>
            ). Usługodawcą jest <strong>Franciszek Niemczewski - Usługi IT</strong> z siedzibą w Baranówku, NIP:
            7773460003.
          </p>
          <p>
            Kontakt w sprawach dotyczących usługi:{" "}
            <a href="mailto:f.niemczewski@dzisiaj.fun" className="text-primary hover:underline">
              f.niemczewski@dzisiaj.fun
            </a>
            . Zasady przetwarzania danych osobowych opisuje{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Polityka Prywatności
            </Link>
            .
          </p>
        </Section>

        <Section title="2. Usługa">
          <p>
            Dzisiaj.Fun to bezpłatna aplikacja do zarządzania zadaniami, kalendarzem, notatkami, finansami osobistymi i
            innymi obszarami codziennego planowania. Zakres funkcji opisuje{" "}
            <Link href="/guide" className="text-primary hover:underline">
              przewodnik
            </Link>
            . Funkcje mogą się zmieniać, w tym być dodawane, wyłączane albo ograniczane limitami.
          </p>
        </Section>

        <Section title="3. Konto i wymagania">
          <p>
            Do założenia konta potrzebne jest konto Google. Z aplikacji mogą samodzielnie korzystać osoby, które
            ukończyły 16 lat; osoba młodsza może z niej korzystać za zgodą rodzica lub opiekuna prawnego.
          </p>
          <p>
            Użytkownik odpowiada za zabezpieczenie dostępu do swojego konta Google i za działania wykonane z jego
            użyciem.
          </p>
        </Section>

        <Section title="4. Zasady korzystania">
          <p>Użytkownik zobowiązuje się nie:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>przesyłać treści bezprawnych ani naruszających prawa osób trzecich,</li>
            <li>omijać limitów, zabezpieczeń ani weryfikacji antybotowej,</li>
            <li>wykorzystywać aplikacji do masowego wysyłania wiadomości, zautomatyzowanych zapytań lub ataków,</li>
            <li>podejmować prób uzyskania dostępu do danych innych użytkowników.</li>
          </ul>
          <p>
            Naruszenie tych zasad może skutkować ograniczeniem dostępu do usługi lub usunięciem konta po uprzednim
            wezwaniu do zaprzestania naruszeń, a w przypadkach rażących bez wezwania.
          </p>
        </Section>

        <Section title="5. Treści użytkownika">
          <p>
            Treści dodane do aplikacji (zadania, notatki, wpisy finansowe, pliki i inne) pozostają własnością
            użytkownika. Usługodawca przetwarza je wyłącznie w zakresie potrzebnym do działania usługi, zgodnie z
            Polityką Prywatności. Użytkownik może w każdej chwili pobrać kopię swoich danych i usunąć konto w
            Ustawieniach.
          </p>
        </Section>

        <Section title="6. Ankiety i linki publiczne">
          <p>
            Organizator ankiety terminów lub zapisów odpowiada za jej cel i treść oraz za to, aby uczestnicy znali
            zasady wykorzystania podanych przez nich danych. Uczestnik ankiety nie musi mieć konta; jego odpowiedź może
            być chroniona weryfikacją antybotową.
          </p>
        </Section>

        <Section title="7. Integracje zewnętrzne">
          <p>
            Połączenie z Google, Microsoft, Slackiem, Obsidianem i innymi usługami jest dobrowolne i może zostać
            odłączone w Ustawieniach. Działanie integracji zależy od zewnętrznych dostawców i ich warunków; usługodawca
            nie odpowiada za przerwy lub zmiany po ich stronie.
          </p>
        </Section>

        <Section title="8. Dostępność usługi">
          <p>
            Usługodawca dokłada starań, aby aplikacja działała nieprzerwanie, ale nie gwarantuje jej ciągłej
            dostępności. Prace serwisowe, awarie dostawców infrastruktury lub zmiany techniczne mogą powodować przerwy.
            Zalecane jest okresowe pobieranie kopii ważnych danych.
          </p>
        </Section>

        <Section title="9. Odpowiedzialność">
          <p>
            Dane z modułów takich jak zdrowie, transport, pogoda czy kursy walut mają charakter pomocniczy i nie
            stanowią porady medycznej, finansowej ani prawnej, ani wiążącej informacji o rozkładach jazdy. Usługodawca
            odpowiada za szkody w zakresie wynikającym z bezwzględnie obowiązujących przepisów prawa; postanowienia
            niniejszego regulaminu nie ograniczają praw przysługujących konsumentom z mocy ustawy.
          </p>
        </Section>

        <Section title="10. Zakończenie korzystania">
          <p>
            Użytkownik może w każdej chwili usunąć konto w Ustawieniach. Usunięcie jest nieodwracalne i obejmuje
            wszystkie dane powiązane z kontem. Usługodawca może zakończyć świadczenie usługi, informując o tym
            użytkowników z odpowiednim wyprzedzeniem w aplikacji lub na stronie.
          </p>
        </Section>

        <Section title="11. Reklamacje">
          <p>
            Reklamacje dotyczące działania usługi można zgłaszać na adres e-mail z punktu 1, opisując problem i dane
            konta, którego dotyczy. Usługodawca odpowiada na reklamację w ciągu 14 dni od jej otrzymania.
          </p>
        </Section>

        <Section title="12. Prawo właściwe i zmiany regulaminu">
          <p>
            Do usługi stosuje się prawo polskie. O zmianie regulaminu użytkownicy są informowani w aplikacji; dalsze
            korzystanie z usługi po wejściu zmian w życie oznacza ich akceptację, a użytkownik, który się z nimi nie
            zgadza, może usunąć konto.
          </p>
        </Section>
      </main>
    </div>
  );
}
