/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};
module.exports = nextConfig;

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // PWA off in dev
});

module.exports = withPWA({
  reactStrictMode: true,
});
