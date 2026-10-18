// pages/_document.tsx

import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="pl">
      <Head>
        <meta charSet="UTF-8" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Dzisiaj.Fun" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F7F8FA" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#04080F" />
        <meta name="msapplication-TileColor" content="#0A2947" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="alternate" hrefLang="pl" href="https://dzisiaj.fun" />
        <link rel="alternate" hrefLang="x-default" href="https://dzisiaj.fun" />
      </Head>
      <body className="bg-background p-3 font-sans text-text transition-colors duration-300 sm:p-4">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
