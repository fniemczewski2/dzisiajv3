import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
// @ts-ignore - ignorujemy brak oficjalnych typów TypeScript dla tej biblioteki
import { PdfReader } from 'pdfreader';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const form = formidable({ multiples: false });
  
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Błąd wgrywania pliku' });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: 'Brak pliku' });

    try {
      const dataBuffer = fs.readFileSync(file.filepath);
      const textChunks: string[] = [];

      // Oczekujemy na zakończenie asynchronicznego parsowania całego dokumentu
      await new Promise<void>((resolve, reject) => {
        new PdfReader().parseBuffer(dataBuffer, (parseErr: any, item: any) => {
          if (parseErr) {
            reject(parseErr);
          } else if (!item) {
            resolve(); // Koniec pliku
          } else if (item.text) {
            textChunks.push(item.text);
          }
        });
      });

      // Spłaszczamy tekst PDF do jednej długiej linii, oddzielając elementy spacjami
      // Uodparnia to nas na błędy, w których ucięta linijka (np. na długich stacjach) psuła odczyt
      const cleanText = textChunks.join(' ').replace(/\s+/g, ' ');

      // Bezpieczne Regexy dla biletów PKP Intercity dostosowane do jednolitych odstępów
      const trainMatch = cleanText.match(/Pociąg:\s*([A-Za-z]*\s*\d+)(?:\s*\/\s*\d+)?\s*(.*?)\s*Wagon/);
      const trainNumber = trainMatch ? trainMatch[1].trim() : '';
      const trainName = trainMatch ? trainMatch[2].trim() : '';

      const dateMatch = cleanText.match(/Data odjazdu.*?(\d{2}\.\d{2}\.\d{4})/);
      const date = dateMatch ? dateMatch[1] : ''; 

      const timeMatch = cleanText.match(/Godzina odjazdu.*?(\d{2}:\d{2})/);
      const departureTime = timeMatch ? timeMatch[1] : '';

      const wagonMatch = cleanText.match(/Wagon:\s*(\d+)/);
      const wagon = wagonMatch ? wagonMatch[1] : '';

      const seatMatch = cleanText.match(/Miejsca:\s*(\d+)/);
      const seat = seatMatch ? seatMatch[1] : '';

      // Wyciągamy stacje bazując na tym, że znajdują się pomiędzy kodem sprawdzającym a napisem "Data odjazdu"
      const routeMatch = cleanText.match(/KOD\s+\d+\s+(.*?)\s+Data odjazdu/);
      const route = routeMatch ? routeMatch[1].trim() : '';

      return res.status(200).json({
        trainNumber,
        trainName,
        date,
        departureTime,
        wagon,
        seat,
        route,
      });

    } catch (error) {
      console.error('[PDF Extract Error]:', error);
      return res.status(500).json({ error: 'Błąd wczytywania PDF' });
    }
  });
}