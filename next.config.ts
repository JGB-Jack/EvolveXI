import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the dev server's hot-reload connection to work when the app is
  // opened from another device on the same network (e.g. testing on a
  // phone/tablet via this PC's LAN IP) instead of only localhost.
  allowedDevOrigins: ["192.168.0.88"],
  // The floating "Rendering..." badge is dev-only noise that sits on top of
  // the app's own bottom nav when testing on a phone - turn it off.
  devIndicators: false,
};

export default nextConfig;
