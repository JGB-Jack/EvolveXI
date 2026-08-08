import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the dev server's hot-reload connection to work when the app is
  // opened from another device on the same network (e.g. testing on a
  // phone/tablet via this PC's LAN IP) instead of only localhost.
  allowedDevOrigins: ["192.168.0.88"],
};

export default nextConfig;
