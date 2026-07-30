import type { GetServerSideProps } from "next";

const BASE_URL = "https://dzisiaj.fun";

const STATIC_PAGES: Array<{
  url: string;
  priority: string;
  changefreq: string;
}> = [
  { url: "",         priority: "1.0", changefreq: "weekly"  },
  { url: "/start",   priority: "0.9", changefreq: "monthly" },
  { url: "/guide",   priority: "0.7", changefreq: "monthly" },
  { url: "/privacy", priority: "0.3", changefreq: "yearly"  },
];

function generateSiteMap(): string {
  const lastmod = new Date().toISOString();
  const urls = STATIC_PAGES.map(
    ({ url, priority, changefreq }) => `
  <url>
    <loc>${BASE_URL}${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate"
  );
  res.write(generateSiteMap());
  res.end();
  return { props: {} };
};

export default function SiteMap() {
  return null;
}
