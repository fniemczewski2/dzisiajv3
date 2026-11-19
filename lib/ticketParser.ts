// lib/ticketParser.ts
//
// Odczyt biletu PKP Intercity z tekstu PDF (pdf-parse): stacje, data, godzina, pociąg, wagon, miejsce.
// Bilet z przesiadką ma kilka odcinków („1. odcinek:”, „2. odcinek:”) – parseTicketLegs zwraca każdy osobno
// (osobny wpis w „Pociągach”); parseTicketData zwraca pierwszy odcinek (formularz dodawania jednego pociągu).
// Kod przeniesiony z pages/api/transport/parse-ticket.ts, żeby używała go też poczta z biletami.

const SUFFIXES = new Set([
  "gł.",
  "główny",
  "główna",
  "centr.",
  "centralna",
  "centralny",
  "wsch.",
  "wschodni",
  "wschodnia",
  "zach.",
  "zachodni",
  "zachodnia",
  "płn.",
  "północ",
  "północny",
  "płd.",
  "południe",
  "południowy",
  "zdrój",
  "miasto",
  "przedmieście",
  "lotnisko",
  "wlkp.",
  "śl.",
  "maz.",
  "kuj.",
  "pomorski",
  "główne",
  "centralne",
  "wschodnie",
  "zachodnie",
  "północna",
  "południowa",
  "wielkopolski",
  "wielkopolska",
  "śląski",
  "śląska",
  "śląskie",
  "mazowiecki",
  "mazowiecka",
  "kujawski",
  "kujawska",
  "pomorska",
]);

const MULTI_WORD_CITY_STARTS = new Set([
  "zielona",
  "jelenia",
  "nowy",
  "nowa",
  "stare",
  "stary",
  "biała",
  "biały",
  "grodzisk",
  "skarżysko",
  "kędzierzyn",
  "tarnowskie",
  "kostrzyn",
  "krzyż",
  "wolsztyn",
  "rzepin",
  "dąbrowa",
  "ruda",
  "siemianowice",
  "świnoujście",
]);

const ABBREVIATIONS: Record<string, { m: string; f: string; n: string }> = {
  "gł.": { m: "Główny", f: "Główna", n: "Główne" },
  "wsch.": { m: "Wschodni", f: "Wschodnia", n: "Wschodnie" },
  "zach.": { m: "Zachodni", f: "Zachodnia", n: "Zachodnie" },
  "centr.": { m: "Centralny", f: "Centralna", n: "Centralne" },
  "płn.": { m: "Północny", f: "Północna", n: "Północne" },
  "płd.": { m: "Południowy", f: "Południowa", n: "Południowe" },
  "wlkp.": { m: "Wielkopolski", f: "Wielkopolska", n: "Wielkopolskie" },
  "śl.": { m: "Śląski", f: "Śląska", n: "Śląskie" },
  "maz.": { m: "Mazowiecki", f: "Mazowiecka", n: "Mazowieckie" },
  "kuj.": { m: "Kujawski", f: "Kujawska", n: "Kujawskie" },
};

export interface ParsedTicket {
  trainNumber: string;
  trainName: string;
  date: string;
  departureTime: string;
  wagon: string;
  seat: string;
  route: string;
  from: string;
  to: string;
}

function expandStationWord(word: string, cityWord: string = ""): string {
  const lowerWord = word.toLowerCase();
  const forms = ABBREVIATIONS[lowerWord];

  if (!forms) return word;
  if (!cityWord) return forms.m;

  const lastChar = cityWord.slice(-1).toLowerCase();
  if (lastChar === "a") return forms.f;
  if (lastChar === "e" || lastChar === "o") return forms.n;

  return forms.m;
}

function buildStationsList(words: string[]): string[] {
  const stationsList: string[] = [];
  let current = expandStationWord(words[0]) || "";
  let lastCityWord = words[0];
  let previousStartsMultiWord = MULTI_WORD_CITY_STARTS.has(words[0].toLowerCase());

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const lowerWord = word.toLowerCase();
    const isSuffix = SUFFIXES.has(lowerWord) || word.endsWith(".");
    const expandedWord = expandStationWord(word, lastCityWord);

    if (previousStartsMultiWord && !isSuffix) {
      current += ` ${expandedWord}`;
      lastCityWord = word;
      previousStartsMultiWord = false;
      continue;
    }
    previousStartsMultiWord = MULTI_WORD_CITY_STARTS.has(lowerWord);

    if (isSuffix) {
      current += ` ${expandedWord}`;
    } else {
      stationsList.push(current);
      current = expandedWord;
      lastCityWord = word;
    }
  }
  if (current) stationsList.push(current);
  return stationsList;
}

export function extractStationNames(route: string) {
  const words = route.split(/\s+/).filter(Boolean);
  let from = "";
  let to = "";

  if (words.length === 2) {
    from = expandStationWord(words[0]);
    to = expandStationWord(words[1]);
  } else if (words.length === 4) {
    from = `${expandStationWord(words[0])} ${expandStationWord(words[1], words[0])}`;
    to = `${expandStationWord(words[2])} ${expandStationWord(words[3], words[2])}`;
  } else if (words.length > 0) {
    const stationsList = buildStationsList(words);
    from = stationsList[0] || "";
    to = stationsList.length > 1 ? (stationsList.at(-1) ?? "") : "";
  }
  return { from, to };
}

/** „2. odcinek:Kraków Gł. Warszawa Centr.” → „Kraków Gł. Warszawa Centr.” */
function stripLegPrefix(line: string): string {
  return line.replace(/^\d{1,2}\.\s*odcinek:\s*/i, "").trim();
}

export function extractRoute(rawText: string): string {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const dataIdx = lines.findIndex((l) => /^Data odjazdu/i.test(l));
  return dataIdx > 0 ? stripLegPrefix(lines[dataIdx - 1]) : "";
}

/**
 * Numer i nazwa pociągu z fragmentu „Pociąg: … Wagon”. Najpierw wycinamy ten
 * fragment po znacznikach, a dopiero potem dopasowujemy krótki, zakotwiczony
 * wzorzec – poprzedni regex z `\\s*` i `(.*?)` miał nadliniowy czas działania.
 * Tekst ma już zwinięte białe znaki do pojedynczych spacji.
 */
function extractTrain(text: string): { trainNumber: string; trainName: string } {
  const start = text.indexOf("Pociąg:");
  const end = start === -1 ? -1 : text.indexOf("Wagon", start);
  if (end === -1) return { trainNumber: "", trainName: "" };

  const segment = text.slice(start + "Pociąg:".length, end).trim();
  const match = /^([A-Za-z]{0,20} ?\d{1,10})(?: ?\/ ?\d{1,10})?/.exec(segment);
  if (!match) return { trainNumber: "", trainName: "" };
  return { trainNumber: match[1].trim(), trainName: segment.slice(match[0].length).trim() };
}

export function parseTicketData(rawText: string): ParsedTicket {
  const route = extractRoute(rawText);
  const { from, to } = extractStationNames(route);

  const cleanText = rawText.replaceAll(/\s+/g, " ");

  const { trainNumber, trainName } = extractTrain(cleanText);

  const dateMatch = /Data odjazdu.{0,100}?(\d{2}\.\d{2}\.\d{4})/.exec(cleanText);
  const date = dateMatch ? dateMatch[1] : "";

  const timeMatch = /Godzina odjazdu.{0,100}?(\d{2}:\d{2})/.exec(cleanText);
  const departureTime = timeMatch ? timeMatch[1] : "";

  const wagonMatch = /Wagon:\s*(\d{1,10})/.exec(cleanText);
  const wagon = wagonMatch ? wagonMatch[1] : "";

  const seatMatch = /Miejsca:\s*(\d{1,10})/.exec(cleanText);
  const seat = seatMatch ? seatMatch[1] : "";

  return {
    trainNumber,
    trainName,
    date,
    departureTime,
    wagon,
    seat,
    route: from && to ? `${from} ${to}` : route,
    from,
    to,
  };
}

/**
 * Wszystkie odcinki biletu. Każdy odcinek zaczyna się linią trasy przed „Data odjazdu” i kończy przed trasą
 * następnego odcinka. Odcinek bez numeru pociągu i stacji jest pomijany.
 */
export function parseTicketLegs(rawText: string): ParsedTicket[] {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const starts = lines.flatMap((l, i) => (/^Data odjazdu/i.test(l) && i > 0 ? [i - 1] : []));
  return starts
    .map((start, n) => parseTicketData(lines.slice(start, starts[n + 1] ?? lines.length).join("\n")))
    .filter((leg) => leg.trainNumber || leg.from);
}

/** „26.11.2026” → „2026-11-26”; inny format → "". */
export function ticketDateToIso(date: string): string {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
