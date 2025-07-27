import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="pl">
      <Head>
        <meta charSet="UTF-8" />
        <meta
          name="description"
          content="Dzisiaj v3 - zarządzaj zadaniami, notatkami, rachunkami i kalendarzem w jednym miejscu."
        />
        <link rel="manifest" href="../manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/icon.ico" />
      </Head>
      <body className="bg-gray-50 text-gray-800 justify-center p-4">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
