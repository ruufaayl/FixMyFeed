/**
 * Root document shell (task T101 / marketing split).
 *
 * Provides the html/body shell, the app-wide identity font (Plus Jakarta Sans,
 * self-hosted via next/font), and the global stylesheet. Route groups nest their
 * own layouts: `(marketing)` is the public, indexable brand site; `(app)` wraps
 * the authenticated console chrome and opts out of indexing.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fixmyfeed.vercel.app"),
  title: {
    default: "FixMyFeed — Fix the product-feed errors costing you sales",
    template: "%s · FixMyFeed",
  },
  description:
    "FixMyFeed scans your Shopify catalog across every sales channel, pinpoints exactly what's broken and why, and repairs it safely — only with your approval.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
