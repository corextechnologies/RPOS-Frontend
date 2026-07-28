import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Menu photos, logos, and staff/employee avatars are served from Cloudflare
    // R2. Every image today renders via a plain <img>, so this is only needed
    // if/when a surface adopts next/image — declared up front so it just works.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-c7b5ada0d0c24c2791d4fffe0f9483e6.r2.dev",
      },
    ],
  },
};

export default nextConfig;
