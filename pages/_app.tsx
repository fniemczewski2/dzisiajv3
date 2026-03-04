// pages/_app.tsx
import type { AppProps } from 'next/app';
import { AuthProvider } from '../providers/AuthProvider'; 
import AuthGuard from '../components/AuthGuard';
import "../styles/globals.css";
import ErrorBoundary from '../components/ErrorBoundary';

type AuthedComponent = AppProps['Component'] & { auth?: boolean };

export default function MyApp({
  Component,
  pageProps,
}: AppProps & { Component: AuthedComponent }) {
  
  const needsAuth = Component?.auth === true;

  return (
    <ErrorBoundary>
      <AuthProvider>
        {needsAuth ? (
          <AuthGuard>
            <Component {...pageProps} />
          </AuthGuard>
        ) : (
          <Component {...pageProps} />
        )}
      </AuthProvider>
    </ErrorBoundary>
  );
}