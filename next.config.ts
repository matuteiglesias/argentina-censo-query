import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // B4 is native Node code; never ask the Next webpack compiler to parse .node binaries.
  serverExternalPackages: ["@duckdb/node-api", "@duckdb/node-bindings"],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
