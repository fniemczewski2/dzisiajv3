// pages/_app.tsx
import type { AppProps } from "next/app";
import { AuthProvider } from "../providers/AuthProvider";
import { ToastProvider } from "../providers/ToastProvider";
import AuthGuard from "../components/AuthGuard";
import "../styles/globals.css";
import ErrorBoundary from "../components/ErrorBoundary";
import { ThemeProvider } from "next-themes";

type AuthedComponent = AppProps["Component"] & { auth?: boolean };

export default function MyApp({
  Component,
  pageProps,
}: AppProps & { Component: AuthedComponent }) {
  const needsAuth = Component?.auth === true;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            {needsAuth ? (
              <AuthGuard>
                <Component {...pageProps} />
              </AuthGuard>
            ) : (
              <Component {...pageProps} />
            )}
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}