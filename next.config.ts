import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack inside this project when another project has a lockfile nearby.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
