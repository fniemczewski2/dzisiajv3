import Document, {
  Html,
  Head,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentInitialProps,
} from 'next/document';

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="pl">
        <Head>
          <meta charSet="UTF-8" />

          <link rel="manifest" href="/manifest.json" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Dzisiaj v3" />
          <meta name="theme-color" content="#0ea5e9" />
          <meta name="msapplication-TileColor" content="#0ea5e9" />
          <meta name="msapplication-navbutton-color" content="#0ea5e9" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

          <link rel="alternate" hrefLang="pl" href="https://dzisiajv3.vercel.app" />
          <link rel="alternate" hrefLang="x-default" href="https://dzisiajv3.vercel.app" />

          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
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
