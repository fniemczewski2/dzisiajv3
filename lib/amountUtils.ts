export function isValidAmountInput(raw: string): boolean {
  return /^\d*[.,]?\d*$/.test(raw);
}

export function parseAmountInput(raw: string): number {
  const parsed = Number.parseFloat(raw.replace(',', '.'));
  return Number.isNaN(parsed) ? 0 : parsed;
}
