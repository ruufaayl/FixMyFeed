"use client";

/**
 * Marketing hero product card (client).
 *
 * A dramatized preview of the real console Overview: a health gauge that scans
 * then draws, count-up statistics, per-channel health bars, and the top critical
 * signal. Motion runs once when the card scrolls into view and is fully disabled
 * under prefers-reduced-motion.
 */
import { useEffect, useRef } from "react";

const CHANNELS = [
  {
    key: "g",
    name: "Google Shopping",
    ic: "linear-gradient(135deg,#fbbc05,#ea4335)",
    label: "G",
    width: 68,
    fill: "linear-gradient(90deg,#fbbf24,#818cf8)",
    issues: 214,
  },
  {
    key: "m",
    name: "Meta Shops",
    ic: "linear-gradient(135deg,#0866ff,#8b5cf6)",
    label: "M",
    width: 81,
    fill: "linear-gradient(90deg,#34d399,#818cf8)",
    issues: 96,
  },
  {
    key: "t",
    name: "TikTok Shop",
    ic: "linear-gradient(135deg,#25f4ee,#fe2c55)",
    label: "T",
    width: 74,
    fill: "linear-gradient(90deg,#fbbf24,#818cf8)",
    issues: 41,
  },
];

export function ProductCard() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = ref.current;
    if (!card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const countUp = (el: HTMLElement) => {
      const to = parseInt(el.dataset.to ?? "0", 10);
      if (reduce) {
        el.textContent = to.toLocaleString();
        return;
      }
      const dur = 1400;
      let t0: number | null = null;
      const step = (ts: number) => {
        if (t0 === null) t0 = ts;
        const p = Math.min((ts - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * e).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      card.querySelectorAll<HTMLElement>("[data-to]").forEach(countUp);
      card.querySelectorAll<HTMLElement>(".fill").forEach((f) => {
        f.style.width = f.dataset.w ?? "0";
      });
      const bar = card.querySelector<HTMLElement>(".bar i");
      if (bar) bar.style.width = bar.dataset.w ?? "0";
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run();
            io.disconnect();
          }
        });
      },
      { threshold: 0.35 },
    );
    io.observe(card);
    return () => io.disconnect();
  }, []);

  return (
    <div className="stage">
      <div className="card" ref={ref}>
        <span className="scan" />
        <div className="c-body">
          <div className="c-head">
            <div className="l">
              <span className="c-title">Catalog health</span>
              <span className="chip">
                <span className="sd" />
                Shopify
              </span>
            </div>
            <span className="c-live">
              <span className="lv" />
              scanning · live
            </span>
          </div>

          <div className="gauge-row">
            <div className="gauge">
              <svg width="130" height="130" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="mkt-gg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#818cf8" />
                    <stop offset="0.55" stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                <circle className="track" cx="60" cy="60" r="52" fill="none" strokeWidth="10" />
                <circle className="scanring" cx="60" cy="60" r="52" fill="none" />
                <circle className="arc" cx="60" cy="60" r="52" fill="none" strokeWidth="10" />
              </svg>
              <div className="ctr">
                <span className="num" data-to="72">
                  0
                </span>
                <span className="cap">HEALTH</span>
              </div>
            </div>
            <div className="g-meta">
              <span className="lbl">Catalog score</span>
              <span className="big">
                12,842 products compared
                <br />
                across 3 sales channels
              </span>
              <span className="delta">▲ 6 pts this week</span>
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="sv" data-to="742">
                0
              </div>
              <div className="sl">Affected</div>
            </div>
            <div className="stat">
              <div className="sv cr" data-to="17">
                0
              </div>
              <div className="sl">Critical</div>
            </div>
            <div className="stat">
              <div className="sv gr" data-to="163">
                0
              </div>
              <div className="sl">Auto-fixable</div>
            </div>
          </div>

          <div className="chan-h">Channel health</div>
          {CHANNELS.map((c) => (
            <div className="chan" key={c.key}>
              <span className="ic" style={{ background: c.ic }}>
                {c.label}
              </span>
              <span className="nm">{c.name}</span>
              <span className="track2">
                <span className="fill" data-w={`${c.width}%`} style={{ background: c.fill }} />
              </span>
              <span className="iss">{c.issues} issues</span>
            </div>
          ))}

          <div className="signal">
            <div className="sig-top">
              <div className="sig-l">
                <span className="sev">Critical</span>
                <span className="sig-t">Missing GTIN — 312 products</span>
              </div>
              <button className="fixbtn" type="button">
                Fix safely
              </button>
            </div>
            <div className="bar">
              <i data-w="38%" />
            </div>
            <div className="sig-meta">
              <span>Blocks Google Shopping listings</span>
              <span className="exp">~$4,200/mo exposure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
