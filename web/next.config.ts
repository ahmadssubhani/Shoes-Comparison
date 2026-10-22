import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.puma.com", pathname: "/**" },
      { protocol: "https", hostname: "images.skechers.com", pathname: "/**" },
      { protocol: "https", hostname: "m.media-amazon.com", pathname: "/**" },
      { protocol: "https", hostname: "static.nike.com", pathname: "/**" },
      { protocol: "https", hostname: "**.nike.com", pathname: "/**" },
      { protocol: "https", hostname: "**.puma.com", pathname: "/**" },
      { protocol: "https", hostname: "**.skechers.com", pathname: "/**" },
      { protocol: "https", hostname: "**.media-amazon.com", pathname: "/**" },
      { protocol: "https", hostname: "**.zappos.com", pathname: "/**" },
      { protocol: "https", hostname: "**.6pm.com", pathname: "/**" },
    ],
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
