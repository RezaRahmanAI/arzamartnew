import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "localhost" },
      { protocol: "https", hostname: "api.arzamart.com" },
      { protocol: "https", hostname: "arzamart.com" },
      { protocol: "http", hostname: "api.arzamart.com" },
      { protocol: "http", hostname: "arzamart.com" },
      { protocol: "https", hostname: "testapi.arzamart.com" },
      { protocol: "https", hostname: "test.arzamart.com" },
      { protocol: "http", hostname: "testapi.arzamart.com" },
      { protocol: "http", hostname: "test.arzamart.com" },
    ],
  },
};

export default nextConfig;
