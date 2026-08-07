import type { NextConfig } from "next";

/**
 * FixMyFeed web application (Next.js 16 App Router).
 *
 * The design system (`@fixmyfeed/ui`) ships compiled, but is transpiled here so
 * its Tailwind utility classes are picked up and to keep source maps aligned.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The design system is a client library — transpiled and bundled.
  transpilePackages: ["@fixmyfeed/ui"],
  // Server-only packages (database/auth/domain services + their native deps) are
  // loaded at runtime, not bundled — they reference migration folders and use
  // node-native drivers that must not go through the bundler.
  serverExternalPackages: [
    "@fixmyfeed/database",
    "@fixmyfeed/auth",
    "@fixmyfeed/config",
    "@fixmyfeed/connectors",
    "@fixmyfeed/diagnostics",
    "@fixmyfeed/repairs",
    "@fixmyfeed/jobs",
    "better-auth",
    "postgres",
    "drizzle-orm",
  ],
  // Authenticated application routes must never be indexed (SEO baseline).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
