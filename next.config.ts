import type { NextConfig } from "next";

const pagesBasePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  output: "export",
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: pagesBasePath,
  },
};

if (pagesBasePath) {
  nextConfig.basePath = pagesBasePath;
  nextConfig.assetPrefix = pagesBasePath;
}

export default nextConfig;
