// Wspólna logika pola kwoty w formularzach rachunków. Pozwala użytkownikowi
// wpisać przecinek LUB kropkę jako separator dziesiętny, bez przedwczesnego
// (i utratowego - patrz parseAmountInput) zamieniania tekstu na liczbę przy
// każdym naciśnięciu klawisza.

// Dopuszcza tylko cyfry i co najwyżej jeden separator dziesiętny (przecinek/kropkę).
export function isValidAmountInput(raw: string): boolean {
  return /^\d*[.,]?\d*$/.test(raw);
}

// Number.parseFloat("36,75") zwraca 36 (zatrzymuje się na przecinku) - dlatego
// zawsze normalizujemy separator do kropki PRZED sparsowaniem, inaczej grosze
// po przecinku znikają po cichu.
export function parseAmountInput(raw: string): number {
  const parsed = Number.parseFloat(raw.replace(',', '.'));
  return Number.isNaN(parsed) ? 0 : parsed;
}
