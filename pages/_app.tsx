// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { getBrowserSupabaseClient } from "../lib/supabaseClient";

// client-only guard
const AuthGuard = dynamic(() => import("../components/AuthGuard"), {
  ssr: false,
});

function MyApp({ Component, pageProps }: AppProps) {
  const needsAuth = (Component as any).auth === true;

  return (
    <SessionContextProvider
      supabaseClient={getBrowserSupabaseClient()}
      initialSession={pageProps.initialSession}
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

export default MyApp;
