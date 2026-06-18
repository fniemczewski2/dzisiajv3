import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import os from 'os'; 
import { PdfReader } from 'pdfreader';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

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
      const pdfItems: any[] = [];

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

      pdfItems.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 0.5) {
          return a.x - b.x; 
        }
        return a.y - b.y; 
      });

      const cleanText = pdfItems.map(item => item.text).join(' ').replaceAll(/\s+/g, ' ');

const trainMatch = cleanText.match(/Pociąg:\s*([A-Za-z]{0,20}\s*\d{1,10})(?:\s*\/\s*\d{1,10})?\s*(.{0,100}?)\s*Wagon/);
      const trainNumber = trainMatch ? trainMatch[1].trim() : '';
      const trainName = trainMatch ? trainMatch[2].trim() : '';

      const dateMatch = cleanText.match(/Data odjazdu.{0,100}?(\d{2}\.\d{2}\.\d{4})/);
      const date = dateMatch ? dateMatch[1] : ''; 

      const timeMatch = cleanText.match(/Godzina odjazdu.{0,100}?(\d{2}:\d{2})/);
      const departureTime = timeMatch ? timeMatch[1] : '';

      const wagonMatch = cleanText.match(/Wagon:\s*(\d{1,10})/);
      const wagon = wagonMatch ? wagonMatch[1] : '';

      const seatMatch = cleanText.match(/Miejsca:\s*(\d{1,10})/);
      const seat = seatMatch ? seatMatch[1] : '';

      const routeMatch = cleanText.match(/KOD\s+\d{1,20}\s+(.{1,200}?)\s+Data odjazdu/);
      let route = routeMatch ? routeMatch[1].trim() : '';

      if (route.toLowerCase().includes('podróżny')) {
          route = route.replaceAll(/PODRÓŻNY.*?(\s|$)/ig, '').trim();
      }

      let from = '';
      let to = '';
      
      const words = route.split(/\s+/).filter(Boolean);
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
        from = words[0] + ' ' + words[1];
        to = words[2] + ' ' + words[3];
      } else if (words.length > 0) {
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
        route = from.replaceAll(/ /g, '\xA0') + ' ' + to.replaceAll(/ /g, '\xA0');
      }

      return res.status(200).json({
        trainNumber,
        trainName,
        date,
        departureTime,
        wagon,
        seat,
        route,
        from: from.replaceAll(/\xA0/g, ' '), 
        to: to.replaceAll(/\xA0/g, ' ')
      });

    } catch (error) {
      console.error('[PDF Extract Error]:', error);
      return res.status(500).json({ error: 'Błąd wczytywania PDF' });
    } finally {
      if (file && file.filepath) {
        fs.unlink(file.filepath, (unlinkErr) => {
          if (unlinkErr) console.error('[Cleanup Error]: Nie udało się usunąć pliku tymczasowego', unlinkErr);
        });
      }
    }
  });
}