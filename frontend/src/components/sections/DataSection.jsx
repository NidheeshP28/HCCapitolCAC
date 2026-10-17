import { useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import SectionHead from "./SectionHead.jsx";
import { useReveal } from "./useReveal.js";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SOURCES = [
  ["HHS emPOWER", "People on electricity-powered medical equipment, by ZIP, de-identified, small counts suppressed.", "https://empowermap.hhs.gov/"],
  ["US Census ZCTA", "ZIP Code Tabulation Area boundaries (2020 cartographic file) for the map polygons.", "https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html"],
  ["OpenStreetMap", "Libraries, schools, community centers, and fire stations as candidate sites.", "https://www.openstreetmap.org/copyright"],
  ["Esri, Leaflet", "The quiet street basemap and the map library. Everything else works without them.", "https://leafletjs.com/"],
];
const PIPE = [
  ["fetch_empower.py", "emPOWER counts by ZIP"],
  ["fetch_sites.py", "candidate sites"],
  ["make_zcta.py", "split by county"],
  ["build.py", "greedy plus exact solve"],
  ["make_zip_shapes.py", "ZIP polygons"],
];

export default function DataSection() {
  const ref = useRef(null);
  const { totals } = usePlanner();
  useReveal(ref);

  const hist = useMemo(() => {
    if (!totals?.ratios.length) return null;
    const r = totals.ratios;
    const bins = Array.from({ length: 21 }, () => 0);          // 90.0 .. 100.0 in half-points
    r.forEach((v) => (bins[Math.max(0, Math.min(20, Math.floor((v - 90) * 2)))] += 1));
    const med = r[Math.floor(r.length / 2)];
    return { bins, max: Math.max(...bins), n: r.length, min: r[0], med, exact: (100 * r.filter((v) => v >= 99.95).length) / r.length };
  }, [totals]);

  useGSAP(
    () => {
      if (!hist || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = gsap.utils.selector(ref.current);
      gsap.fromTo(q(".hist-bar"), { scaleY: 0 }, { scaleY: 1, transformOrigin: "50% 100%", duration: 0.9, ease: "power3.out", stagger: 0.03, scrollTrigger: { trigger: q(".hist")[0], start: "top 85%", once: true } });
    },
    { scope: ref, dependencies: [hist] }
  );

  return (
    <section className="sec data" id="data" ref={ref}>
      <SectionHead n="04" title="Data and method" />
      <div className="data-grid">
        <article className="card rv data-opt">
          <header className="card-h"><span className="card-i">A</span><h3>Greedy against the proven optimum</h3><span className="card-aside">exact solve</span></header>
          {hist ? (
            <>
              <div className="opt-stats">
                <div><b>{hist.med.toFixed(1)}<small>%</small></b><span>median share of the best possible</span></div>
                <div><b>{hist.min.toFixed(1)}<small>%</small></b><span>worst of {hist.n.toLocaleString()} plans</span></div>
                <div><b>{hist.exact.toFixed(0)}<small>%</small></b><span>of plans exactly optimal</span></div>
              </div>
              <div className="hist" role="img" aria-label={`Share of the proven optimum reached by greedy across ${hist.n} plans, from ${hist.min.toFixed(1)} to 100 percent`}>
                {hist.bins.map((c, i) => (
                  <div className="hist-col" key={i} title={`${(90 + i / 2).toFixed(1)}%: ${c} plans`}>
                    <i className="hist-bar" style={{ height: `${100 * Math.sqrt(c / hist.max)}%` }} />
                  </div>
                ))}
              </div>
              <div className="hist-ax"><span>90%</span><span>95%</span><span>100% of optimum</span></div>
            </>
          ) : <p className="empty">Loading…</p>}
          <p className="foot">Each bar counts county-and-budget plans (3 to 10 centers); bar height is the square root of the count, so the thin tail stays visible. The textbook guarantee for greedy is 63% (1 − 1/e); in practice it lands far above it, and these are solved exactly with integer programming to check.</p>
        </article>

        <article className="card rv">
          <header className="card-h"><span className="card-i">B</span><h3>Two ways to place</h3></header>
          <dl className="two">
            <div><dt>Phased</dt><dd>Greedy. Each new center is the one adding the most people not yet covered, and centers already placed never move. Right when funding arrives in stages.</dd></div>
            <div><dt>Robust</dt><dd>Solved exactly for the best average coverage when reach is 20% shorter, as given, and 20% longer. It gives up a little on paper to hold up when assumptions are wrong. Centers can move as the budget changes.</dd></div>
          </dl>
          <p className="foot">“Expected” coverage also jitters each ZIP’s point by about a third of the distance to its nearest neighbor and averages 200 draws.</p>
        </article>

        <article className="card rv">
          <header className="card-h"><span className="card-i">C</span><h3>Sources</h3></header>
          <ul className="src">
            {SOURCES.map(([n, d, h]) => (
              <li key={n}><a href={h} target="_blank" rel="noreferrer">{n} ↗</a><span>{d}</span></li>
            ))}
          </ul>
        </article>

        <article className="card rv">
          <header className="card-h"><span className="card-i">D</span><h3>Rebuild it</h3><span className="card-aside">scripts/</span></header>
          <ol className="pipe">
            {PIPE.map(([f, d], i) => (
              <li key={f}><b>{i + 1}</b><code>{f}</code><span>{d}</span></li>
            ))}
          </ol>
          <p className="foot">Everything is precomputed into one JSON file plus one small boundary file per county. The page needs no account and stores nothing about you.</p>
        </article>
      </div>
    </section>
  );
}
