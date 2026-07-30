import type { NextConfig } from "next";

// The Electron till bundles the UI so it loads with no internet. That build sets
// BUILD_TARGET=electron to produce a static export; the default (Vercel) build
// is completely unaffected.
const isElectron = process.env.BUILD_TARGET === "electron";

const nextConfig: NextConfig = {
  ...(isElectron ? { output: "export" as const } : {}),
  images: {
    // Static export can't run the image optimizer; harmless otherwise since
    // every surface uses a plain <img> today.
    unoptimized: isElectron,
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
