const withPWA = require("next-pwa")({
  dest: "public",
  buildExcludes: [/./], 
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", 
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {}, 
};

module.exports = withPWA(nextConfig);