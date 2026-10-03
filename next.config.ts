import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  transpilePackages: ["three"],
};

export default nextConfig;
