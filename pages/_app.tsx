// pages/_app.tsx
import type { AppProps } from "next/app";
import { AuthProvider } from "../providers/AuthProvider";
import { ToastProvider } from "../providers/ToastProvider";
import "../styles/globals.css";
import ErrorBoundary from "../components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import CookieBanner from "../components/CookieBanner"; 
import Layout from "../components/Layout";

export default function MyApp({
  Component,
  pageProps,
  router
}: AppProps) {

  const isAuthPage = router.pathname === '/login';

  if (isAuthPage) {
    return (
      <AuthProvider>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </AuthProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <Layout>            
              <Component {...pageProps} />
              <CookieBanner />
            </Layout>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}