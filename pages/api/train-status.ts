import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { trainNumber } = req.query;
  const apiKey = process.env.PLK_API_KEY;

  // 1. Walidacja wejścia
  if (!trainNumber) {
    return res.status(400).json({ error: 'Brak numeru pociągu' });
  }

  if (!apiKey) {
    console.error('[API ERROR] Brak zmiennej środowiskowej PLK_API_KEY');
    return res.status(500).json({ error: 'Błąd konfiguracji serwera' });
  }

  try {
    // 2. Wyszukanie pociągu (Step 1)
    const searchRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/trains?number=${trainNumber}`, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      }
    });

    // Sprawdzenie czy API odpowiedziało poprawnie (status 200)
    if (!searchRes.ok) {
        const errorText = await searchRes.text();
        console.error(`[API ERROR] Wyszukiwanie nieudane. Status: ${searchRes.status}, Odpowiedź: ${errorText}`);
        return res.status(searchRes.status).json({ error: 'API PLK zwróciło błąd wyszukiwania', details: errorText });
    }

    const searchData = await searchRes.json();

    // Sprawdzenie czy znaleziono wyniki
    if (!Array.isArray(searchData) || searchData.length === 0) {
      return res.status(404).json({ error: `Nie znaleziono pociągu o numerze ${trainNumber}` });
    }

    const trainId = searchData[0].id;

    // 3. Pobranie szczegółów (Step 2)
    const detailsRes = await fetch(`https://pdp-api.plk-sa.pl/api/v1/trains/${trainId}`, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      }
    });

    if (!detailsRes.ok) {
        const errorText = await detailsRes.text();
        console.error(`[API ERROR] Pobieranie szczegółów nieudane. Status: ${detailsRes.status}`);
        return res.status(detailsRes.status).json({ error: 'API PLK zwróciło błąd szczegółów', details: errorText });
    }

    const details = await detailsRes.json();

    // 4. Zwrócenie danych do frontendu
    return res.status(200).json({
      delay: details.delayMinutes || 0,
      platform: details.platform || 'Oczekuje',
      status: details.status || 'Brak danych'
    });

  } catch (error) {
    console.error('[CRITICAL] Błąd przetwarzania:', error);
    return res.status(500).json({ error: 'Wystąpił błąd podczas komunikacji z API PLK' });
  }
}