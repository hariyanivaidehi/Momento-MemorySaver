import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Allow Turbopack hot-reloading and static chunk loading from the local network IP
  allowedDevOrigins: ["192.168.0.114", "192.168.1.111", "localhost", "127.0.0.1"],
} as any;

export default nextConfig;
