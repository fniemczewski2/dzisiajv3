// pages/privacy.tsx
import Seo from "../components/SEO";

export default function PrivacyPage() {
  return (
    <>
      <Seo
        title="Prywatność - Dzisiaj v3"
        description="Przeczytaj naszą Politykę Prywatności, by dowiedzieć się, jak chronimy Twoje dane osobowe."
        canonical="https://dzisiajv3.vercel.app/privacy"
        keywords="prywatność, rodo, regulamin, ochrona danych, polityka prywatności"
      />
        <div className="max-w-2xl mx-auto py-8 px-2">
          <h1 className="text-3xl font-bold text-text mb-2">Polityka Prywatności</h1>
          <p className="text-sm text-textMuted mb-10">
            Obowiązuje od: 1 stycznia 2025 r. &nbsp;·&nbsp; Aplikacja: Dzisiaj v3
          </p>

          <Section title="1. Administrator danych">
            <p>
              Administratorem danych osobowych przetwarzanych w aplikacji <strong>Dzisiaj v3</strong>{" "}
              (dostępnej pod adresem <a href="https://dzisiajv3.vercel.app" className="text-primary hover:underline">dzisiajv3.vercel.app</a>){" "}
              jest Franciszek Niemczewski. Kontakt: <a href="mailto:f.niemczewski2@gmail.com" className="text-primary hover:underline">f.niemczewski2@gmail.com</a>.
            </p>
          </Section>

          <Section title="2. Jakie dane zbieramy">
            <p className="mb-3">Zbieramy wyłącznie dane niezbędne do działania aplikacji:</p>
            <ul className="space-y-2 list-none">
              <Li>
                <strong>Dane konta Google</strong>{" "}
                <span>
                  – adres e-mail i nazwa użytkownika, pobierane w momencie logowania przez Google OAuth. Nie zbieramy hasła.
                </span>
              </Li>
              <Li>
                <strong>Dane wprowadzone przez użytkownika</strong>{" "}
                <span>
                  – zadania, notatki, wydarzenia kalendarza, rachunki, nawyki, miejsca i inne treści, które samodzielnie dodajesz do aplikacji.
                </span>
              </Li>
              <Li>
                <strong>Tokeny Google Calendar</strong>{" "}
                <span>
                  – jeśli połączysz aplikację z Google Calendar, przechowujemy token dostępu i token odświeżania umożliwiające synchronizację wydarzeń. Tokeny są przechowywane w zaszyfrowanej bazie danych Supabase i używane wyłącznie do komunikacji z Twoim kalendarzem.
                </span>
              </Li>
              <Li>
                <strong>Dane techniczne</strong>{" "}
                <span>
                  – logi błędów aplikacji (bez danych osobowych), niezbędne do diagnozy problemów.
                </span>
              </Li>
            </ul>
          </Section>

          <Section title="3. W jakim celu przetwarzamy dane">
            <ul className="space-y-2 list-none">
              <Li>Świadczenie usług aplikacji – wyświetlanie i synchronizacja Twoich treści.</Li>
              <Li>Uwierzytelnianie – weryfikacja tożsamości przy logowaniu.</Li>
              <Li>
                Integracja z Google Calendar – import wydarzeń z Twojego kalendarza Google
                do aplikacji oraz eksport wydarzeń z aplikacji do Google Calendar, wyłącznie
                na Twoje żądanie.
              </Li>
              <Li>
                Udostępnianie treści – jeśli zdecydujesz się udostępnić zadania lub listy
                innym użytkownikom, niezbędne jest powiązanie danych z adresem e-mail.
              </Li>
            </ul>
          </Section>

          <Section title="4. Jak używamy danych Google Calendar">
            <p className="mb-3">
              Korzystanie z API Google Calendar podlega dodatkowemu zobowiązaniu. Potwierdzamy, że:
            </p>
            <ul className="space-y-2 list-none">
              <Li>
                <span>Dane z Google Calendar (wydarzenia, tytuły, opisy, daty) są używane </span>
                <strong>wyłącznie</strong>
                <span> do wyświetlania i synchronizacji Twoich wydarzeń w ramach aplikacji Dzisiaj v3.</span>
              </Li>
              <Li>
                <strong>Nie sprzedajemy, nie wynajmujemy ani nie udostępniamy</strong>
                <span> danych z Twojego Google Calendar żadnym stronom trzecim.</span>
              </Li>
              <Li>
                <span>Dane z Google Calendar </span>
                <strong>nie są używane</strong>
                <span> do reklamy, profilowania ani celów innych niż bezpośrednia funkcjonalność synchronizacji kalendarza.</span>
              </Li>
              <Li>
                Możesz w każdej chwili odłączyć integrację z Google Calendar w ustawieniach
                aplikacji (Kalendarz → Google Calendar → Odłącz). Po odłączeniu tokeny są
                natychmiast usuwane z naszej bazy danych.
              </Li>
            </ul>
            <p className="mt-3 text-sm text-textMuted">
              Korzystanie z danych Google Calendar jest zgodne z{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google API Services User Data Policy
              </a>
              <span>, w tym z zasadami ograniczonego użycia (Limited Use).</span>
            </p>
          </Section>

          <Section title="5. Podstawa prawna przetwarzania">
            <ul className="space-y-2 list-none">
              <Li>
                <strong>Umowa</strong>{" "}
                <span>(art. 6 ust. 1 lit. b RODO) – przetwarzanie niezbędne do świadczenia usługi, z której korzystasz.</span>
              </Li>
              <Li>
                <strong>Zgoda</strong>{" "}
                <span>(art. 6 ust. 1 lit. a RODO) – integracja z Google Calendar jest dobrowolna i wymaga Twojej wyraźnej zgody w procesie OAuth.</span>
              </Li>
              <Li>
                <strong>Uzasadniony interes</strong>{" "}
                <span>(art. 6 ust. 1 lit. f RODO) – logi błędów służące bezpieczeństwu i stabilności aplikacji.</span>
              </Li>
            </ul>
          </Section>

          <Section title="6. Przechowywanie i bezpieczeństwo danych">
            <ul className="space-y-2 list-none">
              <Li>
                <span>Dane przechowywane są w bazie danych </span>
                <strong>Supabase</strong>
                <span> (PostgreSQL) z szyfrowaniem danych w spoczynku i transmisją szyfrowaną TLS/HTTPS.</span>
              </Li>
              <Li>
                Dostęp do danych chroniony jest uwierzytelnianiem Google OAuth oraz
                politykami Row Level Security (RLS) w Supabase – każdy użytkownik widzi
                wyłącznie swoje dane.
              </Li>
              <Li>
                Tokeny Google Calendar przechowywane są w osobnej tabeli z RLS
                i dostępne wyłącznie dla właściciela konta.
              </Li>
            </ul>
          </Section>

          <Section title="7. Przekazywanie danych stronom trzecim">
            <p className="mb-3">Dane są przekazywane wyłącznie następującym podmiotom:</p>
            <ul className="space-y-2 list-none">
              <Li>
                <strong>Supabase Inc.</strong>{" "}
                <span>– dostawca bazy danych i uwierzytelniania (USA; dane chronione umową DPA zgodną z RODO).</span>
              </Li>
              <Li>
                <strong>Vercel Inc.</strong>{" "}
                <span>– hosting aplikacji (USA; umowa DPA zgodna z RODO).</span>
              </Li>
              <Li>
                <strong>Google LLC</strong>{" "}
                <span>– logowanie i (opcjonalnie) synchronizacja kalendarza, wyłącznie gdy wyrazisz na to zgodę.</span>
              </Li>
            </ul>
            <p className="mt-3">
              Nie sprzedajemy danych osobowych i nie przekazujemy ich podmiotom reklamowym.
            </p>
          </Section>

          <Section title="8. Twoje prawa">
            <p className="mb-3">Zgodnie z RODO przysługuje Ci prawo do:</p>
            <ul className="space-y-2 list-none">
              <Li><strong>Dostępu</strong> do swoich danych.</Li>
              <Li><strong>Sprostowania</strong> nieprawidłowych danych.</Li>
              <Li>
                <strong>Usunięcia danych</strong>{" "}
                <span>– możesz usunąć swoje konto i wszystkie dane, kontaktując się z nami na adres e-mail podany w pkt. 1.</span>
              </Li>
              <Li><strong>Ograniczenia przetwarzania</strong> oraz <strong>przeniesienia danych</strong>.</Li>
              <Li>
                <strong>Cofnięcia zgody</strong>{" "}
                <span>– w każdej chwili, bez wpływu na zgodność z prawem przetwarzania dokonanego przed cofnięciem.</span>
              </Li>
              <Li>
                <strong>Wniesienia skargi</strong>{" "}
                <span>do Prezesa Urzędu Ochrony Danych Osobowych (PUODO), jeśli uważasz, że przetwarzamy Twoje dane niezgodnie z prawem.</span>
              </Li>
            </ul>
          </Section>

          <Section title="9. Okres przechowywania danych">
            <ul className="space-y-2 list-none">
              <Li>
                Dane konta i treści użytkownika – przez czas korzystania z aplikacji; usuwane na żądanie lub po usunięciu konta.
              </Li>
              <Li>Tokeny Google Calendar – do momentu odłączenia integracji lub usunięcia konta.</Li>
              <Li>Logi błędów – maksymalnie 30 dni.</Li>
            </ul>
          </Section>

          <Section title="10. Pliki cookie i technologie śledzenia">
            <p className="mb-2">
              Aplikacja <strong>nie używa</strong> plików cookie do śledzenia aktywności, profilowania ani w celach reklamowych. Wykorzystujemy wyłącznie technologie niezbędne do poprawnego działania usługi:
            </p>
            <ul className="space-y-2 list-none">
              <Li>
                <strong>Niezbędne pliki cookie (Strictly Necessary Cookies):</strong>{" "}
                <span>Używane przez nasz system uwierzytelniania (Supabase) do bezpiecznego przechowywania tokenów sesji. Dzięki nim nie musisz logować się ponownie przy każdym odświeżeniu strony, a dostęp do Twoich danych prywatnych na serwerze jest chroniony. Zgodnie z prawem, tego typu pliki cookie nie wymagają uprzedniej zgody użytkownika.</span>
              </Li>
              <Li>
                <strong>Pamięć lokalna (localStorage):</strong>{" "}
                <span>Wykorzystywana do zapisywania Twoich preferencji interfejsu (np. tryb jasny/ciemny) oraz faktu zapoznania się z informacją o ciasteczkach, aby baner nie pojawiał się przy każdej wizycie.</span>
              </Li>
            </ul>
          </Section>

          <Section title="11. Dzieci">
            <p>
              Aplikacja nie jest przeznaczona dla osób poniżej 13. roku życia i nie zbiera
              świadomie danych od dzieci. Jeśli uważasz, że dziecko przekazało nam swoje dane,
              skontaktuj się z nami w celu ich usunięcia.
            </p>
          </Section>

          <Section title="12. Zmiany polityki prywatności">
            <p>
              O istotnych zmianach niniejszej polityki poinformujemy poprzez aktualizację daty
              w nagłówku dokumentu. Dalsze korzystanie z aplikacji po wprowadzeniu zmian
              oznacza ich akceptację.
            </p>
          </Section>

          <Section title="13. Kontakt">
            <p>
              W sprawach związanych z ochroną danych osobowych skontaktuj się z nami:{" "}
              <a href="mailto:f.niemczewski2@gmail.com" className="text-primary hover:underline">
                f.niemczewski2@gmail.com
              </a>
            </p>
          </Section>

          <div className="mt-8 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-textMuted">
            Ostatnia aktualizacja: 1 stycznia 2025 r.
          </div>
        </div>
    </>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-text mb-3">{title}</h2>
      <div className="text-textSecondary leading-relaxed text-sm space-y-2">{children}</div>
    </section>
  );
}

function Li({ children }: { readonly children: React.ReactNode }) {
  return (
    <li className="flex gap-2 items-start">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  );
}