import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
const pdfParse = require('pdf-parse');

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Błąd wgrywania' });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: 'Brak pliku' });

    try {
      const dataBuffer = fs.readFileSync(file.filepath);
      const parseFunction = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
      const pdfData = await parseFunction(dataBuffer);
      const text = pdfData.text;

      const trainMatch = text.match(/Pociąg:\s*(.+)/);
      const dateMatch = text.match(/Data odjazdu \/przyjazdu:\s*([\d\.]+)/);
      const timeMatch = text.match(/Godzina odjazdu \/ przyjazdu:\s*([\d:]+)\s*([\d:]+)/);
      const wagonMatch = text.match(/Wagon:\s*(\d+)/);
      const seatMatch = text.match(/Miejsca:\s*([\d\w\s,]+)/);
      const stationRegex = /(?:BILET NR.*?\n)(.*?)(?=\nData odjazdu)/s;
      const stationsMatch = text.match(stationRegex);

      return res.status(200).json({
        trainNumber: trainMatch ? trainMatch[1].split(' ').slice(0, 2).join(' ') : '',
        date: dateMatch ? dateMatch[1].split('.').reverse().join('-') : '',
        departureTime: timeMatch ? timeMatch[1] : '',
        wagon: wagonMatch ? wagonMatch[1] : '',
        seat: seatMatch ? seatMatch[1].split('\n')[0].trim() : '',
        route: stationsMatch ? stationsMatch[1].trim() : '',
      });
    } catch (error) {
      return res.status(500).json({ error: 'Błąd parsowania PDF' });
    }
  });
}