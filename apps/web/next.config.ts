import type { NextConfig } from "next";

/**
 * FixMyFeed web application (Next.js 16 App Router).
 *
 * The design system (`@fixmyfeed/ui`) ships compiled, but is transpiled here so
 * its Tailwind utility classes are picked up and to keep source maps aligned.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@fixmyfeed/ui"],
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
