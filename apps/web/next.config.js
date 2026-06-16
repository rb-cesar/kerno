/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@kerno/core",
    "@kerno/db",
    "@kerno/ui",
    "@kerno/kanban",
    "@kerno/chat",
  ],
};

module.exports = nextConfig;
