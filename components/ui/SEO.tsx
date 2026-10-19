// components/ui/SEO.tsx

import Head from "next/head";
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
  keywords?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export default function Seo({
  title = "Dzisiaj.Fun – zadania, kalendarz, budżet i notatki",
  description = "Zadania, kalendarz, rachunki, budżet, notatki i listy zakupów w jednej aplikacji. Synchronizacja z Kalendarzem Google i Outlookiem.",
  canonical = "https://dzisiaj.fun",
  ogImage = "https://dzisiaj.fun/og-image.png",
  ogType = "website",
  twitterCard = "summary_large_image",
  noindex = false,
  nofollow = false,
  structuredData,
  keywords = "zadania, kalendarz, notatki, rachunki, budżet, listy zakupów, pomodoro, organizacja czasu, planner",
  author = "Dzisiaj.Fun",
  publishedTime,
  modifiedTime,
}: Readonly<SeoProps>) {
  const fullTitle = title.includes("Dzisiaj") ? title : `${title} | Dzisiaj.Fun`;
  const robotsContent = `${noindex ? "noindex" : "index"},${nofollow ? "nofollow" : "follow"}`;

  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Dzisiaj.Fun",
    description: description,
    url: canonical,
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
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
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
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={fullTitle} />
      <meta name="twitter:creator" content="@dzisiajapp" />
      <meta name="twitter:site" content="@dzisiajapp" />

      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Dzisiaj.Fun" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd }} />
    </Head>
  );
}
