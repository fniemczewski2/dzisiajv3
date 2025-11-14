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
          {/* Character Encoding */}
          <meta charSet="UTF-8" />

          {/* PWA Meta Tags */}
          <link rel="manifest" href="/manifest.json" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Dzisiaj v3" />
          
          {/* Theme Color */}
          <meta name="theme-color" content="#0ea5e9" />
          <meta name="msapplication-TileColor" content="#0ea5e9" />
          <meta name="msapplication-navbutton-color" content="#0ea5e9" />

          {/* Icons */}
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

          {/* Language Alternatives */}
          <link rel="alternate" hrefLang="pl" href="https://dzisiajv3.vercel.app" />
          <link rel="alternate" hrefLang="x-default" href="https://dzisiajv3.vercel.app" />

          {/* DNS Prefetch for Performance */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

          {/* Security Headers */}
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="referrer" content="origin-when-cross-origin" />

          {/* Verification Tags (Add your verification codes when you have them) */}
          {/* <meta name="google-site-verification" content="your-verification-code" /> */}
          {/* <meta name="facebook-domain-verification" content="your-verification-code" /> */}
        </Head>
        <body className="bg-gray-50 text-gray-800 justify-center p-4 min-h-screen antialiased">
          {/* Skip to main content for accessibility */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Przejdź do głównej treści
          </a>
          
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
