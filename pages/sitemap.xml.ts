// pages/sitemap.xml.ts

import { publicEnv } from "@/config/env";
import { CACHE_CONTROL } from "@/config/server";
import type { GetServerSideProps } from "next";

const BASE_URL = "https://www.dzisiaj.fun";

/** Data zbudowania wersji; zmienia się tylko przy wdrożeniu, a nie przy każdym żądaniu. */
const LASTMOD = publicEnv.buildDate ?? new Date().toISOString();

const STATIC_PAGES: Array<{
  url: string;
  priority: string;
  changefreq: string;
}> = [
  { url: "/start", priority: "1.0", changefreq: "monthly" },
  { url: "/guide", priority: "0.7", changefreq: "monthly" },
  { url: "/demo", priority: "0.8", changefreq: "monthly" },
  { url: "/privacy", priority: "0.3", changefreq: "yearly" },
  { url: "/terms", priority: "0.3", changefreq: "yearly" },
];

function generateSiteMap(): string {
  const urls = STATIC_PAGES.map(
    ({ url, priority, changefreq }) => `
  <url>
    <loc>${BASE_URL}${url}</loc>
    <lastmod>${LASTMOD}</lastmod>
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

export const getServerSideProps: GetServerSideProps = ({ res }) => {
  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE_CONTROL.sitemap);
  res.write(generateSiteMap());
  res.end();
  return Promise.resolve({ props: {} });
};

export default function SiteMap() {
  return null;
}
