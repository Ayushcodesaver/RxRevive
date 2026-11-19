import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
