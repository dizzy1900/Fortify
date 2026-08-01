import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["better-sqlite3", "pg"],
  devIndicators: false,
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/storage/**",
        "**/output/**",
        "**/artifacts/**",
      ],
    };
    return config;
  },
};

export default nextConfig;
