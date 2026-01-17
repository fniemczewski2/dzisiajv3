// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useEffect, useMemo } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { getBrowserSupabaseClient } from '../lib/supabaseClient';
import AuthGuard from '../components/AuthGuard';
import "../styles/globals.css";
import ErrorBoundary from '../components/ErrorBoundary';

type AuthedComponent = AppProps['Component'] & { auth?: boolean };

export default function MyApp({
  Component,
  pageProps,
}: AppProps & { Component: AuthedComponent }) {
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const needsAuth = Component?.auth === true;

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <ErrorBoundary>
      <SessionContextProvider
        supabaseClient={supabase}
        initialSession={(pageProps as any)?.initialSession}
      >
        {needsAuth ? (
          <AuthGuard>
            <Component {...pageProps} />
          </AuthGuard>
        ) : (
          <Component {...pageProps} />
        )}
      </SessionContextProvider>
    </ErrorBoundary>
  );
}

