// components/ui/SEO.tsx

import Head from "next/head";
import { useRouter } from "next/router";
import { sanitizeJsonLd } from "@/lib/sanitize";

interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  noindex?: boolean;
  nofollow?: boolean;
  structuredData?: Record<string, unknown>;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const SITE_URL = "https://www.dzisiaj.fun";

export default function Seo({
  title = "Dzisiaj.Fun | zadania, kalendarz, budżet i notatki",
  description = "Zadania, kalendarz, rachunki, budżet, notatki i listy zakupów w jednej aplikacji. Synchronizacja z Kalendarzem Google i Outlookiem.",
  canonical,
  ogImage = "https://www.dzisiaj.fun/og-image.png",
  ogType = "website",
  twitterCard = "summary_large_image",
  noindex = false,
  nofollow = false,
  structuredData,
  author = "Dzisiaj.Fun",
  publishedTime,
  modifiedTime,
}: Readonly<SeoProps>) {
  const router = useRouter();
  // Domyślny canonical: bieżąca ścieżka bez parametrów i fragmentu (strony nie podają go wprost, gdy adres jest dynamiczny).
  const path = (router?.asPath ?? "/").split(/[?#]/)[0];
  const canonicalUrl = canonical ?? (path === "/" ? SITE_URL : `${SITE_URL}${path}`);
  const fullTitle = title.includes("Dzisiaj") ? title : `${title} | Dzisiaj.Fun`;
  const robotsContent = `${noindex ? "noindex" : "index"},${nofollow ? "nofollow" : "follow"}`;

  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Dzisiaj.Fun",
    description: description,
    url: canonicalUrl,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web Browser, iOS, Android",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "PLN",
    },
    author: {
      "@type": "Organization",
      name: "Dzisiaj.Fun",
    },
    inLanguage: "pl-PL",
  };

  const finalStructuredData = structuredData ?? defaultStructuredData;
  const safeJsonLd = sanitizeJsonLd(finalStructuredData);

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content={author} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Dzisiaj.Fun" />
      <meta property="og:locale" content="pl_PL" />

      {ogType === "article" && publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {ogType === "article" && modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {ogType === "article" && <meta property="article:author" content={author} />}

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={fullTitle} />

      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Dzisiaj.Fun" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd }} />
    </Head>
  );
}
