const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  importScripts: ['/custom-sw.js'],
  buildExcludes: [
    /middleware-manifest\.json$/,
    /.*dynamic-css-manifest\.json$/, 
    /.*\.map$/,
  ],
  runtimeCaching: [
    {
      urlPattern: /_next\/.*manifest\.json$/,
      handler: 'NetworkOnly',
    },
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
  webpack: (config) => {
    return config;
  },
};

module.exports = withPWA(nextConfig);