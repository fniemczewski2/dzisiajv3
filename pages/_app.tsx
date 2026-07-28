// pages/_app.tsx
import { useEffect } from "react";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import "../styles/globals.css";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import CookieBanner from "@/components/CookieBanner"; 
import Layout from "@/components/ui/Layout";

// Font self-hostowany przez next/font (zero zapytań do Google Fonts,
// zero CLS). Wcześniej globals.css deklarował "Inter Variable", ale font
// nigdy nie był ładowany — aplikacja renderowała systemowy sans-serif,
// a preconnecty w _document były martwe.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export default function MyApp({ Component, pageProps }: AppProps) {
  // Rejestracja Service Workera GLOBALNIE, dla każdego użytkownika.
  // Wcześniej działa się tylko w usePushNotifications (strona ustawień),
  // więc kto nie wszedł w ustawienia, nie miał SW — czyli ani offline,
  // ani instalowalnego PWA.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => console.warn("[SW] Rejestracja nie powiodła się:", error));
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <div className={`${inter.variable} contents`}>
              <Layout>            
                <Component {...pageProps} />
                <CookieBanner />
              </Layout>
            </div>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
