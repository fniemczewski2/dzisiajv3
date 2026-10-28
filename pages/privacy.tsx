// pages/privacy.tsx

import Seo from "@/components/ui/SEO";
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <Seo
        title="Polityka prywatności"
        description="Polityka prywatności aplikacji Dzisiaj.Fun: jakie dane przetwarzamy, w jakim celu, komu je przekazujemy, jak długo je przechowujemy i jakie masz prawa."
        canonical="https://dzisiaj.fun/privacy"
        keywords="prywatność, rodo, regulamin, ochrona danych, polityka prywatności, google calendar, outlook"
      />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="page-title mb-2 sm:text-4xl">Polityka Prywatności</h1>
        <p className="mb-10 border-b border-line pb-4 text-sm text-text-muted">
          Obowiązuje od: 18 października 2026 r. &nbsp;•&nbsp; Aplikacja: Dzisiaj.Fun
        </p>

        <Section title="1. Administrator danych">
          <p>
            Administratorem Twoich danych osobowych przetwarzanych w aplikacji <strong>Dzisiaj.Fun</strong> (dostępnej
            pod adresem{" "}
            <a href="https://dzisiaj.fun" className="text-primary hover:underline">
              dzisiaj.fun
            </a>
            {") jest "}
            <strong>Franciszek Niemczewski - Usługi IT</strong> z siedzibą w Baranówku, NIP: 7773460003.
          </p>
          <p className="mt-2">
            W sprawach związanych z prywatnością i ochroną danych możesz kontaktować się pod adresem e-mail:{" "}
            <a href="mailto:f.niemczewski@dzisiaj.fun" className="text-primary hover:underline">
              f.niemczewski@dzisiaj.fun
            </a>
            {"."}
          </p>
        </Section>

        <Section title="2. Jakie dane zbieramy i dlaczego?">
          <p className="mb-3">
            Aplikacja służy do zarządzania produktywnością oraz oferuje funkcję agregacji zewnętrznych kalendarzy.
            Zbieramy wyłącznie dane niezbędne do działania usługi:
          </p>
          <ul className="list-none space-y-3">
            <Li>
              <strong>Dane wprowadzane przez użytkownika:</strong>{" "}
              <span>
                Zadania, notatki, rachunki, nawyki, miejsca i inne treści, które samodzielnie dodajesz do lokalnej bazy
                aplikacji.
              </span>
            </Li>
            <Li>
              <strong>Dane z kont Google i Microsoft:</strong>{" "}
              <span>
                Adres e-mail oraz nazwa użytkownika (pobierane w momencie logowania przez system OAuth), służące do
                identyfikacji konta. <strong>Nie zbieramy i nie mamy dostępu do Twoich haseł.</strong>
              </span>
            </Li>
            <Li>
              <strong>Wydarzenia z kalendarzy (Google Calendar / Microsoft Outlook):</strong>{" "}
              <span>
                Za Twoją wyraźną zgodą pobieramy tytuły, godziny rozpoczęcia i zakończenia, opisy oraz lokalizacje
                wydarzeń w celu ich wyświetlenia na wspólnej siatce kalendarza wewnątrz aplikacji Dzisiaj.Fun.
              </span>
            </Li>
            <Li>
              <strong>Tokeny autoryzacyjne (OAuth):</strong>{" "}
              <span>
                Jeśli połączysz aplikację z zewnętrznym kalendarzem, przechowujemy token dostępu i token odświeżania.
                Umożliwiają one synchronizację kalendarza w tle. Tokeny są przechowywane w bezpiecznej, zaszyfrowanej
                bazie danych.
              </span>
            </Li>
            <Li>
              <strong>Integracja ze Slackiem (opcjonalna):</strong>{" "}
              <span>
                Jeśli połączysz konto Slack, przechowujemy identyfikator i nazwę przestrzeni roboczej, Twój
                identyfikator użytkownika Slack oraz zaszyfrowany token dostępu. Aplikacja prosi o uprawnienia do
                odczytu i zapisu list Slacka (<em>lists:read</em>, <em>lists:write</em>), odczytu plików{" ("}
                <em>files:read</em>) oraz odczytu użytkowników i ich adresów e-mail (<em>users:read</em>,{" "}
                <em>users:read.email</em>) – te ostatnie służą do dopasowania osób przypisanych do elementów listy. Z
                wybranymi przez Ciebie listami synchronizowane są tytuł, opis, termin, priorytet i status zadań, w obie
                strony.
              </span>
            </Li>
            <Li>
              <strong>Powiadomienia push (opcjonalne):</strong>{" "}
              <span>
                Po włączeniu powiadomień przechowujemy subskrypcję Web Push Twojej przeglądarki: adres usługi
                powiadomień i klucze szyfrujące. Treść powiadomień (np. przypomnienia) zapisujemy w bazie danych w
                postaci jawnej, aby pokazać ją w historii powiadomień. Podczas wysyłki na urządzenie jest dodatkowo
                szyfrowana zgodnie ze standardem Web Push.
              </span>
            </Li>
            <Li>
              <strong>Skróty Siri – automatyczny czas pracy (opcjonalne):</strong>{" "}
              <span>
                Po wygenerowaniu tokenu w ustawieniach przechowujemy wyłącznie jego skrót kryptograficzny (SHA-256),
                datę utworzenia i datę ostatniego użycia – samego tokenu nie da się z nich odtworzyć. Skrót wywołany na
                Twoim urządzeniu tworzy lub zamyka wpis czasu pracy z godziną rozpoczęcia albo zakończenia.
              </span>
            </Li>
            <Li>
              <strong>Lokalizacja (opcjonalna):</strong>{" "}
              <span>
                Tylko po udzieleniu zgody w przeglądarce. Współrzędne służą do pokazania pogody, najbliższych
                przystanków i nazwy miejscowości. Ostatnia pozycja jest zapamiętywana wyłącznie w Twojej przeglądarce
                (nie w naszej bazie) i usuwana przy wylogowaniu.
              </span>
            </Li>
            <Li>
              <strong>Finanse:</strong>{" "}
              <span>
                Transakcje, płatności cykliczne i kategorie budżetu, które wpisujesz lub importujesz z pliku CSV z
                banku. Plik jest przetwarzany w przeglądarce; do bazy trafiają tylko zaimportowane transakcje.
              </span>
            </Li>
            <Li>
              <strong>Nastrój (opcjonalny):</strong>{" "}
              <span>
                Wpisy w module nastroju mogą ujawniać informacje o Twoim samopoczuciu, czyli dane o zdrowiu (art. 9
                RODO). Zapisujemy je dopiero po Twojej wyraźnej zgodzie wyrażonej w module – zapamiętujemy datę zgody i
                wersję treści, na którą się zgodziłeś; po zmianie treści poprosimy o zgodę ponownie. Zgodę cofniesz w
                Ustawieniach → Nawyki i plan dnia – wszystkie wpisy nastroju zostaną wtedy usunięte.
              </span>
            </Li>
            <Li>
              <strong>Dane innych osób, które wprowadzasz:</strong>{" "}
              <span>
                Kontakty w module Osoby (imię, nazwisko, telefon, e-mail, data urodzin), adresy e-mail zaufanych osób,
                którym udostępniasz zadania, oraz dane w protokołach i pismach. Wprowadzasz je na własny użytek; dbaj,
                by te osoby wiedziały, że je przechowujesz.
              </span>
            </Li>
            <Li>
              <strong>Uczestnicy ankiet terminów:</strong>{" "}
              <span>
                Osoby, które odpowiadają na Twoją ankietę (także bez konta), podają imię, opcjonalnie e-mail, oraz
                zaznaczają terminy – zob. punkt 11.
              </span>
            </Li>
            <Li>
              <strong>Dane techniczne:</strong>{" "}
              <span>
                Logi błędów aplikacji z identyfikatorem konta, opisem błędu i datą (bez treści Twoich notatek czy zadań)
                – do diagnozowania problemów, przez 30 dni. Daty korzystania z aplikacji (bez godzin i szczegółów) – do
                liczenia serii w module postępów. Adres IP i identyfikator konta są przez krótki czas (do kilkunastu
                minut) używane do ograniczania liczby żądań, aby chronić usługę przed nadużyciami.
              </span>
            </Li>
          </ul>
        </Section>

        <Section title="3. Zgodność z API dostawców (Google i Microsoft)">
          <p className="mb-3">
            Nasza aplikacja korzysta z oficjalnych interfejsów API do komunikacji z Twoimi kontami w sposób bezpieczny i
            w pełni transparentny:
          </p>

          <div className="my-4 rounded-lg border border-line bg-surface p-5">
            <p className="mb-2 font-semibold text-text">Klauzula Google (Google API Services User Data Policy):</p>
            <p className="text-sm">
              Wykorzystanie przez aplikację &quot;Dzisiaj.Fun&quot; informacji otrzymanych z interfejsów API Google oraz
              ich przekazywanie do innych aplikacji będzie w pełni zgodne z{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Zasadami dotyczącymi danych użytkownika usług interfejsu API Google
              </a>
              {", w tym"} z wymogami ograniczonego użytkowania (Limited Use requirements).
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm">
              <li>
                Dane używane są <strong>wyłącznie</strong> do funkcji kalendarza oraz poczty (odczyt, odpowiedź i
                tworzenie zadań lub wydarzeń na Twoje żądanie).
              </li>
              <li>
                Dane <strong>nie są</strong> sprzedawane, udostępniane podmiotom trzecim ani wykorzystywane do
                profilowania czy wyświetlania reklam.
              </li>
            </ul>
          </div>
        </Section>

        <Section title="4. Usuwanie danych i odłączanie kont">
          <p>
            W każdej chwili możesz odłączyć integrację z Google Calendar lub Microsoft Outlook z poziomu ustawień
            kalendarza w aplikacji.
          </p>
          <p className="mt-2">
            Pozostałe integracje wyłączysz w Ustawieniach: odłączenie Slacka usuwa token dostępu i konfigurację list
            (elementy już utworzone w Slacku pozostają w Twojej przestrzeni roboczej), wyłączenie powiadomień usuwa
            subskrypcję push, a unieważnienie tokenu Skrótów Siri usuwa jego skrót – skrót na telefonie przestaje wtedy
            działać.
          </p>
          <p className="mt-2">
            <strong>Kopia i usunięcie wszystkich danych:</strong> w Ustawieniach → Użytkownik pobierzesz kopię
            wszystkich swoich danych w pliku JSON (bez tokenów dostępu) i usuniesz konto. Plik większy niż 4 MB
            przygotowujemy w prywatnym magazynie i udostępniamy przez link ważny 10 minut; usuwamy go przy kolejnym
            eksporcie albo przy usunięciu konta. Usunięcie konta kasuje wszystkie Twoje dane z bazy, pliki w magazynie,
            Twoje odpowiedzi w ankietach innych osób oraz konto logowania; dane w przeglądarce są czyszczone przy
            wylogowaniu.
          </p>
          <p className="mt-2">
            <strong>Skutki odłączenia:</strong> Odłączenie konta powoduje natychmiastowe i bezpowrotne usunięcie z
            naszej bazy danych Twoich tokenów dostępowych, przypisanego adresu e-mail oraz pobranych wydarzeń. Aplikacja
            natychmiastowo traci dostęp do Twoich zewnętrznych kalendarzy.
          </p>
        </Section>

        <Section title="5. Podstawa prawna przetwarzania (RODO)">
          <ul className="list-none space-y-2">
            <Li>
              <strong>Umowa</strong> (art. 6 ust. 1 lit. b RODO) – przetwarzanie niezbędne do świadczenia usługi dostępu
              do aplikacji.
            </Li>
            <Li>
              <strong>Zgoda</strong> (art. 6 ust. 1 lit. a RODO) – integracje z kalendarzami Google i Microsoft oraz ze
              Slackiem, powiadomienia push i Skróty Siri są dobrowolne i włączasz je samodzielnie (w przypadku Google,
              Microsoft i Slacka – przez wyraźną zgodę w procesie OAuth).
            </Li>
            <Li>
              <strong>Zgoda</strong> (art. 6 ust. 1 lit. a RODO) – lokalizacja: przeglądarka pyta o nią przy pierwszym
              użyciu funkcji pogody lub transportu; zgodę cofniesz w ustawieniach przeglądarki.
            </Li>
            <Li>
              <strong>Wyraźna zgoda</strong> (art. 9 ust. 2 lit. a RODO) – wpisy w module nastroju, które mogą stanowić
              dane o zdrowiu. Zgodę wyrażasz przyciskiem, a cofasz w Ustawieniach (wpisy są wtedy usuwane).
            </Li>
            <Li>
              <strong>Uzasadniony interes</strong> (art. 6 ust. 1 lit. f RODO) – logi błędów i ograniczanie liczby żądań
              (stabilność i bezpieczeństwo usługi) oraz obsługa ankiet terminów dla uczestników bez konta.
            </Li>
          </ul>
        </Section>

        <Section title="6. Bezpieczeństwo i odbiorcy danych">
          <p className="mb-3">
            <strong>Nie sprzedajemy, nie wynajmujemy i nie przekazujemy</strong> Twoich danych reklamodawcom ani
            brokerom danych. Połączenia są szyfrowane (HTTPS), dostęp do danych w bazie ogranicza reguła „tylko
            właściciel” (Row Level Security), a tokeny integracji są szyfrowane algorytmem AES-256-GCM. Dane
            przetwarzają w naszym imieniu lub otrzymują je – tylko w zakresie potrzebnym do danej funkcji – następujący
            odbiorcy:
          </p>
          <ul className="list-none space-y-2">
            <Li>
              <strong>Supabase Inc.</strong> – baza danych w regionie UE (eu-north-1, Sztokholm), logowanie, magazyn
              plików i funkcje serwerowe; siedziba spółki w USA.
            </Li>
            <Li>
              <strong>Vercel Inc.</strong> (USA) – hosting aplikacji.
            </Li>
            <Li>
              <strong>Cloudflare, Inc.</strong> (USA) – przekierowania poczty na adres aplikacji (tylko jeśli z nich
              korzystasz).
            </Li>
            <Li>
              <strong>Upstash Inc.</strong> (USA) – krótkotrwałe liczniki żądań (adres IP lub identyfikator konta) do
              ochrony przed nadużyciami.
            </Li>
            <Li>
              <strong>Google LLC / Microsoft Corp.</strong> (USA) – logowanie oraz, po połączeniu, synchronizacja
              kalendarzy oraz odczyt i wysyłka poczty na Twoje żądanie.
            </Li>
            <Li>
              <strong>Slack Technologies, LLC</strong> (USA) – tylko po połączeniu konta Slack: wymiana danych zadań z
              wybranymi listami.
            </Li>
            <Li>
              <strong>Usługi powiadomień przeglądarek</strong> (Google, Apple, Mozilla, Microsoft) – tylko po włączeniu
              powiadomień: przekazują powiadomienie w postaci zaszyfrowanej (Web Push).
            </Li>
            <Li>
              <strong>Open-Meteo</strong> (Szwajcaria) – prognoza pogody i jakość powietrza; przeglądarka wysyła
              współrzędne bezpośrednio do tej usługi.
            </Li>
            <Li>
              <strong>Photon / komoot GmbH</strong> (Niemcy) – nazwa miejscowości dla przybliżonych współrzędnych
              (zaokrąglonych do ok. 100 m), przez nasz serwer.
            </Li>
            <Li>
              <strong>Przewoźnicy i zarządcy infrastruktury</strong> – PEKA (Poznań), ZDiTM (Szczecin), PKP Polskie
              Linie Kolejowe S.A.: nazwy przystanków i stacji oraz numery pociągów potrzebne do pokazania odjazdów,
              przez nasz serwer (bez danych konta).
            </Li>
            <Li>
              <strong>The Movie Database (TMDB)</strong> – wyszukiwanie filmów i seriali (sam tytuł, przez nasz serwer).
            </Li>
            <Li>
              <strong>Narodowy Bank Polski</strong> – kursy walut w kalkulatorze (zapytanie bez danych osobowych).
            </Li>
            <Li>
              <strong>Wydawcy kanałów RSS</strong> wybranych przez Ciebie – pobieramy je z naszego serwera, bez danych
              konta.
            </Li>
          </ul>
          <p className="mt-3">
            <strong>Przekazywanie poza Europejski Obszar Gospodarczy:</strong> część odbiorców ma siedzibę w USA.
            Przekazanie odbywa się na podstawie decyzji Komisji Europejskiej stwierdzającej odpowiedni stopień ochrony
            (EU-US Data Privacy Framework) – dla podmiotów certyfikowanych – albo standardowych klauzul umownych (art.
            46 ust. 2 lit. c RODO). Kopię zabezpieczeń możesz otrzymać, pisząc na adres z punktu 1. Szwajcaria ma
            decyzję Komisji stwierdzającą odpowiedni stopień ochrony.
          </p>
        </Section>

        <Section title="7. Twoje prawa">
          <p className="mb-3">Zgodnie z przepisami prawa (m.in. RODO), przysługuje Ci prawo do:</p>
          <ul className="list-none space-y-2">
            <Li>
              <strong>Dostępu</strong> do swoich danych oraz <strong>sprostowania</strong> danych nieprawidłowych.
            </Li>
            <Li>
              <strong>Usunięcia danych (&quot;prawo do bycia zapomnianym&quot;)</strong> – w każdej chwili możesz
              zażądać całkowitego usunięcia konta oraz wszystkich zgromadzonych informacji.
            </Li>
            <Li>
              <strong>Ograniczenia przetwarzania</strong>, <strong>sprzeciwu</strong> wobec przetwarzania na podstawie
              uzasadnionego interesu oraz <strong>przenoszenia danych</strong> – kopię w formacie JSON pobierzesz sam w
              Ustawieniach.
            </Li>
            <Li>
              <strong>Cofnięcia zgody</strong> na integracje zewnętrzne bez wpływu na zgodność z prawem przetwarzania
              przed jej cofnięciem.
            </Li>
            <Li>
              <strong>Wniesienia skargi</strong> do Prezesa Urzędu Ochrony Danych Osobowych (PUODO).
            </Li>
          </ul>
        </Section>

        <Section title="8. Pliki cookie i pamięć przeglądarki">
          <p className="mb-2">
            Aplikacja <strong>nie używa</strong> plików cookie ani innych technologii w celach marketingowych,
            śledzących czy analitycznych. Zapisujemy w Twojej przeglądarce tylko to, co jest niezbędne do działania
            usługi albo czego używasz:
          </p>
          <ul className="list-none space-y-2">
            <Li>
              <strong>Cookie sesji (sb-…)</strong> – utrzymanie zalogowania; usuwane przy wylogowaniu.
            </Li>
            <Li>
              <strong>Cookie stanu logowania OAuth</strong> (Google, Outlook, Slack) – zabezpieczenie procesu łączenia
              konta; ważne 10 minut.
            </Li>
            <Li>
              <strong>Cookie „gps_permission”</strong> – zapamiętuje, czy zgodziłeś się na lokalizację (bez
              współrzędnych); ważne rok.
            </Li>
            <Li>
              <strong>localStorage</strong> – motyw jasny/ciemny, zamknięcie tej informacji, ostatnia pozycja (jeśli
              użyłeś lokalizacji), obserwowane tablice odjazdów, ustawienie powiadomień oraz token pozwalający poprawić
              odpowiedź w ankiecie terminów. Dane związane z kontem są usuwane przy wylogowaniu.
            </Li>
            <Li>
              <strong>IndexedDB</strong> – kopia ostatnio pobranych list (do pracy bez sieci) i zapisy wykonane bez
              sieci, czekające na wysłanie. Usuwane przy wylogowaniu i przy zalogowaniu innej osoby na tym urządzeniu.
            </Li>
            <Li>
              <strong>Pamięć service workera</strong> – pliki aplikacji (skrypty, style, ikony), bez Twoich danych.
            </Li>
          </ul>
          <p className="mt-2">
            Te zapisy są niezbędne do świadczenia usługi, o którą prosisz, więc nie wymagają odrębnej zgody (wyjątek dla
            zapisów niezbędnych do świadczenia usługi przewidziany w przepisach o plikach cookie).
          </p>
        </Section>

        <Section title="9. Okres przechowywania danych">
          <ul className="list-none space-y-2">
            <Li>Dane podstawowe (treści użytkownika) – przez czas istnienia konta w aplikacji.</Li>
            <Li>
              Tokeny integracji kalendarzowych – wyłącznie do momentu odłączenia kalendarza lub usunięcia konta
              głównego.
            </Li>
            <Li>Token i konfiguracja integracji ze Slackiem – do momentu odłączenia Slacka lub usunięcia konta.</Li>
            <Li>Tokeny kont poczty (Gmail, Outlook) – do momentu odłączenia konta lub usunięcia konta głównego.</Li>
            <Li>Wiadomości przekierowane na adres aplikacji – 72 godziny, po czym są automatycznie usuwane.</Li>
            <Li>Skrót tokenu adresu przekierowania – do jego odwołania lub usunięcia konta.</Li>
            <Li>
              Identyfikatory wiadomości usuniętych z aplikacji (bez treści) – do odłączenia konta poczty lub usunięcia
              konta głównego.
            </Li>
            <Li>
              Subskrypcje powiadomień push – do momentu wyłączenia powiadomień, wygaśnięcia subskrypcji w przeglądarce
              lub usunięcia konta.
            </Li>
            <Li>
              Skrót tokenu Skrótów Siri – do momentu jego unieważnienia, wygenerowania nowego tokenu lub usunięcia
              konta.
            </Li>
            <Li>Logi błędów – 30 dni (usuwane automatycznie każdej nocy).</Li>
            <Li>Liczniki ograniczania żądań – od kilkudziesięciu sekund do kilkunastu minut.</Li>
            <Li>
              Odpowiedzi w ankietach terminów – do usunięcia ankiety przez organizatora, usunięcia jego konta albo
              usunięcia odpowiedzi na prośbę uczestnika.
            </Li>
          </ul>
        </Section>

        <Section title="10. Ochrona prywatności dzieci">
          <p>
            Z aplikacji mogą samodzielnie korzystać osoby, które ukończyły 16 lat (art. 8 RODO). Nie gromadzimy
            świadomie danych osób młodszych; jeśli dowiemy się o takim koncie, usuniemy je wraz z danymi. Osoba poniżej
            16 lat może korzystać z aplikacji tylko za zgodą rodzica lub opiekuna prawnego.
          </p>
        </Section>

        <section id="ankiety" className="mb-10 scroll-mt-6">
          <h2 className="section-title mb-4">11. Informacja dla uczestników ankiet terminów</h2>
          <div className="space-y-2 text-sm leading-relaxed text-text-secondary">
            <p>
              Jeśli odpowiadasz na ankietę terminów (adres <code>dzisiaj.fun/meet/…</code>), Twoje dane – imię,
              opcjonalnie adres e-mail i zaznaczone terminy – otrzymuje <strong>organizator ankiety</strong>, który je
              wykorzystuje do ustalenia terminu spotkania. Za techniczną obsługę ankiety i bezpieczeństwo danych
              odpowiada administrator z punktu 1.
            </p>
            <p>
              Podstawa prawna: uzasadniony interes organizatora i uczestników w umówieniu spotkania (art. 6 ust. 1 lit.
              f RODO). Podanie e-maila jest dobrowolne – organizator może dzięki niemu wysłać zaproszenie. Dane są
              przechowywane do usunięcia ankiety, usunięcia konta organizatora albo do Twojego żądania usunięcia.
              Przysługują Ci prawa opisane w punkcie 7, w tym prawo sprzeciwu; skontaktuj się z organizatorem albo z
              administratorem pod adresem z punktu 1.
            </p>
          </div>
        </section>

        <section id="poczta" className="mb-10 scroll-mt-6">
          <h2 className="section-title mb-4">12. Poczta (Gmail, Outlook i przekierowania)</h2>
          <div className="space-y-2 text-sm leading-relaxed text-text-secondary">
            <p>
              Po podłączeniu konta Gmail lub Outlook aplikacja pokazuje listę ostatnich wiadomości z folderu
              odbiorczego, odczytuje treść wybranej wiadomości na Twoje żądanie, wysyła odpowiedź w wątku wyłącznie po
              Twoim potwierdzeniu oraz tworzy z wiadomości zadanie („Odpowiedz: temat”) lub wydarzenie (z zaproszenia).
            </p>
            <p>
              <strong>Treść wiadomości nie jest zapisywana w bazie danych.</strong> Zapisujemy adres podłączonego konta,
              zaszyfrowane tokeny dostępu oraz – w zadaniu – wyłącznie nadawcę. Wydarzenie z zaproszenia zawiera termin,
              miejsce i linki do konferencji.
            </p>
            <p>
              Wiadomości przekierowane na adres aplikacji są przechowywane zaszyfrowane przez 72 godziny, po czym są
              usuwane. Możesz je usunąć wcześniej.
            </p>
            <p>
              Aplikacja jest w trakcie weryfikacji przez Google. Do czasu jej zakończenia połączenie konta Gmail jest
              dostępne tylko dla wybranych kont testowych.
            </p>
            <p>
              Podstawa prawna: zgoda (art. 6 ust. 1 lit. a RODO) oraz świadczenie usługi (art. 6 ust. 1 lit. b RODO).
              Wiadomości zawierają dane osób trzecich (nadawców i odbiorców). Przetwarzamy je wyłącznie na Twoje
              żądanie, w celu wyświetlenia, odpowiedzi lub utworzenia zadania, i nie kontaktujemy się z tymi osobami.
            </p>
            <p>
              Wiadomość możesz usunąć z aplikacji – zapisujemy wtedy wyłącznie jej identyfikator, żeby nie wyświetlać
              jej ponownie. Usunięcie w poczcie następuje tylko po Twoim wyborze i polega na przeniesieniu wiadomości do
              kosza (Gmail) lub folderu „Elementy usunięte” (Outlook), skąd można ją przywrócić.
            </p>
            <p>
              Odłączenie konta, odwołanie adresu przekierowania i usunięcie wiadomości z bufora są dostępne w
              ustawieniach poczty. Uprawnienia możesz też cofnąć w ustawieniach konta Google lub Microsoft.
            </p>
          </div>
        </section>

        <p className="mt-12 pt-4 text-sm text-text-muted">
          W razie wprowadzenia istotnych zmian do Polityki Prywatności, zaktualizowana zostanie data &quot;Obowiązuje
          od&quot; na górze dokumentu.
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="section-title mb-4">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

function Li({ children }: { readonly children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span className="flex-1">{children}</span>
    </li>
  );
}
