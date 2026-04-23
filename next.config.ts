import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingExcludes: {
    "/*": ["./.tmp/**/*", "./data/runtime/tmp/**/*"]
  }
};

export default nextConfig;
