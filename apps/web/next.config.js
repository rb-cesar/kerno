/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@kerno/events",
    "@kerno/db",
    "@kerno/types",
    "@kerno/ui",
    "@kerno/kanban",
    "@kerno/chat",
  ],
};

module.exports = nextConfig;
