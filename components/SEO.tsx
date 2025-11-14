import Head from 'next/head';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  noindex?: boolean;
  nofollow?: boolean;
  structuredData?: object;
  keywords?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export default function SEO({
  title = 'Dzisiaj v3 - Zarządzaj Zadaniami, Notatkami i Kalendarzem',
  description = 'Dzisiaj v3 to kompleksowa aplikacja do zarządzania czasem i produktywnością. Organizuj zadania, notatki, rachunki, kalendarz i trenuj z technikami Pomodoro i Eisenhower Matrix.',
  canonical = 'https://dzisiajv3.vercel.app',
  ogImage = 'https://dzisiajv3.vercel.app/og-image.png',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  noindex = false,
  nofollow = false,
  structuredData,
  keywords = 'zarządzanie zadaniami, produktywność, notatki, kalendarz, pomodoro, eisenhower matrix, organizacja czasu, todo list, planner',
  author = 'Dzisiaj v3',
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const fullTitle = title.includes('Dzisiaj') ? title : `${title} - Dzisiaj v3`;
  const robotsContent = `${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}`;

  // Default structured data for WebSite
  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Dzisiaj v3',
    description: description,
    url: canonical,
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web Browser, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'PLN',
    },
    author: {
      '@type': 'Organization',
      name: 'Dzisiaj v3',
    },
    inLanguage: 'pl-PL',
  };

  const finalStructuredData = structuredData || defaultStructuredData;

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Dzisiaj v3" />
      <meta property="og:locale" content="pl_PL" />

      {/* Article Meta (if applicable) */}
      {ogType === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {ogType === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {ogType === 'article' && (
        <meta property="article:author" content={author} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={fullTitle} />
      <meta name="twitter:creator" content="@dzisiajapp" />
      <meta name="twitter:site" content="@dzisiajapp" />

      {/* Additional Meta Tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Dzisiaj v3" />

      {/* Structured Data (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(finalStructuredData),
        }}
      />
    </Head>
  );
}

// Utility function to create breadcrumb structured data
export function createBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Utility function to create article structured data
export function createArticleSchema({
  title,
  description,
  image,
  datePublished,
  dateModified,
  author,
  url,
}: {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: image,
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Dzisiaj v3',
      logo: {
        '@type': 'ImageObject',
        url: 'https://dzisiajv3.vercel.app/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}

// Utility function to create FAQ structured data
export function createFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
