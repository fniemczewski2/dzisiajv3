import type { GetServerSideProps } from "next";

const BASE_URL = "https://dzisiajv3.vercel.app";

const STATIC_PAGES: Array<{
  url: string;
  priority: string;
  changefreq: string;
}> = [
  { url: "",                    priority: "1.0", changefreq: "daily"   },
  { url: "/tasks",              priority: "0.9", changefreq: "daily"   },
  { url: "/tasks/daySchema",    priority: "0.8", changefreq: "daily"   },
  { url: "/tasks/pomodoro",     priority: "0.8", changefreq: "weekly"  },
  { url: "/notes",              priority: "0.9", changefreq: "daily"   },
  { url: "/notes/shopping",     priority: "0.7", changefreq: "weekly"  },
  { url: "/notes/recipes",      priority: "0.7", changefreq: "weekly"  },
  { url: "/notes/places",       priority: "0.7", changefreq: "weekly"  },
  { url: "/notes/movies",       priority: "0.7", changefreq: "weekly"  },
  { url: "/packing/backpack",   priority: "0.7", changefreq: "weekly"  },
  { url: "/packing/suitcase",   priority: "0.7", changefreq: "weekly"  },
  { url: "/packing/safety",     priority: "0.7", changefreq: "weekly"  },
  { url: "/calendar",           priority: "0.9", changefreq: "daily"   },
  { url: "/bills",              priority: "0.8", changefreq: "weekly"  },
  { url: "/bills/budget",       priority: "0.8", changefreq: "weekly"  },
  { url: "/notes/reports",      priority: "0.7", changefreq: "weekly"  },
  { url: "/weather",            priority: "0.9", changefreq: "hourly"  },
  { url: "/training",           priority: "0.7", changefreq: "weekly"  },
  { url: "/streaks",            priority: "0.7", changefreq: "weekly"  },
  { url: "/transport",          priority: "0.7", changefreq: "daily"   },
  { url: "/settings",           priority: "0.6", changefreq: "monthly" },
  { url: "/login",              priority: "0.5", changefreq: "monthly" },
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
  // Cache for 24 hours at the CDN, serve stale while revalidating.
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