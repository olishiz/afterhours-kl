import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  output: "export",
  basePath: "/afterhours-kl",
  assetPrefix: "/afterhours-kl",
  images: { unoptimized: true },
};

export default nextConfig;
