// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useMemo } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { getBrowserSupabaseClient } from '../lib/supabaseClient';
import AuthGuard from '../components/AuthGuard';
import "../styles/globals.css";

type AuthedComponent = AppProps['Component'] & { auth?: boolean };

export default function MyApp({
  Component,
  pageProps,
}: AppProps & { Component: AuthedComponent }) {
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const needsAuth = Component?.auth === true;

  return (
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
  );
}

