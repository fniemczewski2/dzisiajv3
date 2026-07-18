import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'node:fs';
import os from 'node:os';
import { PDFParse } from 'pdf-parse';
import { createServerSupabase } from '@/lib/supabase/server';

export const config = { api: { bodyParser: false } };

const SUFFIXES = new Set([
  'gł.', 'główny', 'główna', 'centr.', 'centralna', 'centralny',
  'wsch.', 'wschodni', 'wschodnia', 'zach.', 'zachodni', 'zachodnia',
  'płn.', 'północ', 'północny', 'płd.', 'południe', 'południowy',
  'zdrój', 'miasto', 'przedmieście', 'lotnisko', 'wlkp.', 'śl.', 'maz.', 'kuj.', 'pomorski'
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

export function extractStationNames(route: string) {
  const words = route.split(/\s+/).filter(Boolean);
  let from = '';
  let to = '';

  const expandWord = (word: string, cityWord: string = ''): string => {
    const lowerWord = word.toLowerCase();
    const forms = ABBREVIATIONS[lowerWord];
    
    if (!forms) return word;
    if (!cityWord) return forms.m; 

    const lastChar = cityWord.slice(-1).toLowerCase();
    if (lastChar === 'a') return forms.f;
    if (lastChar === 'e' || lastChar === 'o') return forms.n;

    return forms.m; 
  };

  if (words.length === 2) {
    from = expandWord(words[0]);
    to = expandWord(words[1]);
  } else if (words.length === 4) {
    from = `${expandWord(words[0])} ${expandWord(words[1], words[0])}`;
    to = `${expandWord(words[2])} ${expandWord(words[3], words[2])}`;
  } else if (words.length > 0) {
    const stationsList: string[] = [];
    let current = expandWord(words[0]) || '';
    
    let lastCityWord = words[0]; 

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const lowerWord = word.toLowerCase();
      const isSuffix = SUFFIXES.has(lowerWord) || word.endsWith('.');
      const expandedWord = expandWord(word, lastCityWord);

      if (isSuffix) {
        current += ` ${expandedWord}`;
      } else {
        stationsList.push(current);
        current = expandedWord;
        lastCityWord = word; 
      }
    }
    if (current) stationsList.push(current);

    from = stationsList[0] || '';
    to = stationsList.slice(1).join(' ') || '';
  }
  return { from, to };
}

async function extractPdfText(dataBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: dataBuffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
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
    uploadDir: os.tmpdir(),
    maxFileSize: 10 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(err.httpCode || 500).json({ error: 'Błąd wgrywania pliku: ' + err.message });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: 'Brak pliku' });

    try {
      const dataBuffer = fs.readFileSync(file.filepath);
      const rawText = await extractPdfText(dataBuffer);
      const ticketData = parseTicketData(rawText);

      if (!ticketData.trainNumber && !ticketData.from) {
        return res.status(422).json({
          error: 'Nie udało się rozpoznać danych biletu w tym pliku. Sprawdź, czy to bilet PKP Intercity w formacie PDF.',
        });
      }

      return res.status(200).json(ticketData);
    } catch (error) {
      console.error('[PDF Extract Error]:', error);
      return res.status(500).json({ error: 'Błąd wczytywania PDF. Sprawdź, czy plik nie jest uszkodzony.' });
    } finally {
      if (file?.filepath) {
        fs.unlink(file.filepath, (unlinkErr) => {
          if (unlinkErr) console.error('[Cleanup Error]: Nie udało się usunąć pliku tymczasowego', unlinkErr);
        });
      }
    }
  });
}