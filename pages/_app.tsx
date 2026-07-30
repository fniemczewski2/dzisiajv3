// pages/_app.tsx
import { useEffect } from "react";
import App, { type AppContext, type AppProps } from "next/app";
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

interface MyAppProps extends AppProps {
  nonce?: string;
}

export default function MyApp({ Component, pageProps, nonce }: MyAppProps) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
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

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  const nonce = appContext.ctx.res?.getHeader("x-nonce") as string | undefined;
  return { ...appProps, nonce };
};
