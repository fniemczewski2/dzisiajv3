// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { getBrowserSupabaseClient } from '../lib/supabaseClient';

const AuthGuard = dynamic(() => import('../components/AuthGuard'), { ssr: false });

export default function MyApp({ Component, pageProps }: AppProps & { Component: any }) {
  const needsAuth = Component?.auth === true;

  return (
    <SessionContextProvider
      supabaseClient={getBrowserSupabaseClient()}
      initialSession={(pageProps as any)?.initialSession}
    >
      {needsAuth ? (
        //<AuthGuard>
          <Component {...pageProps} />
        //</AuthGuard>
      ) : (
        <Component {...pageProps} />
      )}
    </SessionContextProvider>
  );
}
