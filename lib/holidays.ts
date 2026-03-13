// lib/holidays.ts

// Algorytm wyznaczający datę Wielkanocy (Meeusa/Jonesa/Butchera)
export function getEaster(year: number): Date {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
}

export function getPolishHolidays(year: number): Record<string, string> {
  const easter = getEaster(year);
  
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDate = (d: Date) => {
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };

  const holidays: Record<string, string> = {};

  // Święta stałe
  holidays[`${year}-01-01`] = "Nowy Rok";
  holidays[`${year}-01-06`] = "Trzech Króli";
  holidays[`${year}-05-01`] = "Święto Pracy";
  holidays[`${year}-05-03`] = "Święto Konstytucji 3 Maja";
  holidays[`${year}-08-15`] = "Wniebowzięcie NMP";
  holidays[`${year}-11-01`] = "Wszystkich Świętych";
  holidays[`${year}-11-11`] = "Święto Niepodległości";
  holidays[`${year}-12-24`] = "Wigilia";
  holidays[`${year}-12-25`] = "Boże Narodzenie";
  holidays[`${year}-12-26`] = "Boże Narodzenie";

  // Święta ruchome (od Wielkanocy)
  holidays[formatDate(easter)] = "Wielkanoc";
  holidays[formatDate(addDays(easter, 1))] = "Poniedziałek Wielkanocny";
  holidays[formatDate(addDays(easter, 60))] = "Boże Ciało";

  return holidays;
}