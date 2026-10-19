// config/theme.mjs
//
// Ustawienia next-themes – wspólne dla _app (ThemeProvider) i next.config.mjs,
// który liczy z nich skrót SHA-256 skryptu motywu do CSP. Zmiana tutaj
// automatycznie zmienia skrót; plik jest .mjs, bo next.config.mjs nie importuje TS.

export const THEME_PROVIDER_PROPS = Object.freeze({
  attribute: "class",
  defaultTheme: "system",
  enableSystem: true,
});
