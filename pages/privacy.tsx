// pages/privacy.tsx

import Seo from "@/components/ui/SEO";
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <Seo
        title="Polityka prywatności"
        description="Polityka prywatności aplikacji Dzisiaj.Fun: jakie dane przetwarzamy, w jakim celu, komu je przekazujemy (m.in. Google, Microsoft, Slack) i jakie masz prawa."
        canonical="https://dzisiaj.fun/privacy"
        keywords="prywatność, rodo, regulamin, ochrona danych, polityka prywatności, google calendar, outlook"
      />

      <main className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="page-title sm:text-4xl mb-2">Polityka Prywatności</h1>
        <p className="text-sm text-text-muted mb-10 border-b border-gray-200 dark:border-gray-800 pb-4">
          Obowiązuje od: 6 października 2026 r. &nbsp;•&nbsp; Aplikacja: Dzisiaj.Fun
        </p>

        <Section title="1. Administrator danych">
          <p>
            Administratorem Twoich danych osobowych przetwarzanych w aplikacji <strong>Dzisiaj.Fun</strong>{" "}
            (dostępnej pod adresem <a href="https://dzisiaj.fun" className="text-primary hover:underline">dzisiaj.fun</a>){" "}
            jest <strong>Franciszek Niemczewski - Usługi IT</strong> z siedzibą w Baranówku, NIP: 7773460003.
          </p>
          <p className="mt-2">
            W sprawach związanych z prywatnością i ochroną danych możesz kontaktować się pod adresem e-mail: <a href="mailto:f.niemczewski@dzisiaj.fun" className="text-primary hover:underline">f.niemczewski@dzisiaj.fun</a>.
          </p>
        </Section>

        <Section title="2. Jakie dane zbieramy i dlaczego?">
          <p className="mb-3">Aplikacja służy do zarządzania produktywnością oraz oferuje funkcję agregacji zewnętrznych kalendarzy. Zbieramy wyłącznie dane niezbędne do działania usługi:</p>
          <ul className="space-y-3 list-none">
            <Li>
              <strong>Dane wprowadzane przez użytkownika:</strong>{" "}
              <span>Zadania, notatki, rachunki, nawyki, miejsca i inne treści, które samodzielnie dodajesz do lokalnej bazy aplikacji.</span>
            </Li>
            <Li>
              <strong>Dane z kont Google i Microsoft:</strong>{" "}
              <span>Adres e-mail oraz nazwa użytkownika (pobierane w momencie logowania przez system OAuth), służące do identyfikacji konta. <strong>Nie zbieramy i nie mamy dostępu do Twoich haseł.</strong></span>
            </Li>
            <Li>
              <strong>Wydarzenia z kalendarzy (Google Calendar / Microsoft Outlook):</strong>{" "}
              <span>Za Twoją wyraźną zgodą pobieramy tytuły, godziny rozpoczęcia i zakończenia, opisy oraz lokalizacje wydarzeń w celu ich wyświetlenia na wspólnej siatce kalendarza wewnątrz aplikacji Dzisiaj.Fun.</span>
            </Li>
            <Li>
              <strong>Tokeny autoryzacyjne (OAuth):</strong>{" "}
              <span>Jeśli połączysz aplikację z zewnętrznym kalendarzem, przechowujemy token dostępu i token odświeżania. Umożliwiają one synchronizację kalendarza w tle. Tokeny są przechowywane w bezpiecznej, zaszyfrowanej bazie danych.</span>
            </Li>
            <Li>
              <strong>Integracja ze Slackiem (opcjonalna):</strong>{" "}
              <span>Jeśli połączysz konto Slack, przechowujemy identyfikator i nazwę przestrzeni roboczej, Twój identyfikator użytkownika Slack oraz zaszyfrowany token dostępu. Aplikacja prosi o uprawnienia do odczytu i zapisu list Slacka (<em>lists:read</em>, <em>lists:write</em>), odczytu plików (<em>files:read</em>) oraz odczytu użytkowników i ich adresów e-mail (<em>users:read</em>, <em>users:read.email</em>) – te ostatnie służą do dopasowania osób przypisanych do elementów listy. Z wybranymi przez Ciebie listami synchronizowane są tytuł, opis, termin, priorytet i status zadań, w obie strony.</span>
            </Li>
            <Li>
              <strong>Powiadomienia push (opcjonalne):</strong>{" "}
              <span>Po włączeniu powiadomień przechowujemy subskrypcję Web Push Twojej przeglądarki: adres usługi powiadomień i klucze szyfrujące. Treść powiadomień (np. przypomnienia) jest szyfrowana przed wysłaniem zgodnie ze standardem Web Push.</span>
            </Li>
            <Li>
              <strong>Skróty Siri – automatyczny czas pracy (opcjonalne):</strong>{" "}
              <span>Po wygenerowaniu tokenu w ustawieniach przechowujemy wyłącznie jego skrót kryptograficzny (SHA-256), datę utworzenia i datę ostatniego użycia – samego tokenu nie da się z nich odtworzyć. Skrót wywołany na Twoim urządzeniu tworzy lub zamyka wpis czasu pracy z godziną rozpoczęcia albo zakończenia.</span>
            </Li>
            <Li>
              <strong>Dane techniczne:</strong>{" "}
              <span>Logi błędów aplikacji (zanonimizowane), niezbędne do diagnozowania problemów technicznych.</span>
            </Li>
          </ul>
        </Section>

        <Section title="3. Zgodność z API dostawców (Google i Microsoft)">
          <p className="mb-3">Nasza aplikacja korzysta z oficjalnych interfejsów API do komunikacji z Twoimi kontami w sposób bezpieczny i w pełni transparentny:</p>
          
          <div className="p-5 my-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
            <p className="font-semibold text-text mb-2">Klauzula Google (Google API Services User Data Policy):</p>
            <p className="text-sm">
              Wykorzystanie przez aplikację &quot;Dzisiaj.Fun&quot; informacji otrzymanych z interfejsów API Google oraz ich przekazywanie do innych aplikacji będzie w pełni zgodne z <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">Zasadami dotyczącymi danych użytkownika usług interfejsu API Google</a>, w tym z wymogami ograniczonego użytkowania (Limited Use requirements). 
            </p>
            <ul className="mt-3 space-y-1 text-sm list-disc pl-4">
              <li>Dane używane są <strong>wyłącznie</strong> do funkcji kalendarza.</li>
              <li>Dane <strong>nie są</strong> sprzedawane, udostępniane podmiotom trzecim ani wykorzystywane do profilowania czy wyświetlania reklam.</li>
            </ul>
          </div>
        </Section>

        <Section title="4. Usuwanie danych i odłączanie kont">
          <p>
            W każdej chwili możesz odłączyć integrację z Google Calendar lub Microsoft Outlook z poziomu ustawień kalendarza w aplikacji.
          </p>
          <p className="mt-2">
            Pozostałe integracje wyłączysz w Ustawieniach: odłączenie Slacka usuwa token dostępu i konfigurację list (elementy już utworzone w Slacku pozostają w Twojej przestrzeni roboczej), wyłączenie powiadomień usuwa subskrypcję push, a unieważnienie tokenu Skrótów Siri usuwa jego skrót – skrót na telefonie przestaje wtedy działać.
          </p>
          <p className="mt-2">
            <strong>Skutki odłączenia:</strong> Odłączenie konta powoduje natychmiastowe i bezpowrotne usunięcie z naszej bazy danych Twoich tokenów dostępowych, przypisanego adresu e-mail oraz pobranych wydarzeń. Aplikacja natychmiastowo traci dostęp do Twoich zewnętrznych kalendarzy.
          </p>
        </Section>

        <Section title="5. Podstawa prawna przetwarzania (RODO)">
          <ul className="space-y-2 list-none">
            <Li>
              <strong>Umowa</strong> (art. 6 ust. 1 lit. b RODO) – przetwarzanie niezbędne do świadczenia usługi dostępu do aplikacji.
            </Li>
            <Li>
              <strong>Zgoda</strong> (art. 6 ust. 1 lit. a RODO) – integracje z kalendarzami Google i Microsoft oraz ze Slackiem, powiadomienia push i Skróty Siri są dobrowolne i włączasz je samodzielnie (w przypadku Google, Microsoft i Slacka – przez wyraźną zgodę w procesie OAuth).
            </Li>
            <Li>
              <strong>Uzasadniony interes</strong> (art. 6 ust. 1 lit. f RODO) – monitorowanie działania i logi błędów służące zapewnieniu stabilności aplikacji.
            </Li>
          </ul>
        </Section>

        <Section title="6. Bezpieczeństwo i udostępnianie danych stronom trzecim">
          <p className="mb-3">
            Twoje dane są całkowicie prywatne. <strong>Nigdy nie sprzedajemy, nie wynajmujemy ani nie przekazujemy</strong> Twoich danych zewnętrznym reklamodawcom czy brokerom danych. Korzystamy wyłącznie z certyfikowanych dostawców infrastruktury:
          </p>
          <ul className="space-y-2 list-none">
            <Li>
              <strong>Supabase Inc.</strong> – dostawca bazy danych i systemu uwierzytelniania.
            </Li>
            <Li>
              <strong>Vercel Inc.</strong> – bezpieczny hosting infrastruktury serwerowej aplikacji.
            </Li>
            <Li>
              <strong>Alphabet Inc. / Microsoft Corp.</strong> – bezpośrednia komunikacja z serwerami dostawców przy autoryzacji i synchronizacji kalendarzy.
            </Li>
            <Li>
              <strong>Slack Technologies, LLC (Salesforce)</strong> – tylko po połączeniu konta Slack: wymiana danych zadań z wybranymi listami w Twojej przestrzeni roboczej.
            </Li>
            <Li>
              <strong>Usługi powiadomień przeglądarek</strong> (Google, Apple, Mozilla, Microsoft – zależnie od przeglądarki) – tylko po włączeniu powiadomień: dostarczają zaszyfrowaną treść powiadomienia na Twoje urządzenie.
            </Li>
          </ul>
        </Section>

        <Section title="7. Twoje prawa">
          <p className="mb-3">Zgodnie z przepisami prawa (m.in. RODO), przysługuje Ci prawo do:</p>
          <ul className="space-y-2 list-none">
            <Li><strong>Dostępu</strong> do swoich danych oraz <strong>sprostowania</strong> danych nieprawidłowych.</Li>
            <Li><strong>Usunięcia danych (&quot;prawo do bycia zapomnianym&quot;)</strong> – w każdej chwili możesz zażądać całkowitego usunięcia konta oraz wszystkich zgromadzonych informacji.</Li>
            <Li><strong>Ograniczenia przetwarzania</strong> oraz <strong>przenoszenia danych</strong>.</Li>
            <Li><strong>Cofnięcia zgody</strong> na integracje zewnętrzne bez wpływu na zgodność z prawem przetwarzania przed jej cofnięciem.</Li>
            <Li><strong>Wniesienia skargi</strong> do Prezesa Urzędu Ochrony Danych Osobowych (PUODO).</Li>
          </ul>
        </Section>

        <Section title="8. Pliki cookie i technologie śledzenia">
          <p className="mb-2">
            Aplikacja <strong>nie używa</strong> plików cookie w celach marketingowych, śledzących ani analitycznych. Wykorzystujemy wyłącznie technologie kryptograficzne i sesyjne niezbędne do poprawnego i bezpiecznego działania usługi:
          </p>
          <ul className="space-y-2 list-none">
            <Li>
              <strong>Niezbędne pliki cookie (Strictly Necessary Cookies):</strong> Wykorzystywane przez system Supabase do przechowywania bezpiecznych tokenów sesji, dzięki którym nie musisz logować się ponownie przy odświeżeniu strony.
            </Li>
            <Li>
              <strong>Pamięć lokalna (localStorage):</strong> Wykorzystywana do zapisywania Twoich preferencji interfejsu (np. trybu jasnego/ciemnego).
            </Li>
          </ul>
        </Section>

        <Section title="9. Okres przechowywania danych">
          <ul className="space-y-2 list-none">
            <Li>Dane podstawowe (treści użytkownika) – przez czas istnienia konta w aplikacji.</Li>
            <Li>Tokeny integracji kalendarzowych – wyłącznie do momentu odłączenia kalendarza lub usunięcia konta głównego.</Li>
            <Li>Token i konfiguracja integracji ze Slackiem – do momentu odłączenia Slacka lub usunięcia konta.</Li>
            <Li>Subskrypcje powiadomień push – do momentu wyłączenia powiadomień, wygaśnięcia subskrypcji w przeglądarce lub usunięcia konta.</Li>
            <Li>Skrót tokenu Skrótów Siri – do momentu jego unieważnienia, wygenerowania nowego tokenu lub usunięcia konta.</Li>
            <Li>Logi błędów systemowych – maksymalnie do 30 dni.</Li>
          </ul>
        </Section>

        <Section title="10. Ochrona prywatności dzieci">
          <p>
            Aplikacja nie jest przeznaczona dla osób poniżej 13. roku życia i nie gromadzi świadomie danych osobowych od dzieci. W przypadku powzięcia informacji o takich danych, zostaną one niezwłocznie usunięte.
          </p>
        </Section>
        
        <p className="text-sm mt-12 text-text-muted pt-4">
          W razie wprowadzenia istotnych zmian do Polityki Prywatności, zaktualizowana zostanie data &quot;Obowiązuje od&quot; na górze dokumentu.
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-text mb-4">{title}</h2>
      <div className="text-text-secondary leading-relaxed text-sm space-y-2">{children}</div>
    </section>
  );
}

function Li({ children }: { readonly children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  );
}
