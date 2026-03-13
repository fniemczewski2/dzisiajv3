import React from 'react';
import { 
  Activity, LayoutDashboard, CheckSquare, Calendar, 
  Wallet, Settings, 
  Dumbbell, ShoppingCart, Clapperboard, 
  Target,
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
  Droplet
} from 'lucide-react';

export type GuideSection = {
  id: string;
  title: string;
  mainIcon: React.ReactNode;
  iconColorClass: string;
  listItems: React.ReactNode[];
};

export const guideSections: GuideSection[] = [
{
    id: "dashboard",
    title: "Dzisiaj (widok główny)",
    mainIcon: <LayoutDashboard className="w-6 h-6" />,
    iconColorClass: "text-blue-500",
    listItems: [
      <><strong>Centrum dowodzenia:</strong> Główny widok na dany dzień. Posiada interaktywną oś czasu (06:00 - 23:00), która ułatwia wizualizację całego dnia.</>,
      <><strong>Przeciągnij i Upuść:</strong> Możesz swobodnie przeciągać zadania oraz wydarzenia na konkretne godziny na osi czasu. Aplikacja automatycznie zaktualizuje ich harmonogram.</>,
      <><strong>Szybkie Widgety:</strong> Na samej górze kokpitu znajdziesz narzędzia ułatwiające codzienne czynności, m.in. licznik wypitej wody, tablicę nawyków oraz pole do błyskawicznego wpisywania codziennych wydatków.</>,
      <><strong>Skróty:</strong> Jeśli w nazwie elementu użyjesz słów kluczowych takich jak 'trening', 'zakupy', 'film' lub 'spotkanie', system automatycznie rozpozna intencję i wyświetli przy zadaniu szybki przycisk skrótu do odpowiedniego modułu w aplikacji.</>
    ]
  },
  {
    id: "day_schema",
    title: "Plan dnia (Schematy)",
    mainIcon: <Logs className="w-6 h-6" />,
    iconColorClass: "text-purple-500",
    listItems: [
      <><strong>Automatyzacja rutyn:</strong> Narzędzie pozwalające na tworzenie stałych, powtarzalnych bloków czasowych (np. "Praca w biurze od 8:00 do 16:00" w każdy poniedziałek i wtorek).</>,
      <><strong>Blokowanie czasu:</strong> Raz skonfigurowany schemat jest automatycznie nanoszony na Twój główny widok 'Dzisiaj'. Rezerwuje wybrane godziny, pomagając lepiej planować resztę wolnego czasu.</>
    ]
  },
  {
    id: "habits",
    title: "Codzienne Nawyki",
    mainIcon: <Activity className="w-6 h-6" />, 
    iconColorClass: "text-indigo-500",
    listItems: [
      <><strong>Szybkie odhaczanie:</strong> Niezależny, podręczny widget na Głównym Kokpicie służący do śledzenia małych, powtarzalnych czynności każdego dnia.</>,
      <><strong>Personalizacja:</strong> W ustawieniach aplikacji możesz dokładnie wybrać, które z predefiniowanych nawyków chcesz śledzić.</>,
      <><strong>Prosta obsługa:</strong> Wystarczy jedno kliknięcie w odpowiednią ikonkę na kokpicie, by oznaczyć dany nawyk jako zrealizowany w bieżącym dniu. O północy statusy nawyków automatycznie się zerują.</>
    ]
  },
  {
    id: "water_tracker",
    title: "Nawodnienie (Water Tracker)",
    mainIcon: <Droplet className="w-6 h-6" />, 
    iconColorClass: "text-cyan-500",
    listItems: [
      <><strong>Kontrola płynów:</strong> Wizualny licznik wbudowany w Główny Kokpit, pomagający dbać o zdrowe nawyki i odpowiednie nawodnienie organizmu w ciągu dnia.</>,
      <><strong>Szybki dostęp:</strong> Wypijasz szklankę wody – dodajesz ją jednym kliknięciem do swojego licznika. Postęp automatycznie resetuje się każdego nowego dnia.</>,
      <><strong>Opcjonalność:</strong> Jeśli nie potrzebujesz śledzić swojego nawodnienia, możesz całkowicie ukryć ten widget w Ustawieniach aplikacji, aby odzyskać miejsce na ekranie głównym.</>
    ]
  },
  {
    id: "tasks_list",
    title: "Lista Zadań",
    mainIcon: <CheckSquare className="w-6 h-6" />,
    iconColorClass: "text-green-500",
    listItems: [
      <><strong>Zarządzanie:</strong> Kompletna lista Twoich zadań do załatwienia. Możesz swobodnie dodawać, edytować i usuwać wpisy.</>,
      <><strong>Kategorie:</strong> Grupuj swoje zadania, przypisując im konkretne kategorie tematyczne. Ułatwia to organizację i szybkie odnalezienie spraw z danego obszaru życia.</>,
      <><strong>Priorytety:</strong> Każdemu zadaniu możesz przypisać priorytet ważności w skali od 1 (bardzo ważne/krytyczne) do 5 (mało ważne). Aplikacja oznacza je odpowiednimi kolorami.</>,
      <><strong>Inteligentne Etykiety Czasowe (Time Badge):</strong> System automatycznie analizuje datę wykonania i przypina do zadania dynamiczną etykietę (np. "Dzisiaj", "Jutro", "Za 3 dni" lub wyróżnione na czerwono "Zaległe"), co pozwala błyskawicznie ocenić, ile masz czasu na realizację.</>,
      <><strong>Zadania Cykliczne:</strong> Posiadasz sprawy, które regularnie wracają? Ustaw zadanie jako powtarzalne. Po jego odhaczeniu system samodzielnie zaplanuje kolejne wystąpienie zgodnie z ustalonym cyklem.</>,
      <><strong>Satysfakcja:</strong> Po pomyślnym ukończeniu zadania i oznaczeniu go jako "zrobione", system wyświetli na ekranie satysfakcjonującą animację konfetti.</>
    ],
  },  
  {
    id: "pomodoro",
    title: "Zegar Pomodoro",
    mainIcon: <Timer className="w-6 h-6" />,
    iconColorClass: "text-red-500",
    listItems: [
      <><strong>Praca w blokach:</strong> Wbudowany stoper pomagający w utrzymaniu maksymalnego skupienia podczas nauki lub pracy, bazujący na popularnej technice zarządzania czasem.</>,
      <><strong>Konfiguracja:</strong> Pozwala na sztywne ustawienie bloków czasu (np. 25 minut głębokiej pracy, po których następuje 5 minut obowiązkowej przerwy na regenerację).</>
    ]
  },
  {
    id: "planning",
    title: "Notatki",
    mainIcon: <Pen className="w-6 h-6" />,
    iconColorClass: "text-purple-500",
    listItems: [
      <><strong>Notatki:</strong> Główny folder na Twoje szybkie zapytania, luźne myśli i standardowe teksty.</>,
      <><strong>Sprawozdanie:</strong> Moduł idealny do pisania podsumowań ze spotkań. Każdy wpis możesz pobrać jednym kliknięciem jako gotowy, sformatowany dokument PDF.</>
    ]
  },
  {
    id: "calendar",
    title: "Kalendarz",
    mainIcon: <Calendar className="w-6 h-6" />,
    iconColorClass: "text-purple-500",
    listItems: [
      <><strong>Kalendarz:</strong> Pełny widok całego miesiąca. Dodasz tu wydarzenia, oraz podejrzysz statystki z poprzednich dni.</>,
      <><strong>Ważne daty:</strong> Jeśli w opisie wydarzenia użyjesz słów takich jak 'urodziny', 'imieniny' lub 'rocznica', system w tym dniu pokaże informację w nagłówku.</>
    ],
  },
{
    id: "bills",
    title: "Finanse i Rachunki",
    mainIcon: <Wallet className="w-6 h-6" />,
    iconColorClass: "text-emerald-500",
    listItems: [
      <><strong>Zarządzanie wydatkami:</strong> Baza Twoich wydatków stałych opłat, planowanych zakupów oraz małychh wydatków.</>,
      <><strong>Zarządzanie przychodami:</strong> Baza Twoich przychodów - aby nie zapominać, że ktoś ci coś wisi, albo masz otrzymać zwrot.</>,
    ]
  },
  {
    id: "budget",
    title: "Budżet",
    mainIcon: <ChartColumnBig className="w-6 h-6" />,
    iconColorClass: "text-teal-500",
    listItems: [
      <><strong>Planowanie dużych wydatków:</strong> Miesięczne zestawienia i tabele pozwalają na długoterminowe układanie budżetu i przygotowanie się na większe, nadchodzące obciążenia finansowe.</>,
      <><strong>Obliczanie godzin pracy:</strong> Narzędzie ułatwia ustalenie, jaką dokładnie liczbę godzin musisz przepracować w danym miesiącu, aby pokryć wszystkie zaplanowane opłaty i rachunki.</>,
      <><strong>Kontrola drobnych wydatków:</strong> Aby zapanować nad codziennymi kosztami, wystarczy dodać w systemie wydatek z opisem <em>"bieżące"</em>. Pozwala to wyznaczyć i skutecznie kontrolować osobny budżet przeznaczony wyłącznie na małe zakupy i zachcianki.</>
    ]
  },
  {
    id: "calculator",
    title: "Kalkulator Rachunków",
    mainIcon: <Calculator className="w-6 h-6" />,
    iconColorClass: "text-blue-500",
    listItems: [
      <><strong>Podział rachunków za mieszkanie:</strong> Dedykowane narzędzie służące do szybkiego i bezproblemowego dzielenia współdzielonych opłat (np. czynsz, prąd, internet).</>,
      <><strong>Sprawiedliwa metoda rozliczeń:</strong> Kalkulator wykorzystuje uczciwy algorytm podziału kosztów pomiędzy domowników lub współlokatorów. </>
    ]
  },
  {
    id: "shopping",
    title: "Listy Zakupów",
    mainIcon: <ShoppingCart className="w-6 h-6" />,
    iconColorClass: "text-amber-500",
    listItems: [
      <><strong>Organizacja zakupów:</strong> Twórz lity zakupowe. Możesz przygotować osobne zestawienia i współdzielić je z innymi.</>,
      <><strong>Tryb sklepowy:</strong> Listy są zoptymalizowane pod kątem używania na smartfonie. Będąc między półkami, wystarczy jedno kliknięcie, aby przekreślić i odhaczyć produkt lądujący w koszyku.</>
    ]
  },
  {
    id: "recipes",
    title: "Przepisy Kulinarne",
    mainIcon: <CookingPot className="w-6 h-6" />,
    iconColorClass: "text-orange-500",
    listItems: [
      <><strong>Cyfrowa książka kucharska:</strong> Twój prywatny notatnik do zapisywania ulubionych dań, eksperymentów kulinarnych i instrukcji ich przygotowania.</>,
      <><strong>Kategorie posiłków:</strong> Zapisane przepisy możesz wygodnie dzielić na kategorie (np. śniadania, obiady, desery), co znacząco ułatwia późniejsze planowanie jadłospisu na dany tydzień.</>
    ]
  },
  {
    id: "outings",
    title: "Pakowanie",
    mainIcon: <Backpack className="w-6 h-6" />,
    iconColorClass: "text-orange-500",
    listItems: [
      <><strong>Plecak:</strong> Mój plecak ma wszystko. A to jest pełna lista wyposażenia, zeby być zawsze gotowym na wszystko.</>,
      <><strong>Walizka:</strong> Kompleksowy asystent pakowania bagażu na wyjazdy i dalsze podróże, dzięki któremu nigdy nie zapomnisz ważnych rzeczy.</>,
      <><strong>Plecak Bezpieczeństwa:</strong> Plecak ewakuacyjny na wypadek zagrożeń, zgodny z poradnikiem bezpieczeństwa.</>,
    ]
  },
  {
    id: "transport",
    title: "Transport Miejski",
    mainIcon: <Bus className="w-6 h-6" />,
    iconColorClass: "text-blue-500",
    listItems: [
      <><strong>Odjazdy na żywo:</strong> Tablice z odjazdami dla komunikacji miejskiej, pokazujące linię, kierunek i czas do przyjazdu.</>,
      <><strong>Wyszukiwarka i strefy:</strong> Możliwość ręcznego wyszukania przystanku (obsługuje Szczecin i Poznań) i dodania go do ulubionych.</>,
      <><strong>Lokalizacja GPS:</strong> Aplikacja potrafi automatycznie wykryć Twoją pozycję i wyświetlić przystanki znajdujące się najbliżej Ciebie</>
    ]
  },
  {
    id: "places",
    title: "Miejsca i Mapa",
    mainIcon: <MapPin className="w-6 h-6" />,
    iconColorClass: "text-pink-500",
    listItems: [
      <><strong>Interaktywna Mapa:</strong> Narzędzie do kolekcjonowania restauracji, kawiarni i innych punktów z możliwością przełączania między listą a widokiem mapy.</>,
      <><strong>Import z Google Places:</strong> Nie musisz wpisywać danych ręcznie. Wyszukaj lokal, a aplikacja pobierze jego współrzędne, adres, godziny otwarcia i oceny.</>,
      <><strong>Inteligentne Tagowanie:</strong> Asystent automatycznie przypisze miejscu tagi (np. "włoskie", "budżetowo", "24h") na podstawie danych z sieci.</>,
      <><strong>Filtrowanie:</strong> Szybkie wyszukiwanie miejsc po tagach lub filtrowanie tych, które są na pewno otwarte w danym dniu i godzinie.</>
    ]
  },
  {
    id: "streaks",
    title: "Cele i Nawyki (Streaks)",
    mainIcon: <Target className="w-6 h-6" />, 
    iconColorClass: "text-rose-500",
    listItems: [
      <><strong>Moduł budowania nawyków:</strong> Zapisujesz swój cel (np. codzienny spacer, nauka języka) i odhaczasz go każdego dnia, tworząc nieprzerwany łańcuch.</>,
      <><strong>Inteligentny algorytm gratyfikacji:</strong> System na bieżąco analizuje czas od daty startu Twojego nawyku. Przyznaje specjalne gratulacje i komunikaty za tzw. kamienie milowe – np. za ukończenie pierwszego tygodnia, równe 100 dni lub pełne rocznice (miesiące i lata).</>
    ]
  },
  {
    id: "training",
    title: "Trening Interwałowy",
    mainIcon: <Dumbbell className="w-6 h-6" />, 
    iconColorClass: "text-orange-500",
    listItems: [
      <><strong>Zaawansowany stoper:</strong> Narzędzie zaprojektowane specjalnie do ćwiczeń czasowych.</>,
      <><strong>Pełna konfiguracja planu:</strong> W panelu możesz bardzo precyzyjnie ustalić swój plan: określasz czas pojedynczego ćwiczenia (pracy), czas krótkiej przerwy oraz liczbę serii.</>,
      <><strong>Zarządzanie cyklami:</strong> Jeśli trenujesz intensywniej, aplikacja pozwala na ustawienie wielokrotnych cykli (rund) i wplata między nie dodatkową, dłuższą przerwę na pełną regenerację organizmu.</>
    ]
  },
  {
    id: "movies",
    title: "Filmy (Baza TMDB)",
    mainIcon: <Clapperboard className="w-6 h-6" />, 
    iconColorClass: "text-indigo-500",
    listItems: [
      <><strong>Twoja osobista kinoteka:</strong> Miejsce do zapisywania filmów obejrzanych lub tych, które dopiero planujesz obejrzeć.</>,
      <><strong>Integracja z API The Movie Database:</strong> Dodawanie filmów jest w pełni zautomatyzowane. Wpisujesz tytuł, a aplikacja sama dociąga z internetu oficjalny plakat, średnią ocen, gatunek oraz opis fabuły.</>,
      <><strong>Sprawdzanie dostępności VOD:</strong> System automatycznie sprawdza bazę i informuje, na jakich polskich platformach streamingowych (np. Netflix, Disney+, HBO Max, Player) można obecnie legalnie obejrzeć dany tytuł.</>,
      <><strong>Własne notatki:</strong> Obejrzane filmy możesz oznaczyć jako zakończone i dodać do nich własną recenzję.</>
    ]
  },
  {
    id: "weather",
    title: "Pogoda i Jakość Powietrza",
    mainIcon: <Sun className="w-6 h-6" />, 
    iconColorClass: "text-yellow-500",
    listItems: [
      <><strong>Stacja meteo:</strong> Aplikacja za Twoją zgodą pobiera dokładną lokalizację geograficzną (GPS) i na jej podstawie odpytuje potężne, darmowe interfejsy: Open-Meteo API oraz Air Quality API.</>,
      <><strong>Szczegółowe dane:</strong> Wyświetla aktualną temperaturę odczuwalną (min/max), opady, indeks UV, ciśnienie, wilgotność oraz godziny wschodu i zachodu słońca.</>,
      <><strong>Monitoring smogu:</strong> Sprawdza jakość powietrza, pokazując aktualne stężenie szkodliwych pyłów zawieszonych PM10 oraz PM2.5.</>,
      <><strong>Prognozy:</strong> Pokazuje prognozę pogody w rozbiciu godzina po godzinie na najbliższą dobę oraz czytelny przegląd na kolejne 5 dni.</>,
      <><strong>Unikalny wskaźnik Biometu:</strong> Wbudowany w aplikację algorytm przetwarza siłę wiatru, skoki ciśnienia, temperaturę oraz wilgotność. Na tej podstawie ocenia, czy warunki biometeorologiczne są w danym momencie korzystne, umiarkowane czy niekorzystne dla Twojego samopoczucia.</>
    ]
  },
  {
    id: "system",
    title: "Ustawienia",
    mainIcon: <Settings className="w-6 h-6" />,
    iconColorClass: "text-gray-500",
    listItems: [
      <><strong>Aplikacja w telefonie (PWA):</strong> Możesz użyć przycisku instalacji, by dodać 'Dzisiaj v3' na ekran główny telefonu. Zadziała jak tradycyjna aplikacja, bez paska adresu przeglądarki.</>,
      <><strong>Personalizacja:</strong> Ukrywaj lub pokazuj konkretne sekcje. Jeśli korzystasz z nawyków, możesz wybrać dokładnie te, które chcesz śledzić.</>,
      <><strong>Domyślne sortowanie:</strong> Skonfiguruj jak aplikacja ma układać elementy. </>,
      <><strong>Powiadomienia:</strong> Zamiast włączać wszystko, wybierz powiadomienia, których potrzebujesz. </>,
      <><strong>Zaufani użytkownicy:</strong> Dodawaj adresy e-mail osób, z którymi chcesz współdzielić dane np. zadania, wydarzenia, listy zakupów. </>,
      <><strong>Lokalizacja:</strong> Udziel zgodę na lokalizację, aby pogoda, miejsca i transport mogły działać.</>,
      <><strong>Wygląd:</strong> Aplikacja posiada wbudowany tryb ciemny i jasny, domyślnie dostosowując się do ustawień Twojego telefonu.</>
    ]
  }
];