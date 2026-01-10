import { GetServerSideProps } from 'next';

function generateSiteMap() {
  const baseUrl = 'https://dzisiajv3.vercel.app';
  const currentDate = new Date().toISOString();

  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/tasks', priority: '0.9', changefreq: 'daily' },
    { url: '/tasks/daySchema', priority: '0.8', changefreq: 'daily' },
    { url: '/tasks/pomodoro', priority: '0.8', changefreq: 'weekly' },
    { url: '/tasks/eisenhower', priority: '0.8', changefreq: 'weekly' },
    { url: '/tasks/kanban', priority: '0.8', changefreq: 'weekly' },
    { url: '/notes', priority: '0.9', changefreq: 'daily' },
    { url: '/notes/shopping', priority: '0.7', changefreq: 'weekly' },
    { url: '/notes/recipes', priority: '0.7', changefreq: 'weekly' },
    { url: '/notes/backpack', priority: '0.7', changefreq: 'weekly' },
    { url: '/notes/suitcase', priority: '0.7', changefreq: 'weekly' },
    { url: '/notes/safety', priority: '0.7', changefreq: 'weekly' },
    { url: '/calendar', priority: '0.9', changefreq: 'daily' },
    { url: '/bills', priority: '0.8', changefreq: 'weekly' },
    { url: '/bills/budget', priority: '0.8', changefreq: 'weekly' },
    { url: '/reports', priority: '0.7', changefreq: 'weekly' },
    { url: '/weather', priority: '0.9', changefreq: 'hourly' },
    { url: '/training', priority: '0.7', changefreq: 'weekly' },
    { url: '/settings', priority: '0.6', changefreq: 'monthly' },
    { url: '/login', priority: '0.5', changefreq: 'monthly' },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const sitemap = generateSiteMap();

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default function SiteMap() {
  return null;
}
