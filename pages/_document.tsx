// pages/_document.tsx

import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

interface MyDocumentProps {
  nonce?: string;
}

export default class MyDocument extends Document<MyDocumentProps> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const nonce = ctx.res?.getHeader('x-nonce') as string | undefined;
    return { ...initialProps, nonce };
  }

  render() {
    const { nonce } = this.props;

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
          <meta name="csp-nonce" content={nonce} />
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
