import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // standalone only for Docker builds (Dockerfile sets DOCKER_BUILD=1);
  // plain `next start` is the supported local mode
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  /* config options here */
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
