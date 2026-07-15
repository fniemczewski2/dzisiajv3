import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
// 1. Zmiana na preferowane importy node:*
import fs from 'node:fs';
import os from 'node:os'; 
import { PdfReader } from 'pdfreader';
import { createServerSupabase } from '@/lib/supabase/server';

export const config = { api: { bodyParser: false } };

const SUFFIXES = new Set([
  'gł.', 'główny', 'główna', 'centr.', 'centralna', 'centralny', 
  'wsch.', 'wschodni', 'wschodnia', 'zach.', 'zachodni', 'zachodnia', 
  'płn.', 'północ', 'północny', 'płd.', 'południe', 'południowy', 
  'zdrój', 'miasto', 'przedmieście', 'lotnisko', 'wlkp.', 'śl.', 'maz.', 'kuj.', 'pomorski'
]);

async function parsePdfToText(dataBuffer: Buffer): Promise<string> {
  const pdfItems: any[] = [];

  await new Promise<void>((resolve, reject) => {
    new PdfReader().parseBuffer(dataBuffer, (parseErr: any, item: any) => {
      if (parseErr) reject(parseErr);
      else if (!item) resolve();
      else if (item.text) pdfItems.push(item);
    });
  });

  pdfItems.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 0.5) return a.x - b.x; 
    return a.y - b.y; 
  });

  return pdfItems.map(item => item.text).join(' ').replaceAll(/\s+/g, ' ');
}

function extractStationNames(route: string) {
  const words = route.split(/\s+/).filter(Boolean);
  let from = '';
  let to = '';

  if (words.length === 2) {
    from = words[0];
    to = words[1];
  } else if (words.length === 4) {
    from = `${words[0]} ${words[1]}`;
    to = `${words[2]} ${words[3]}`;
  } else if (words.length > 0) {
    const stationsList: string[] = [];
    let current = words[0] || '';
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const isSuffix = SUFFIXES.has(word.toLowerCase()) || word.endsWith('.');
      
      if (isSuffix) {
        current += ` ${word}`;
      } else {
        stationsList.push(current);
        current = word;
      }
    }
    if (current) stationsList.push(current);

    from = stationsList[0] || '';
    to = stationsList.slice(1).join(' ') || '';
  }
  return { from, to };
}

function parseTicketData(cleanText: string) {
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

  const routeMatch = /KOD\s+\d{1,20}(.*?)Data odjazdu/.exec(cleanText);
  let route = routeMatch ? routeMatch[1].trim() : '';

  if (route.toLowerCase().includes('podróżny')) {
      route = route.replaceAll(/PODRÓŻNY.*?(\s|$)/ig, '').trim();
  }

  const { from, to } = extractStationNames(route);

  if (from && to) {
    route = `${from.replaceAll(' ', '\xA0')} ${to.replaceAll(' ', '\xA0')}`;
  }

  return {
    trainNumber,
    trainName,
    date,
    departureTime,
    wagon,
    seat,
    route,
    from: from.replaceAll('\xA0', ' '), 
    to: to.replaceAll('\xA0', ' ')
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
  const supabase = createServerSupabase(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Unauthorized" });

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
      const cleanText = await parsePdfToText(dataBuffer);
      const ticketData = parseTicketData(cleanText);

      return res.status(200).json(ticketData);
      
    } catch (error) {
      console.error('[PDF Extract Error]:', error);
      return res.status(500).json({ error: 'Błąd wczytywania PDF' });
    } finally {
      if (file?.filepath) {
        fs.unlink(file.filepath, (unlinkErr) => {
          if (unlinkErr) console.error('[Cleanup Error]: Nie udało się usunąć pliku tymczasowego', unlinkErr);
        });
      }
    }
  });
}