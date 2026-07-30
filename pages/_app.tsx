// pages/_app.tsx

import { useEffect, useState } from "react";
import {type AppProps } from "next/app";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import "../styles/globals.css";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import CookieBanner from "@/components/CookieBanner";
import Layout from "@/components/ui/Layout";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export default function MyApp({ Component, pageProps}: Readonly<AppProps>) {
  const [nonce, setNonce] = useState<string | undefined>();
  
  useEffect(() => {
    setNonce(document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" })
        .catch((error) => console.warn("[SW] Rejestracja nie powiodła się:", error));
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
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
