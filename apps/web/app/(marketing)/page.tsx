/**
 * FixMyFeed landing page (public).
 *
 * The brand thesis: your product feed is quietly costing you sales, and
 * FixMyFeed finds and repairs it safely. Server-rendered and static; the only
 * client island is the animated hero product card.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "./product-card";

export const metadata: Metadata = {
  title: "FixMyFeed — Fix the product-feed errors costing you sales",
  description:
    "FixMyFeed scans your Shopify catalog across every sales channel, pinpoints exactly what's broken and why, and repairs it safely — only with your approval.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "FixMyFeed — Fix the product-feed errors costing you sales",
    description:
      "Scan your catalog across every channel, see exactly what's broken, and repair it safely with your approval.",
    url: "/",
    siteName: "FixMyFeed",
    type: "website",
  },
};

function Check() {
  return (
    <svg className="ck" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M13 4.5 6.5 11.5 3 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* ---- nav ---- */}
      <header className="nav">
        <div className="wrap nav-in">
          <div className="logo">
            <span className="a">Fix</span>MyFeed
          </div>
          <div className="nav-r">
            <nav className="nav-links">
              <a className="nl" href="#how">
                How it works
              </a>
              <a className="nl" href="#evidence">
                Evidence
              </a>
              <a className="nl" href="#safe">
                Safe repair
              </a>
              <Link className="nl" href="/dashboard">
                Sign in
              </Link>
            </nav>
            <Link className="btn btn-p btn-sm" href="/onboarding">
              Run a free scan
            </Link>
          </div>
        </div>
      </header>

      {/* ---- hero ---- */}
      <section className="hero">
        <div className="aurora" aria-hidden="true">
          <span className="blob b1" />
          <span className="blob b2" />
          <span className="blob b3" />
          <span className="blob b4" />
        </div>
        <div className="grid-ov" aria-hidden="true" />
        <div className="wrap hero-in">
          <div className="hero-copy">
            <span className="badge">
              <span className="pd" />
              Now live for Shopify
            </span>
            <h1>
              Your product feed is <span className="grad">losing you money.</span>
            </h1>
            <p className="sub">
              FixMyFeed scans your catalog across every sales channel, pinpoints exactly what&apos;s
              broken and why, and repairs it safely — only with your approval.
            </p>
            <div className="cta-row">
              <Link className="btn btn-p btn-lg" href="/onboarding">
                Run a free scan →
              </Link>
              <a className="btn btn-glass btn-lg" href="#how">
                See how it works
              </a>
            </div>
            <div className="trust">
              Connect in 60 seconds
              <span className="dt" />
              Read-only until you approve
              <span className="dt" />
              No credit card
            </div>
          </div>
          <ProductCard />
        </div>
      </section>

      {/* ---- problem band ---- */}
      <section className="band">
        <div className="wrap band-in">
          <p className="band-txt">
            Missing GTINs, price mismatches, truncated titles —{" "}
            <b>you never see them, but Google and Meta do.</b> Every silent error means fewer
            impressions, disapproved listings, and sales that quietly never happen.
          </p>
          <div className="band-stats">
            <div className="bs">
              <div className="v">1 in 3</div>
              <div className="l">product listings has a feed error</div>
            </div>
            <div className="bs">
              <div className="v">≈20%</div>
              <div className="l">of catalog impressions lost to bad data</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- how it works ---- */}
      <section id="how" className="wrap sec-pad">
        <span className="eyebrow">How it works</span>
        <h2 className="h2">Live in three steps. No spreadsheets, no guesswork.</h2>
        <p className="lede">
          Connect once and FixMyFeed keeps watching. Every scan runs against your live catalog and
          every channel you sell on.
        </p>
        <div className="steps">
          <div className="step">
            <span className="glow" />
            <span className="idx">STEP 01</span>
            <div className="st-ic">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M7 10.5 3.5 14a3 3 0 0 0 4.2 4.2l2-2M13 9.5 16.5 6a3 3 0 0 0-4.2-4.2l-2 2M7.5 12.5l5-5"
                  fill="none"
                  stroke="#c7c9f7"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>Connect your store</h3>
            <p>
              One secure OAuth click with Shopify. FixMyFeed imports your full catalog — read-only,
              nothing touched.
            </p>
          </div>
          <div className="step">
            <span className="glow" />
            <span className="idx">STEP 02</span>
            <div className="st-ic">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="9" cy="9" r="6" fill="none" stroke="#c7c9f7" strokeWidth="1.6" />
                <path
                  d="m13.5 13.5 3.5 3.5"
                  stroke="#c7c9f7"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3>We scan every channel</h3>
            <p>
              Your catalog is checked against Google, Meta and TikTok requirements — and scored for
              health, exposure and impact.
            </p>
          </div>
          <div className="step">
            <span className="glow" />
            <span className="idx">STEP 03</span>
            <div className="st-ic">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M4 10.5 8 14.5 16 5.5"
                  fill="none"
                  stroke="#c7c9f7"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>Approve safe repairs</h3>
            <p>
              Review each fix with its before/after, approve in a click, and FixMyFeed writes it
              back. Reversible, always.
            </p>
          </div>
        </div>
      </section>

      {/* ---- evidence ---- */}
      <section id="evidence" className="wrap">
        <div className="feat">
          <div className="feat-copy">
            <span className="eyebrow">Evidence, not guesses</span>
            <h2 className="h2">See exactly what&apos;s wrong, and why it matters.</h2>
            <p className="lede">
              Every issue shows the real value on each channel, the rule it breaks, and the revenue
              it&apos;s costing — so you fix what actually moves the needle first.
            </p>
            <ul>
              <li>
                <Check /> Per-channel comparison of the value we observed vs. what&apos;s required.
              </li>
              <li>
                <Check /> Impact and exposure scoring, so the worst issues rise to the top.
              </li>
              <li>
                <Check /> Plain-English reasons — no cryptic feed-spec error codes.
              </li>
            </ul>
          </div>
          <div className="feat-media">
            <div className="m-h">GTIN · SKU AURA-STAINLESS-40</div>
            <div className="ev">
              <span
                className="ch"
                style={{ background: "linear-gradient(135deg,#fbbc05,#ea4335)" }}
              >
                Google
              </span>
              <span className="val">gtin: — (missing)</span>
              <span className="verdict bad">Disapproved</span>
            </div>
            <div className="ev">
              <span
                className="ch"
                style={{ background: "linear-gradient(135deg,#0866ff,#8b5cf6)" }}
              >
                Meta
              </span>
              <span className="val">gtin: — (missing)</span>
              <span className="verdict bad">Limited reach</span>
            </div>
            <div className="ev">
              <span
                className="ch"
                style={{ background: "linear-gradient(135deg,#95bf47,#5e8e3e)" }}
              >
                Source
              </span>
              <span className="val">barcode: 0819427021340</span>
              <span className="verdict ok">Available</span>
            </div>
            <div className="approve">
              <span>Fix maps the source barcode → GTIN on 312 products.</span>
              <span className="exp" style={{ fontFamily: "var(--mono)", color: "#c084fc" }}>
                +$4,200/mo
              </span>
            </div>
          </div>
        </div>

        {/* ---- safe repair ---- */}
        <div id="safe" className="feat rev">
          <div className="feat-copy">
            <span className="eyebrow">Safe by design</span>
            <h2 className="h2">Nothing changes without your say-so.</h2>
            <p className="lede">
              FixMyFeed is read-only until you approve a specific repair. Every write is previewed,
              scoped, and reversible — starting on your dev store, never a surprise on production.
            </p>
            <ul>
              <li>
                <Check /> Preview the exact before → after for every field, per product.
              </li>
              <li>
                <Check /> One-click approve, and a full audit trail of what changed.
              </li>
              <li>
                <Check /> Reversible writes with a safety mode that defaults to your dev store.
              </li>
            </ul>
          </div>
          <div className="feat-media">
            <div className="m-h">Repair preview · title</div>
            <div className="diff">
              <div className="ln del">
                <span className="sign">−</span>
                <span>Stainless Steel Bottle</span>
              </div>
              <div className="ln add">
                <span className="sign">+</span>
                <span>Aura 40oz Insulated Stainless Steel Water Bottle</span>
              </div>
            </div>
            <div className="approve">
              <span>Applies to 128 products · reversible</span>
              <span style={{ color: "#a5b4fc", fontWeight: 700 }}>Approve &amp; write back</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- final CTA ---- */}
      <section className="wrap">
        <div className="cta">
          <h2>
            Find what your feed is <span className="grad">costing you</span> — free.
          </h2>
          <p>
            Connect your Shopify store and get a full catalog health report in minutes. Read-only
            until you approve a single fix.
          </p>
          <div className="cta-row">
            <Link className="btn btn-p btn-lg" href="/onboarding">
              Run a free scan →
            </Link>
            <Link className="btn btn-glass btn-lg" href="/dashboard">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ---- footer ---- */}
      <footer>
        <div className="wrap foot">
          <div className="brand">
            <div className="logo">
              <span className="a">Fix</span>MyFeed
            </div>
            <p>
              Product-feed diagnostics and safe repair for Shopify merchants. Find the errors
              quietly costing you sales — and fix them with confidence.
            </p>
          </div>
          <div className="foot-cols">
            <div className="fcol">
              <h4>Product</h4>
              <a href="#how">How it works</a>
              <a href="#evidence">Evidence</a>
              <a href="#safe">Safe repair</a>
              <Link href="/onboarding">Run a free scan</Link>
            </div>
            <div className="fcol">
              <h4>Company</h4>
              <Link href="/dashboard">Sign in</Link>
              <a href="mailto:hello@fixmyfeed.app">Contact</a>
            </div>
          </div>
        </div>
        <div className="wrap foot-btm">© 2026 FixMyFeed. Works with Shopify.</div>
      </footer>
    </>
  );
}
