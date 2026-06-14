/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@kerno/core",
    "@kerno/db",
    "@kerno/types",
    "@kerno/ui",
    "@kerno/hub-kanban",
    "@kerno/hub-chat",
  ],
};

module.exports = nextConfig;
