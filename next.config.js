const withPWA = require("next-pwa")({
  dest: "public",
  importScripts: ['/custom-sw.js'],
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", 
  buildExcludes: [
    /middleware-manifest\.json$/,
    /_next\/dynamic-css-manifest\.json$/, 
    /chunks\/.*\.js.map$/,
  ],
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