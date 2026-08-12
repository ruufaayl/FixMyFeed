/**
 * Public marketing layout.
 *
 * The brand site is a single dark-committed visual world, scoped under `.mkt`
 * and isolated from the light Signal Interface console. Indexable (inherits the
 * root metadata; the `(app)` group opts out separately).
 */
import type { ReactNode } from "react";
import "./landing.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="mkt">{children}</div>;
}
