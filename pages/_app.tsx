// pages/_app.tsx

import { checkForServiceWorkerUpdate, registerServiceWorker } from "@/lib/serviceWorker";
import OfflineSync from "@/components/OfflineSync";
import { SettingsProvider } from "@/providers/SettingsProvider";
import { useEffect } from "react";
import { type AppProps } from "next/app";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import "../styles/globals.css";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import CookieBanner from "@/components/CookieBanner";
import Layout from "@/components/ui/Layout";

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-atkinson",
});

export default function MyApp({ Component, pageProps }: Readonly<AppProps>) {
  useEffect(() => {
    void registerServiceWorker().then((registration) => {
      if (registration) void checkForServiceWorkerUpdate(registration);
    });
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <SettingsProvider>
              <OfflineSync />
              <style jsx global>{`
                :root {
                  --font-atkinson: ${atkinson.style.fontFamily};
                }
              `}</style>
              <div className="contents">
                <Layout>
                  <Component {...pageProps} />
                  <CookieBanner />
                </Layout>
              </div>
            </SettingsProvider>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
