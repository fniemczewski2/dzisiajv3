// pages/api/transport/parse-ticket.ts

import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'node:fs/promises';
import os from 'node:os';
import { createServerSupabase } from '@/lib/supabase/server';
import { ensurePdfCanvasGlobals } from '@/lib/server/pdfCanvasGlobals';
import { TICKET_UPLOAD_MAX_BYTES, TICKET_ALLOWED_MIME } from '@/config/limits';

export const config = { api: { bodyParser: false }, maxDuration: 30 };

const SUFFIXES = new Set([
  'gł.', 'główny', 'główna', 'centr.', 'centralna', 'centralny',
  'wsch.', 'wschodni', 'wschodnia', 'zach.', 'zachodni', 'zachodnia',
  'płn.', 'północ', 'północny', 'płd.', 'południe', 'południowy',
  'zdrój', 'miasto', 'przedmieście', 'lotnisko', 'wlkp.', 'śl.', 'maz.', 'kuj.', 'pomorski',
  'główne', 'centralne', 'wschodnie', 'zachodnie', 'północna', 'południowa',
  'wielkopolski', 'wielkopolska', 'śląski', 'śląska', 'śląskie',
  'mazowiecki', 'mazowiecka', 'kujawski', 'kujawska', 'pomorska'
]);

const MULTI_WORD_CITY_STARTS = new Set([
  'zielona', 'jelenia', 'nowy', 'nowa', 'stare', 'stary', 'biała', 'biały',
  'grodzisk', 'skarżysko', 'kędzierzyn', 'tarnowskie', 'kostrzyn', 'krzyż',
  'wolsztyn', 'rzepin', 'dąbrowa', 'ruda', 'siemianowice', 'świnoujście'
]);

const ABBREVIATIONS: Record<string, { m: string, f: string, n: string }> = {
  'gł.': { m: 'Główny', f: 'Główna', n: 'Główne' },
  'wsch.': { m: 'Wschodni', f: 'Wschodnia', n: 'Wschodnie' },
  'zach.': { m: 'Zachodni', f: 'Zachodnia', n: 'Zachodnie' },
  'centr.': { m: 'Centralny', f: 'Centralna', n: 'Centralne' },
  'płn.': { m: 'Północny', f: 'Północna', n: 'Północne' },
  'płd.': { m: 'Południowy', f: 'Południowa', n: 'Południowe' },
  'wlkp.': { m: 'Wielkopolski', f: 'Wielkopolska', n: 'Wielkopolskie' },
  'śl.': { m: 'Śląski', f: 'Śląska', n: 'Śląskie' },
  'maz.': { m: 'Mazowiecki', f: 'Mazowiecka', n: 'Mazowieckie' },
  'kuj.': { m: 'Kujawski', f: 'Kujawska', n: 'Kujawskie' }
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

function expandStationWord(word: string, cityWord: string = ''): string {
  const lowerWord = word.toLowerCase();
  const forms = ABBREVIATIONS[lowerWord];

  if (!forms) return word;
  if (!cityWord) return forms.m;

  const lastChar = cityWord.slice(-1).toLowerCase();
  if (lastChar === 'a') return forms.f;
  if (lastChar === 'e' || lastChar === 'o') return forms.n;

  return forms.m;
}

// The general (non-2-word, non-4-word) case: walks the word list, merging a
// word into the current station name when it's a known suffix (or a
// continuation of a known multi-word city name), otherwise starting a new
// station entry.
function buildStationsList(words: string[]): string[] {
  const stationsList: string[] = [];
  let current = expandStationWord(words[0]) || '';
  let lastCityWord = words[0];
  let previousStartsMultiWord = MULTI_WORD_CITY_STARTS.has(words[0].toLowerCase());

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const lowerWord = word.toLowerCase();
    const isSuffix = SUFFIXES.has(lowerWord) || word.endsWith('.');
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
  let from = '';
  let to = '';

  if (words.length === 2) {
    from = expandStationWord(words[0]);
    to = expandStationWord(words[1]);
  } else if (words.length === 4) {
    from = `${expandStationWord(words[0])} ${expandStationWord(words[1], words[0])}`;
    to = `${expandStationWord(words[2])} ${expandStationWord(words[3], words[2])}`;
  } else if (words.length > 0) {
    const stationsList = buildStationsList(words);
    from = stationsList[0] || '';
    to = stationsList.length > 1 ? (stationsList.at(-1) ?? '') : '';
  }
  return { from, to };
}

class PdfReadError extends Error {
  constructor(readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
  }
}

async function extractPdfText(dataBuffer: Buffer): Promise<string> {
  let parser: { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } | undefined;
  try {
    // Kolejność jest istotna: pdfjs sięga po DOMMatrix już przy ładowaniu
    // modułu, więc globalne obiekty muszą istnieć PRZED importem pdf-parse.
    await ensurePdfCanvasGlobals();

    // Import w środku funkcji, a nie na górze pliku: dzięki temu błąd ładowania
    // wpada tutaj i wraca jako JSON. Import na poziomie modułu wywracał całą
    // funkcję, a klient dostawał stronę błędu HTML.
    const { PDFParse } = await import('pdf-parse');
    parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    throw new PdfReadError(error);
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

export function extractRoute(rawText: string): string {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const dataIdx = lines.findIndex((l) => /^Data odjazdu/i.test(l));
  return dataIdx > 0 ? lines[dataIdx - 1] : '';
}

export function parseTicketData(rawText: string): ParsedTicket {
  const route = extractRoute(rawText);
  const { from, to } = extractStationNames(route);

  const cleanText = rawText.replaceAll(/\s+/g, ' ');

  const trainMatch = /Pociąg:\s*([A-Za-z]{0,20}\s*\d{1,10})(?:\s*\/\s*\d{1,10})?(.*?)Wagon/.exec(cleanText);
  const trainNumber = trainMatch ? trainMatch[1].trim() : '';
  const trainName = trainMatch ? trainMatch[2].trim() : '';

  const dateMatch = /Data odjazdu.{0,100}?(\d{2}\.\d{2}\.\d{4})/.exec(cleanText);
  const date = dateMatch ? dateMatch[1] : '';

  const timeMatch = /Godzina odjazdu.{0,100}?(\d{2}:\d{2})/.exec(cleanText);
  const departureTime = timeMatch ? timeMatch[1] : '';

  const wagonMatch = /Wagon:\s*(\d{1,10})/.exec(cleanText);
  const wagon = wagonMatch ? wagonMatch[1] : '';

  const seatMatch = /Miejsca:\s*(\d{1,10})/.exec(cleanText);
  const seat = seatMatch ? seatMatch[1] : '';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const supabase = createServerSupabase(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const form = formidable({
    multiples: false,
    maxFiles: 1,
    uploadDir: os.tmpdir(),
    maxFileSize: TICKET_UPLOAD_MAX_BYTES,
    filter: (part) => part.mimetype === TICKET_ALLOWED_MIME,
  });

  let filepath: string | undefined;

  try {
    const [, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'Nie wgrano pliku PDF z biletem.' });
    }
    filepath = file.filepath;

    if (file.mimetype !== TICKET_ALLOWED_MIME) {
      return res.status(415).json({ error: 'Obsługiwane są wyłącznie pliki PDF.' });
    }

    const dataBuffer = await fs.readFile(file.filepath);
    const rawText = await extractPdfText(dataBuffer);
    const ticketData = parseTicketData(rawText);

    if (!ticketData.trainNumber && !ticketData.from) {
      return res.status(422).json({
        error: 'Nie udało się rozpoznać danych biletu w tym pliku. Sprawdź, czy to bilet PKP Intercity w formacie PDF.',
      });
    }

    return res.status(200).json(ticketData);
  } catch (error) {
    const code = (error as { code?: string | number }).code;

    if (code === 'ETOOBIG' || code === 1009) {
      const maxMb = Math.round(TICKET_UPLOAD_MAX_BYTES / (1024 * 1024));
      return res.status(413).json({ error: `Plik jest za duży. Maksymalny rozmiar to ${maxMb} MB.` });
    }

    console.error('[parse-ticket]:', error);

    if (error instanceof PdfReadError) {
      return res.status(422).json({
        error: 'Nie udało się odczytać treści PDF.',
        detail: error.message,
      });
    }

    return res.status(500).json({
      error: 'Błąd wczytywania PDF. Sprawdź, czy plik nie jest uszkodzony.',
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (filepath) {
      await fs.unlink(filepath).catch((unlinkErr: unknown) => {
        console.error('[parse-ticket] Nie udało się usunąć pliku tymczasowego', unlinkErr);
      });
    }
  }
}