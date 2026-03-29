import React from 'react';
import {
  Activity,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Wallet,
  Settings,
  Dumbbell,
  ShoppingCart,
  Clapperboard,
  Pen,
  Backpack,
  Sun,
  Logs,
  Timer,
  CookingPot,
  ChartColumnBig,
  Calculator,
  Bus,
  MapPin,
  Droplet,
  ScrollText,
  RefreshCw,
  Trophy,
  Smile,
} from 'lucide-react';

export type GuideSection = {
  id: string;
  title: string;
  mainIcon: React.ReactNode;
  iconColorClass: string;
  listItems: React.ReactNode[];
};

const K = ({ children }: { children: React.ReactNode }) => (
  <strong className="text-text font-semibold">{children}</strong>
);

export const guideSections: GuideSection[] = [

  {
    id: 'dashboard',
    title: 'Kokpit główny (Dzisiaj)',
    mainIcon: <LayoutDashboard className="w-6 h-6" />,
    iconColorClass: 'text-primary',
    listItems: [
      <>
        <K>Centrum dowodzenia.</K> Widok główny zbiera w jednym miejscu wszystko, co istotne na dziś: plan dnia, listę zadań, wydarzenia z kalendarza, widgety nawyków, wody i nastroju oraz kamienie milowe z celów.
      </>,
      <>
        <K>Oś czasu 06:00–23:00.</K> Lewa kolumna to interaktywny harmonogram dnia podzielony na godziny. Wyświetla zadania zaplanowane na konkretną godzinę, wpisy z aktywnego schematu dnia i wydarzenia z kalendarza.
      </>,
      <>
        <K>Przeciągnij i upuść.</K> Zadania z listy po prawej możesz przeciągnąć na dowolną godzinę na osi czasu. Aplikacja zapamięta ten czas. Już umieszczone elementy możesz przesuwać między slotami. 
      </>,
      <>
        <K>Widgety na górze strony.</K> Tuż nad główną treścią widoczne są: ikony nawyków, pasek wody, tracker nastroju i pole dziennych wydatków. Możesz je aktualizować bezpośrednio z kokpitu, bez przechodzenia do innej sekcji.
      </>,
      <>
        <K>Inteligentne skróty.</K> Jeśli tytuł zadania lub wydarzenia zawiera słowa kluczowe, przy elemencie pojawia się ikonka skrótu:<ul><li><em>trening</em> → Trening,</li><li><em>zakupy</em> → Listy zakupów,</li><li> <em>spotkanie</em> → Sprawozdania,</li><li> <em>film</em> → Filmy.</li></ul>
      </>,
      <>
        <K>Licznik ukończenia.</K> W nagłówku sekcji zadań widoczny jest wskaźnik <em>wykonane/wszystkie</em> dla bieżącego dnia, np. 3/7.
      </>,
    ],
  },

  {
    id: 'day_schema',
    title: 'Schematy dnia',
    mainIcon: <Logs className="w-6 h-6" />,
    iconColorClass: 'text-purple-500',
    listItems: [
      <>
        <K>Automatyczne bloki czasowe.</K> Schemat to zestaw wpisów (godzina + etykieta) przypisanych do wybranych dni tygodnia. Gdy nastanie właściwy dzień, wpisy schematu automatycznie pojawiają się na osi czasu kokpitu jako szare bloki.
      </>,
      <>
        <K>Tworzenie schematu.</K> Wejdź na stronę <em>Plan dnia</em>, kliknij <em>Dodaj</em>, nadaj nazwę, zaznacz dni tygodnia i dodaj wpisy. Każdy wpis to para: godzina i etykieta (np. 08:00 / Praca, 13:00 / Obiad).
      </>,
      <>
        <K>Wiele schematów.</K> Możesz mieć wiele schematów przypisanych do różnych dni. Jeśli dany dzień pasuje do kilku schematów, wyświetlony zostanie pierwszy pasujący.
      </>,
      <>
        <K>Różnica między schematem a zadaniem.</K> Schematy to stałe rutyny — nie mają statusu "wykonane" i wracają każdego tygodnia. Zadania to jednorazowe czynności z priorytetem i możliwością odhaczenia.
      </>,
    ],
  },

  {
    id: 'habits',
    title: 'Codzienne nawyki',
    mainIcon: <Activity className="w-6 h-6" />,
    iconColorClass: 'text-indigo-500',
    listItems: [
      <>
        <K>Osiem ikon na kokpicie.</K> Każda reprezentuje jeden nawyk: Leki, Higiena, Trening, Relacje, Praca, Dom, Higiena cyfrowa, Języki obce. Kliknij ikonę, by oznaczyć nawyk jako wykonany.
      </>,
      <>
        <K>Dane historyczne.</K> Widok szczegółów dnia w kalendarzu pokazuje, które nawyki były odhaczone w wybranym dniu. Możesz wracać do poprzednich dat i uzupełniać zaległe wpisy.
      </>,
      <>
        <K>Personalizacja.</K> W Ustawieniach możesz ukryć niepotrzebne nawyki — ikona zniknie z kokpitu. Nie powoduje to usunięcia historycznych danych.
      </>,
      <>
        <K>Reset.</K> Reset następuje automatycznie o północy — każdy dzień zaczyna się od zera.
      </>,
    ],
  },

  {
    id: 'water_tracker',
    title: 'Tracker wody',
    mainIcon: <Droplet className="w-6 h-6" />,
    iconColorClass: 'text-cyan-500',
    listItems: [
      <>
        <K>Suwak. </K> Przesuń pasek lub kliknij w dowolne miejsce, by zaktualizować ilość wypitej wody. Wartość zapisuje się natychmiast. Cel to 2 litry dziennie.
      </>,
      <>
        <K>Dostępność.</K> Widget widoczny jest na kokpicie głównym oraz w widoku szczegółów dnia w kalendarzu. Możesz uzupełniać wartości dla poprzednich dni.
      </>,
      <>
        <K>Wyłączanie widgetu.</K> Jeśli nie potrzebujesz trackera wody, ukryj go w Ustawieniach (przełącznik <em>Pokaż tracker wody</em>). Historia danych zostaje zachowana.
      </>,
    ],
  },

  {
    id: 'mood_tracker',
    title: 'Śledzenie nastroju',
    mainIcon: <Smile className="w-6 h-6" />,
    iconColorClass: 'text-pink-500',
    listItems: [
      <>
        <K>Dzienne oznaczenie.</K> Widget nastroju pokazuje kolorowe przyciski z etykietami. Kliknij jeden, by zapisać nastrój na dziś. Kliknięcie tego samego przycisku ponownie cofnie wybór.
      </>,
      <>
        <K>Widoczność w kalendarzu.</K> Każdy dzień z zapisanym nastrojem jest oznaczony kolorową kropką w komórce kalendarza miesięcznego — na komputerze w rogu, na telefonie jako mały wskaźnik.
      </>,
      <>
        <K>Konfiguracja.</K> W Ustawieniach możesz zmieniać etykiety, kolory (6 gotowych presetów + dowolny color picker) oraz usuwać lub dodawać opcje (limit 10). Zmiany są widoczne natychmiast.
      </>,
      <>
        <K>Włączanie modułu.</K> Nastrój jest domyślnie włączony. Możesz go wyłączyć przełącznikiem <em>Pokaż śledzenie nastroju</em> w Ustawieniach.
      </>,
    ],
  },

  {
    id: 'tasks_list',
    title: 'Lista zadań',
    mainIcon: <CheckSquare className="w-6 h-6" />,
    iconColorClass: 'text-green-500',
    listItems: [
      <>
        <K>Priorytety 1–5.</K> Priorytet 1 to najważniejsze (kolor czerwony), 5 to najmniej pilne (zielony). Możesz sortować zadania według priorytetu, daty lub alfabetycznie — wybierz w Ustawieniach.
      </>,
      <>
        <K>Filtry czasowe.</K> Pasek filtrów nad listą pozwala wyświetlić zadania z: wczoraj, dzisiaj, jutra, pojutrze lub wszystkie naraz. 
      </>,
      <>
        <K>Etykieta czasowa.</K> Każde zadanie ma kolorowy znacznik informujący o kontekście czasowym. Etykiety aktualizują się automatycznie o północy.
      </>,
      <>
        <K>Odłożenie na jutro.</K> Przycisk <em>Odłóż</em> przesuwa datę zadania o jeden dzień bez otwierania formularza edycji.
      </>,
      <>
        <K>Timer przy zadaniu.</K> Kliknij tytuł zadania lub przycisk <em>Timer</em>, by uruchomić stoper bezpośrednio na karcie. Po zakończeniu sesji (min. 60 sekund) wynik w minutach zostaje dopisany do opisu zadania.
      </>,
      <>
        <K>Udostępnianie zadań.</K> Przy tworzeniu lub edycji możesz przypisać zadanie innemu użytkownikowi z listy zaufanych. Pojawi się u niego ze statusem <em>Oczekuje akceptacji</em> i wymaga potwierdzenia.
      </>,
      <>
        <K>Animacja ukończenia.</K> Odhaczenie zadania wyzwala animację konfetti z dźwiękiem — ton akordu zmienia się w zależności od priorytetu.
      </>,
    ],
  },

  {
    id: 'reminders',
    title: 'Zadania cykliczne',
    mainIcon: <RefreshCw className="w-6 h-6" />,
    iconColorClass: 'text-teal-500',
    listItems: [
      <>
        <K>Tworzenie.</K> W sekcji Zadania rozwiń panel <em>Zadania cykliczne</em> i kliknij <em>Dodaj</em>. Wpisz tytuł, datę pierwszego pojawienia i interwał w dniach.
      </>,
      <>
        <K>Dostępne akcje.</K> Każde widoczne przypomnienie ma trzy przyciski: <em>Dodaj jako zadanie</em> (tworzy jednorazowe zadanie z odpowiednią datą), <em>Zakończ</em> (oznacza jako wykonane i odlicza kolejny termin), <em>Odłóż</em> (przesuwa termin o jeden interwał do przodu).
      </>,
      <>
        <K>Widoczność.</K> Domyślnie lista pokazuje tylko te przypomnienia, których termin już nadszedł. Kliknij <em>Pokaż wszystkie</em>, by wyświetlić całą bazę cyklicznych.
      </>,
    ],
  },

  {
    id: 'pomodoro',
    title: 'Timer Pomodoro',
    mainIcon: <Timer className="w-6 h-6" />,
    iconColorClass: 'text-red-500',
    listItems: [
      <>
        <K>Technika Pomodoro.</K> Praca w blokach skupienia (domyślnie 25 minut) przeplatanych krótkimi przerwami (5 minut). Pomaga utrzymać koncentrację i zapobiegać wypaleniu.
      </>,
      <>
        <K>Konfiguracja.</K> Kliknij ikonę koła zębatego pod timerem, by zmienić długość bloku pracy i przerwy. Nowe ustawienia wchodzą w życie przy kolejnym starcie timera.
      </>,
      <>
        <K>Nawigacja między fazami.</K> Przyciski <em>Cofnij</em> i <em>Dalej</em> pozwalają ręcznie przechodzić między fazą pracy a przerwą bez czekania na koniec odliczania.
      </>,
      <>
        <K>Dźwięk i blokada ekranu.</K> Po zakończeniu każdej fazy odtwarzany jest sygnał dźwiękowy. Na obsługiwanych urządzeniach timer aktywuje blokadę wygaszania ekranu (Wake Lock).
      </>,
    ],
  },

  {
    id: 'notes',
    title: 'Notatki',
    mainIcon: <Pen className="w-6 h-6" />,
    iconColorClass: 'text-purple-500',
    listItems: [
      <>
        <K>Format listowy.</K> Notatki to listy punktowane — każda linia to osobny element. Ułatwia to edycję, przeglądanie na telefonie i późniejsze rozwijanie treści.
      </>,
      <>
        <K>Automatyczne rozpoznawanie linków.</K> Jeśli wpiszesz URL (z http:// lub bez), aplikacja automatycznie zamieni go w klikalny link otwierający się w nowej karcie.
      </>,
      <>
        <K>Kolory tła.</K> Każdej notatce można przypisać jeden z 5 kolorów: biały, żółty, zielony, niebieski, czerwony. W trybie ciemnym kolory są subtelnie przyciemnione.
      </>,
      <>
        <K>Przypinanie i archiwizacja.</K> Przypięte notatki wyświetlają się zawsze na górze listy. Zarchiwizowane są ukryte (nie usunięte) — przywrócisz je przyciskiem <em>Pokaż</em>.
      </>,
      <>
        <K>Sortowanie.</K> W Ustawieniach możesz wybrać sortowanie po dacie aktualizacji (domyślnie) lub alfabetycznie. Przypięte notatki zawsze są na górze niezależnie od wybranego sortowania.
      </>,
      <>
        <K>Wyszukiwarka.</K> Pole wyszukiwania filtruje notatki w czasie rzeczywistym, przeszukując zarówno tytuły, jak i zawartość każdego elementu listy.
      </>,
    ],
  },

  {
    id: 'reports',
    title: 'Sprawozdania ze spotkań',
    mainIcon: <ScrollText className="w-6 h-6" />,
    iconColorClass: 'text-slate-500',
    listItems: [
      <>
        <K>Struktura protokołu.</K> Każde sprawozdanie zawiera: temat i datę spotkania, agendę (lista punktów), uczestników (z rolami moderatora i sprawozdawcy dla pierwszych dwóch pozycji) oraz zadania z osobą odpowiedzialną i datą.
      </>,
      <>
        <K>Eksport do PDF.</K> Kliknij przycisk <em>PDF</em> na karcie sprawozdania, by pobrać gotowy, sformatowany dokument — idealny do wysłania mailem lub archiwizacji.
      </>,
      <>
        <K>Edycja po fakcie.</K> Możesz wracać do sprawozdań i uzupełniać brakujące dane. Każdą sekcję można rozszerzać o kolejne punkty agendy, uczestników lub zadania za pomocą przycisku <em>Dodaj</em>.
      </>,
    ],
  },

  {
    id: 'calendar',
    title: 'Kalendarz',
    mainIcon: <Calendar className="w-6 h-6" />,
    iconColorClass: 'text-purple-500',
    listItems: [
      <>
        <K>Widok miesięczny.</K> Kalendarz pokazuje cały miesiąc z naniesionymi wydarzeniami. Wielodniowe wydarzenia rozciągają się na kilka komórek. W komórkach widoczna jest liczba zadań i nadmiarowych wydarzeń (+N).
      </>,
      <>
        <K>Polskie święta.</K> Wszystkie święta (stałe i ruchome — Wielkanoc, Poniedziałek Wielkanocny, Boże Ciało) są automatycznie obliczane i oznaczane czerwonym kolorem w kalendarzu oraz w nagłówku aplikacji.
      </>,
      <>
        <K>Szczegóły dnia.</K> Kliknij dowolny dzień, by zobaczyć pełną listę wydarzeń, zadania z tego dnia oraz widgety nawyków, wody, nastroju i dziennych wydatków.
      </>,
      <>
        <K>Urodziny i rocznice.</K> Jeśli tytuł lub opis wydarzenia zawiera słowo <em>urodziny</em>, <em>imieniny</em>, <em>rocznica</em>, w nagłówku aplikacji tego dnia pojawi się nazwa wydarzenia.
      </>,
      <>
        <K>Powtarzanie wydarzeń.</K> Przy tworzeniu możesz ustawić powtarzanie: co tydzień, co miesiąc lub co rok. Powtarzające się instancje generowane są automatycznie bez tworzenia osobnych wpisów w bazie danych.
      </>,
      <>
        <K>Import i eksport .ics.</K> Możesz importować zdarzenia z pliku .ics (np. eksport z Google Calendar) bezpośrednio w formularzu. Każde wydarzenie możesz też pobrać jako plik .ics i dodać do dowolnego kalendarza zewnętrznego.
      </>,
      <>
        <K>Udostępnianie wydarzeń.</K> Przy tworzeniu możesz wskazać innego użytkownika z listy zaufanych — wydarzenie pojawi się w jego kalendarzu.
      </>,
    ],
  },

  {
    id: 'bills',
    title: 'Rachunki i finanse',
    mainIcon: <Wallet className="w-6 h-6" />,
    iconColorClass: 'text-emerald-500',
    listItems: [
      <>
        <K>Wydatki i przychody.</K> Każdy wpis może być wydatkiem (–) lub przychodem (+). Przychody to np. wynagrodzenie, zwroty, wpłaty od innych. Wydatki to stałe opłaty, faktury i zaplanowane zakupy.
      </>,
      <>
        <K>Oznaczanie jako zapłacone.</K> Wydatki mają przycisk <em>Opłać</em>. Po kliknięciu wpis znika z głównej listy (jest schowany, nie usunięty), dzięki czemu lista zawiera wyłącznie nieuregulowane pozycje.
      </>,
      <>
        <K>Udostępnij.</K> Kliknij <em>Wyślij</em> przy rachunku, by skopiować lub wysłać gotową wiadomość z kwotą i opisem — przydatne do żądania zwrotów.
      </>,
      <>
        <K>Grupowanie po miesiącach.</K> Rachunki automatycznie grupowane są według miesięcy, posortowane chronologicznie w obrębie każdej grupy.
      </>,
      <>
        <K>Bieżące wydatki z kokpitu.</K> Widget <em>Wydatki</em> na kokpicie pozwala wpisać sumę drobnych dziennych wydatków bez tworzenia osobnego wpisu w rachunkach. Dane trafiają do budżetu rocznego w kolumnie "bieżące".
      </>,
      <>
        <K>Import wyciągów bankowych.</K> Nowa funkcja "Wczytaj CSV" pozwala wgrać plik z mBanku. Algorytm automatycznie kategoryzuje wydatki i dodaje je do tabeli rachunków.
      </>,
      <>
        <K>Edytor kategorii.</K> Sam decydujesz, jakie tagi są przypisywane do wydatków. W panelu budżetu wejdź w "Kategorie", aby dodać własne.
      </>,
    ],
  },

  {
    id: 'budget',
    title: 'Budżet roczny',
    mainIcon: <ChartColumnBig className="w-6 h-6" />,
    iconColorClass: 'text-teal-500',
    listItems: [
      <>
        <K>Trzy tabele.</K> Strona budżetu rocznego zawiera: tabelę podsumowania (wpływy, wydatki zrealizowane, planowane, pozostało), tabelę bieżących wydatków (budżet vs. dzienne wydatki z nawyków) oraz tabelę godzin pracy.
      </>,
      <>
        <K>Obliczanie godzin pracy.</K> Wpisz stawkę godzinową dla każdego miesiąca (kliknij ikonę edycji). Aplikacja podzieli sumę wydatków przez stawkę i pokaże, ile godzin pracy potrzebujesz na pokrycie kosztów.
      </>,
      <>
        <K>Wydatki bieżące.</K> Każdy rachunek z opisem <em>Bieżące</em> trafia do tabeli bieżących jako planowany budżet na drobne zakupy. Porównanie z faktycznie wydanymi (z dziennego trackera) pokazuje nadwyżkę lub niedobór.
      </>,
      <>
        <K>Nawigacja po latach.</K> Użyj strzałek w górnej części strony, by przeglądać budżety z poprzednich i przyszłych lat. Stawki godzinowe są pamiętane osobno dla każdego roku.
      </>,
    ],
  },

  {
    id: 'calculator',
    title: 'Kalkulator podziału rachunków',
    mainIcon: <Calculator className="w-6 h-6" />,
    iconColorClass: 'text-primary',
    listItems: [
      <>
        <K>Do czego służy.</K> Narzędzie do sprawiedliwego podziału wspólnych kosztów mieszkania (wynajem, czynsz, media) między dwie osoby z uwzględnieniem różnicy w dochodach.
      </>,
      <>
        <K>Algorytm hybrydowy.</K> Każda osoba płaci połowę kwoty stałej (50/50) plus dodatkową część proporcjonalną do swojego dochodu netto. Osoba zarabiająca więcej dopłaca proporcjonalnie więcej — uczciwie, nie po równo.
      </>,
      <>
        <K>Obsługa walut.</K> Dochód każdej osoby można wpisać w PLN lub EUR. Kurs EUR/PLN pobierany jest automatycznie z API NBP. Możesz go też wpisać ręcznie.
      </>,
      <>
        <K>Podatki i ZUS.</K> Podaj procentową zaliczkę PIT i składkę ZUS, by obliczyć dochód netto "na rękę". Kalkulator pokaże kwotę podatku i wynikowy dochód.
      </>,
    ],
  },

  {
    id: 'shopping',
    title: 'Listy zakupów',
    mainIcon: <ShoppingCart className="w-6 h-6" />,
    iconColorClass: 'text-amber-500',
    listItems: [
      <>
        <K>Maksymalnie 5 list.</K> Możesz prowadzić do 5 aktywnych list jednocześnie.
      </>,
      <>
        <K>Odhaczanie produktów.</K> Kliknij checkbox lub tekst produktu, by go przekreślić. Odhaczone produkty zostają na liście (możesz odkliknąć), dzięki czemu lista jest wielokrotnego użytku.
      </>,
      <>
        <K>Udostępnianie w czasie rzeczywistym.</K> Udostępnij listę innemu użytkownikowi — oboje widzicie te same zmiany natychmiast, bez ręcznego odświeżania.
      </>,
      <>
        <K>Sortowanie.</K> W Ustawieniach możesz wybrać sortowanie list zakupów po dacie modyfikacji (domyślnie) lub alfabetycznie.
      </>,
    ],
  },

  {
    id: 'recipes',
    title: 'Przepisy kulinarne',
    mainIcon: <CookingPot className="w-6 h-6" />,
    iconColorClass: 'text-orange-500',
    listItems: [
      <>
        <K>Baza przepisów.</K> Każdy przepis ma nazwę, kategorię (śniadanie, zupa, danie główne, przystawka, sałatka, deser), listę składników i opis przygotowania.
      </>,
      <>
        <K>Autouzupełnianie składników.</K> Przy wpisywaniu składnika aplikacja sugeruje produkty użyte już w innych przepisach. Zatwierdź Enter-em lub przecinkiem. Backspace usuwa ostatni dodany składnik.
      </>,
      <>
        <K>Filtrowanie po składnikach.</K> Kliknij <em>Pokaż filtry</em>, by wyświetlić chmurę tagów. Zaznaczenie kilku składników pokaże tylko przepisy zawierające wszystkie z nich jednocześnie.
      </>,
      <>
        <K>Sortowanie.</K> W Ustawieniach wybierz: według kategorii (domyślnie), alfabetycznie lub według daty dodania.
      </>,
    ],
  },

  {
    id: 'packing',
    title: 'Checklisty pakowania',
    mainIcon: <Backpack className="w-6 h-6" />,
    iconColorClass: 'text-orange-500',
    listItems: [
      <>
        <K>Trzy predefiniowane listy.</K> Aplikacja zawiera: <em>Plecak</em> (codzienny ekwipunek), <em>Walizka</em> (wyjazdy i podróże) oraz <em>Plecak bezpieczeństwa</em> (lista ewakuacyjna).
      </>,
      <>
        <K>Odhaczanie pozycji.</K> Kliknij pozycję lub checkbox, by ją zaznaczyć. Zaznaczone pozycje są przekreślone. 
      </>,
      <>
        <K>Kategorie.</K> Listy podzielone są na kategorie (Apteczka, Elektronika, Odzież itp.), co ułatwia systematyczne pakowanie sekcja po sekcji.
      </>,
    ],
  },

  {
    id: 'transport',
    title: 'Transport miejski',
    mainIcon: <Bus className="w-6 h-6" />,
    iconColorClass: 'text-primary',
    listItems: [
      <>
        <K>Obsługiwane miasta.</K> Moduł obsługuje komunikację miejską na całym świecie. Dane o odjazdach pobierane są w czasie rzeczywistym i odświeżane co 30 sekund.
      </>,
      <>
        <K>Odjazdy GPS.</K> Sekcja <em>Najbliżej (GPS)</em> automatycznie wykrywa Twoją lokalizację i wyświetla przystanki w pobliżu z odległością w metrach.
      </>,
      <>
        <K>Ulubione przystanki.</K> Moduł obsługuje przystanki w Poznaniu i Szczecinie. Kliknij gwiazdkę przy przystanku, by dodać go do ulubionych. Ulubione wyświetlają się zawsze na górze, bez konieczności włączania GPS.
      </>,
      <>
        <K>Wyszukiwarka.</K> Wpisz nazwę przystanku — aplikacja podpowiada pasujące z bazy. Kliknij sugestię, by dodać do ulubionych.
      </>,
      <>
        <K>Odczyt tablicy.</K> Przy każdym odjeździe widoczna jest: linia, kierunek i czas do odjazdu w minutach. Niebieskie minuty oznaczają dane w czasie rzeczywistym (GPS pojazdu), szare — rozkładowe.
      </>,
    ],
  },

  {
    id: 'places',
    title: 'Miejsca i mapa',
    mainIcon: <MapPin className="w-6 h-6" />,
    iconColorClass: 'text-pink-500',
    listItems: [
      <>
        <K>Dwa widoki.</K> Lista miejsc i widok mapy Leaflet. Przełączaj się przyciskiem w pasku filtrów. Na mapie każde miejsce to marker — kliknięcie otwiera popup z nazwą, adresem i przyciskiem <em>Szczegóły</em>.
      </>,
      <>
        <K>Import z Google Maps.</K> Wejdź na <em>Google Takeout</em>, wybierz <em>Mapy (Twoje miejsca)</em>, pobierz archiwum ZIP i wypakuj plik JSON. Wgraj go przez przycisk <em>Importuj</em> w aplikacji.
      </>,
      <>
        <K>Automatyczne wzbogacanie danych.</K> Przy imporcie możesz włączyć opcję <em>Dociągnij dane</em> — aplikacja pobierze numer telefonu, stronę www i godziny otwarcia z Google Places. Opcja <em>Automatyczne tagi</em> przypisze etykiety na podstawie rodzaju miejsca.
      </>,
      <>
        <K>Filtry.</K> Filtruj miejsca po tagach lub godzinach otwarcia. Filtr czasowy pozwala znaleźć miejsca otwarte w konkretny dzień tygodnia i przedział godzinowy.
      </>,
      <>
        <K>Sortowanie po odległości.</K> W Ustawieniach wybierz <em>Odległość (najbliższe)</em> — aplikacja użyje GPS i wzoru Haversine do obliczenia odległości do każdego miejsca.
      </>,
      <>
        <K>Nawigacja.</K> Przycisk <em>Nawiguj</em> na karcie miejsca otwiera Google Maps z wyznaczoną trasą.
      </>,
    ],
  },

  {
    id: 'streaks',
    title: 'Cele',
    mainIcon: <Trophy className="w-6 h-6" />,
    iconColorClass: 'text-rose-500',
    listItems: [
      <>
        <K>Czym są cele.</K> Streak mierzy liczbę dni, które upłynęły od daty startowej danego nawyku lub celu. Nie wymaga codziennego odhaczania — automatycznie przelicza dni od daty startu.
      </>,
      <>
        <K>Kamienie milowe.</K> Algorytm gratuluje Ci: pierwszego tygodnia (7 dni), okrągłych liczb dni (100, 200...), miesięcznic i rocznic. Gratulacje pojawiają się na karcie celu i na kokpicie w sekcji <em>Postępy</em>.
      </>,
      <>
        <K>Ikony.</K> Każdy cel ma ikonę wybraną z zestawu 10 symboli (płomień, trofeum, cel, serce, papieros, piwo, sztućce, hantle, skarbonka, medycyna). Kliknij ikonę w trybie edycji, by ją zmienić.
      </>,
      <>
        <K>Edycja daty startu.</K> Możesz zmienić datę startu (np. jeśli zapomnisz dodać cel od razu). Karta automatycznie przeliczy liczbę dni, tygodni, miesięcy i lat.
      </>,
    ],
  },

  {
    id: 'training',
    title: 'Timer treningowy',
    mainIcon: <Dumbbell className="w-6 h-6" />,
    iconColorClass: 'text-orange-500',
    listItems: [
      <>
        <K>Timer interwałowy.</K> Skonfiguruj: czas pracy (np. 40 s), czas krótkiej przerwy (15 s), liczbę serii (8) i liczbę cykli (3). Aplikacja przeprowadzi Cię przez cały trening automatycznie.
      </>,
      <>
        <K>Długa przerwa między cyklami.</K> Jeśli ustawisz więcej niż 1 cykl, pojawi się pole na długą przerwę (np. 90 sekund). Wstawiana jest automatycznie po każdym ukończonym cyklu serii.
      </>,
      <>
        <K>Dźwięk i blokada ekranu.</K> Timer odtwarza sygnał przy każdej zmianie fazy. Na obsługiwanych urządzeniach aktywuje Wake Lock — ekran nie będzie gasł podczas treningu.
      </>,
      <>
        <K>Konfiguracja.</K> Panel ustawień jest dostępny. Można w nim dowolnie modysikować długość ćwiczeń, przerw, a także ilość powtórzeń. 
      </>,
    ],
  },

  {
    id: 'movies',
    title: 'Lista filmów',
    mainIcon: <Clapperboard className="w-6 h-6" />,
    iconColorClass: 'text-indigo-500',
    listItems: [
      <>
        <K>Integracja z TMDB.</K> Wpisz tytuł i kliknij <em>Szukaj w TMDB</em>. Aplikacja pokaże do 5 wyników z plakatami. Po wyborze automatycznie pobiera: gatunek, ocenę, opis i dostępność streamingową w Polsce.
      </>,
      <>
        <K>Dostępność streamingowa.</K> Aplikacja sprawdza, na których platformach (Netflix, HBO Max, Disney+, Apple TV+, SkyShowtime, Player, Canal+...) film jest dostępny w Polsce w modelu subskrypcyjnym.
      </>,
      <>
        <K>Dwie sekcje.</K> Filmy podzielone są na <em>Do obejrzenia</em> (góra) i <em>Obejrzane</em> (dół, przyciemnione). Przycisk <em>Obejrzane</em> / <em>Obejrzyj</em> przenosi film między sekcjami.
      </>,
      <>
        <K>Notatki do filmów.</K> Rozwiń panel <em>Notatki</em> na karcie filmu, wpisz spostrzeżenia lub krótką recenzję i kliknij <em>Zapisz</em>.
      </>,
      <>
        <K>Sortowanie.</K> W Ustawieniach: data modyfikacji, alfabetycznie lub według oceny (malejąco).
      </>,
    ],
  },

  {
    id: 'weather',
    title: 'Pogoda i jakość powietrza',
    mainIcon: <Sun className="w-6 h-6" />,
    iconColorClass: 'text-yellow-500',
    listItems: [
      <>
        <K>Dane lokalizacyjne.</K> Aplikacja prosi o zgodę na dostęp do GPS i na jego podstawie pobiera dane z Open-Meteo (pogoda) i Open-Meteo Air Quality (jakość powietrza). Zapytania idą bezpośrednio z przeglądarki.
      </>,
      <>
        <K>Wskaźnik biometeorologiczny.</K> Autorski algorytm oblicza wpływ warunków pogodowych na samopoczucie na podstawie temperatury, ciśnienia, wilgotności i siły wiatru. Wynik: Korzystny / Umiarkowany / Niekorzystny.
      </>,
      <>
        <K>Prognoza godzinowa.</K> Tabela z temperaturą, opadami, prędkością wiatru i indeksem UV dla kolejnych 24 godzin, zaczynając od bieżącej.
      </>,
      <>
        <K>Prognoza 5-dniowa.</K> Karty z ikonką pogody i temperaturą min/max dla każdego z kolejnych 5 dni.
      </>,
      <>
        <K>Jakość powietrza.</K> PM10 i PM2.5 w µg/m³ z kolorowym wskaźnikiem: zielony (dobra), żółty (umiarkowana), czerwony (zła). Jeśli przekroczone są normy, alert pojawia się też w nagłówku aplikacji.
      </>,
    ],
  },

  {
    id: 'system',
    title: 'Ustawienia i konfiguracja',
    mainIcon: <Settings className="w-6 h-6" />,
    iconColorClass: 'text-gray-500',
    listItems: [
      <>
        <K>Instalacja jako aplikacja (PWA).</K> Kliknij przycisk <em>Zainstaluj</em> w ustawieniach (pojawia się gdy przeglądarka obsługuje PWA). Na iOS: Safari → <em>Udostępnij</em> → <em>Dodaj do ekranu głównego</em>.
      </>,
      <>
        <K>Tryb ciemny i jasny.</K> Przełącznik w prawym górnym rogu formularza ustawień. Domyślnie dopasowuje się do ustawień systemowych urządzenia.
      </>,
      <>
        <K>Sortowanie.</K> Możesz niezależnie ustawić domyślne sortowanie dla: zadań, notatek, list zakupów, filmów, przepisów i miejsc.
      </>,
      <>
        <K>Powiadomienia push.</K> Kliknij <em>Nadaj uprawnienia</em>, a następnie <em>Aktywuj</em>. Każdy z 6 typów powiadomień możesz włączyć lub wyłączyć niezależnie. Przycisk <em>Wyślij Test</em> weryfikuje, czy cały łańcuch działa poprawnie.
      </>,
      <>
        <K>Zaufani użytkownicy.</K> Dodaj adresy email osób, z którymi chcesz współdzielić dane. Osoba musi mieć aktywne konto. Możesz dodać do 10 adresów.
      </>,
      <>
        <K>Lokalizacja.</K> Przycisk <em>Pobierz lokalizację</em> odświeża GPS i wyświetla aktualne współrzędne. Wymagane dla: Pogody, sortowania Miejsc po odległości i sekcji "Najbliżej" w Transporcie.
      </>,
      <>
        <K>Przywróć domyślne.</K> Resetuje wszystkie ustawienia do wartości fabrycznych i natychmiast je zapisuje. Nie usuwa żadnych danych użytkownika.
      </>,
      <>
        <K>Wersja aplikacji.</K> Sekcja <em>Informacje o wersji</em> pokazuje numer wersji i datę ostatniego wdrożenia — pobierane na żywo z GitHub.
      </>,
    ],
  },
];