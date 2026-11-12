// lib/fonts.ts
//
// Jedyny krój aplikacji. Klasa `variable` trafia na <html> (pages/_document.tsx), więc zmienna
// --font-atkinson jest dostępna w całym dokumencie, także w oknach i podpowiedziach poza drzewem Reacta.

import { Atkinson_Hyperlegible_Next } from "next/font/google";

export const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-atkinson",
});
