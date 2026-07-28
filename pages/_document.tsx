import Document, { Html, Head, Main, NextScript } from 'next/document';

// Zmiany względem poprzedniej wersji:
// - usunięte getInitialProps, które tylko delegowało do klasy bazowej (martwy kod),
// - usunięte 4 preconnecty do Google Fonts (font jest teraz self-hostowany
//   przez next/font w _app.tsx — te hinty były martwe),
// - theme-color ujednolicony z manifest.json i paletą (--color-primary #2563EB;
//   wcześniej meta mówiła #0ea5e9, a manifest #2563EB),
// - usunięty relikt <meta httpEquiv="X-UA-Compatible" content="IE=edge">.
export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="pl">
        <Head>
          <meta charSet="UTF-8" />

          <link rel="manifest" href="/manifest.json" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Dzisiaj.Fun" />
          <meta name="theme-color" content="#2563EB" />
          <meta name="msapplication-TileColor" content="#2563EB" />
          <meta name="msapplication-navbutton-color" content="#2563EB" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

          <link rel="alternate" hrefLang="pl" href="https://dzisiaj.fun" />
          <link rel="alternate" hrefLang="x-default" href="https://dzisiaj.fun" />

          <meta name="referrer" content="origin-when-cross-origin" />
        </Head>
        <body className="bg-background text-text transition-colors duration-300 p-4">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
