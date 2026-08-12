/**
 * Authenticated application layout (marketing split).
 *
 * Wraps every console route in the design-system chrome and opts the whole group
 * out of search indexing. The public brand site lives in the sibling
 * `(marketing)` group and is indexed.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppChrome } from "./app-chrome";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppChrome>{children}</AppChrome>;
}
