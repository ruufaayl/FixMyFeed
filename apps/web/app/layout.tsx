/**
 * Root layout (task T101).
 *
 * Establishes the document shell and wraps every route in the authenticated
 * application chrome. Authenticated routes are excluded from indexing.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppChrome } from "./app-chrome";

export const metadata: Metadata = {
  title: "FixMyFeed",
  description: "Product-feed diagnostics and safe repair.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
