import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  devIndicators: false,
  turbopack: { root: __dirname },
  // Explicit allowlist: only non-secret frontend configuration is public.
  env: {
    DEVFIX_ANALYSIS_MODE: process.env.DEVFIX_ANALYSIS_MODE ?? "mock",
    DEVFIX_API_URL: process.env.DEVFIX_API_URL ?? "",
  },
};

export default nextConfig;
