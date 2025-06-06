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
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="bg-gray-50 text-gray-800 justify-center p-4">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
