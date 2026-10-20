import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Cache Components (PPR) is overkill for this app: every page reflects
   * live DB state (guides can be generated at any time), so there's no
   * static-shell benefit worth the added complexity. Use the simpler,
   * previous caching model instead -- see README "Key decisions". */
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
