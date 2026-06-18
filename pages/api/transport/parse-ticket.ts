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
      const pdfItems: any[] = [];

      // Oczekujemy na zakończenie asynchronicznego parsowania całego dokumentu
      await new Promise<void>((resolve, reject) => {
        new PdfReader().parseBuffer(dataBuffer, (parseErr: any, item: any) => {
          if (parseErr) {
            reject(parseErr);
          } else if (!item) {
            resolve(); // Koniec pliku
          } else if (item.text) {
            pdfItems.push(item);
          }
        });
      });

      // Sortowanie elementów po pozycji Y (góra-dół), a następnie X (lewo-prawo)
      pdfItems.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 0.5) {
          return a.x - b.x; 
        }
        return a.y - b.y; 
      });

      // Spłaszczamy tekst PDF do jednej długiej linii
      const cleanText = pdfItems.map(item => item.text).join(' ').replace(/\s+/g, ' ');

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

      // Wyciągamy stacje z sekcji KOD
      const routeMatch = cleanText.match(/KOD\s+\d+\s+(.*?)\s+Data odjazdu/);
      let route = routeMatch ? routeMatch[1].trim() : '';

      // Usunięcie niechcianego dopisku z imieniem jeśli się przypałęta
      if (route.toLowerCase().includes('podróżny')) {
          route = route.replace(/PODRÓŻNY.*?(\s|$)/ig, '').trim();
      }

      // --- INTELIGENTNY PODZIAŁ STACJI ---
      let from = '';
      let to = '';
      
      const words = route.split(/\s+/).filter(Boolean);
      // Słownik popularnych członów, które nie powinny być odrywane od nazwy miasta
      const suffixes = [
        'gł.', 'główny', 'główna', 'centr.', 'centralna', 'centralny', 
        'wsch.', 'wschodni', 'wschodnia', 'zach.', 'zachodni', 'zachodnia', 
        'płn.', 'północ', 'północny', 'płd.', 'południe', 'południowy', 
        'zdrój', 'miasto', 'przedmieście', 'lotnisko', 'wlkp.', 'śl.', 'maz.', 'kuj.', 'pomorski'
      ];
      
      if (words.length === 2) {
        from = words[0];
        to = words[1];
      } else if (words.length === 4) {
        // Idealny podział dla typowych tras 4-członowych (np. "Poznań Gł. Wrocław Gł.")
        from = words[0] + ' ' + words[1];
        to = words[2] + ' ' + words[3];
      } else if (words.length > 0) {
        // Grupowanie na podstawie przyrostków dla nietypowej liczby słów
        const stationsList: string[] = [];
        let current = words[0] || '';
        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const isSuffix = suffixes.includes(word.toLowerCase()) || word.endsWith('.');
          if (isSuffix) {
            current += ' ' + word;
          } else {
            stationsList.push(current);
            current = word;
          }
        }
        if (current) stationsList.push(current);

        from = stationsList[0] || '';
        to = stationsList.slice(1).join(' ') || '';
      }
      if (from && to) {
        route = from.replace(/ /g, '\xA0') + ' ' + to.replace(/ /g, '\xA0');
      }

      return res.status(200).json({
        trainNumber,
        trainName,
        date,
        departureTime,
        wagon,
        seat,
        route,
        // Zwracamy też czyste stacje na przyszłość (opcjonalnie do wykorzystania)
        from: from.replace(/\xA0/g, ' '), 
        to: to.replace(/\xA0/g, ' ')
      });

    } catch (error) {
      console.error('[PDF Extract Error]:', error);
      return res.status(500).json({ error: 'Błąd wczytywania PDF' });
    }
  });
}