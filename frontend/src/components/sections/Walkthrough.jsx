import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import { useMotionMode } from "../../lib/hooks.js";
import { boundsOf } from "../../lib/zips.js";
import { fmt, fmt1, KIND, siteName } from "../../lib/format.js";
import Num from "../ui/Num.jsx";
import SectionHead from "./SectionHead.jsx";
import { useReveal } from "./useReveal.js";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const VW = 1000, VH = 620, PAD = 26, STEPS = 5;

// Replays the greedy rule on the county currently open in the planner: no centers, then one at a time.
function useGeometry() {
  const { county, shapes, curve, D, R, scale } = usePlanner();
  return useMemo(() => {
    if (!county || !shapes || !curve || !D || !scale) return null;
    const n = Math.min(STEPS, curve.sel.length);
    const [[s, w], [nn, e]] = boundsOf(shapes, county.zips);
    const kx = Math.cos((((s + nn) / 2) * Math.PI) / 180);
    const spanX = (e - w) * kx, spanY = nn - s;
    const sc = Math.min((VW - 2 * PAD) / spanX, (VH - 2 * PAD) / spanY);
    const ox = (VW - spanX * sc) / 2, oy = (VH - spanY * sc) / 2;
    const px = (lon) => ox + (lon - w) * kx * sc;
    const py = (lat) => oy + (nn - lat) * sc;
    const ring = (r) => r.map(([la, lo], i) => `${i ? "L" : "M"}${px(lo).toFixed(1)} ${py(la).toFixed(1)}`).join("") + "Z";
    const Z = county.zips.length;
    const picks = curve.sel.slice(0, n).map((si, i) => ({
      idx: si, n: i + 1, x: px(county.sites[si].lon), y: py(county.sites[si].lat),
      name: county.sites[si].name, type: county.sites[si].type, gain: curve.gains[i], cum: curve.cum[i],
    }));
    const zips = county.zips.map((z, i) => {
      const ent = shapes.zips[z.z];
      let first = -1;
      for (let t = 0; t < n; t++) if (D[curve.sel[t] * Z + i] <= R) { first = t; break; }
      return {
        z: z.z, first, fill: scale.colors[scale.classes[i]],
        d: ent ? ent.p.map((poly) => poly.map(ring).join("")).join("") : null,
        pt: ent ? null : [px(z.lon), py(z.lat)],
      };
    });
    return { picks, zips, rpx: (R * sc) / 69.172, n };
  }, [county, shapes, curve, D, R, scale]);
}

const HEAD = [
  ["Start with nothing.", "Every ZIP is a gap. The shading is how many people on power-dependent equipment live there; the hatch is a ZIP no center reaches."],
  ["Take the site that reaches the most people.", "Draw its reach as a circle. Every ZIP whose point falls inside is now covered."],
  ["Then the site that adds the most people not already covered.", "A site that mostly re-covers ZIPs already inside a circle is worth little, however big its neighborhood."],
  ["Keep going, one center at a time.", "Earlier centers never move. That is why the plan can grow when a county finds money for more."],
  ["The gaps shrink, then stop shrinking.", "Each new center adds less than the last. This is where a county decides what is worth staffing."],
  ["Repeat until the budget runs out.", "That is the whole rule. It is not always the best possible plan, but across every county here it comes within a few points of it."],
];

export default function Walkthrough() {
  const ref = useRef(null);
  const g = useGeometry();
  const mode = useMotionMode();
  const { county, R, k } = usePlanner();
  const [step, setStep] = useState(0);
  useReveal(ref);

  useGSAP(
    () => {
      if (!g || !g.n) return;
      const root = ref.current;
      const q = gsap.utils.selector(root);
      const N = g.n;
      const T = N + 0.7;
      const pinned = mode === "pin";
      const tl = gsap.timeline({
        paused: !pinned,
        defaults: { ease: "power2.out" },
        ...(pinned && {
          scrollTrigger: {
            trigger: q(".wt-stage")[0],
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * (N * 0.5 + 0.55))}`,
            scrub: 0.6,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const t = self.progress * T;
              setStep(Math.max(0, Math.min(N, Math.floor(t - 0.35) + 1)));
            },
          },
        }),
      });
      tl.set(q(".wt-base"), { opacity: 0 }, 0).set(q(".wt-gap"), { opacity: 1 }, 0);
      for (let s = 0; s < N; s++) {
        const o = `${g.picks[s].x} ${g.picks[s].y}`;
        tl.fromTo(q(`.wt-ring[data-step="${s}"]`), { scale: 0, opacity: 0, svgOrigin: o }, { scale: 1, opacity: 1, svgOrigin: o, duration: 0.75 }, s)
          .fromTo(q(`.wt-pin[data-step="${s}"]`), { scale: 0, opacity: 0, svgOrigin: o }, { scale: 1, opacity: 1, svgOrigin: o, duration: 0.5, ease: "back.out(2.2)" }, s + 0.3)
          .to(q(`g[data-first="${s}"] .wt-base`), { opacity: 1, duration: 0.5, stagger: { each: 0.015, from: "random" } }, s + 0.5)
          .to(q(`g[data-first="${s}"] .wt-gap`), { opacity: 0, duration: 0.5, stagger: { each: 0.015, from: "random" } }, s + 0.5);
      }
      tl.to({}, { duration: T - N }, N);
      if (!pinned) {
        tl.progress(1);
        setStep(N);
      } else setStep(0);
    },
    { scope: ref, dependencies: [g, mode], revertOnUpdate: true }
  );

  const N = g?.n ?? 0;
  const cur = step > 0 ? g.picks[step - 1] : null;
  const head = HEAD[Math.min(step, HEAD.length - 1)];

  return (
    <section className="sec how" id="how" ref={ref}>
      <SectionHead n="02" title="How a plan is made" kicker={county ? `Replaying ${county.name} at ${R} mi, the plan open above.` : undefined} />
      <div className="wt-stage">
        <div className="wt-text card">
          <header className="card-h"><h3>Step {step} of {N || "–"}</h3></header>
          <h3 className="wt-h" key={step}>{head[0]}</h3>
          <p className="wt-p" key={`p${step}`}>{head[1]}</p>
          <div className="wt-cov">
            <Num value={cur ? cur.cum : 0} decimals={1} className="wt-num" /><small>%</small>
            <span>of people within reach</span>
          </div>
          <ol className="wt-list">
            {(g?.picks ?? []).map((p) => (
              <li key={p.idx} className={p.n < step ? "done" : p.n === step ? "now" : ""}>
                <b className="pinno">{p.n}</b>
                <span className="nm"><strong>{siteName(p).name}</strong><em>{siteName(p).osm ?? KIND[p.type] ?? p.type}</em></span>
                <span className="gain">+{fmt(p.gain)}</span>
              </li>
            ))}
          </ol>
          {k > N && <p className="foot">Your plan has {k} centers; this replay shows the first {N}.</p>}
        </div>

        <figure className="wt-fig card">
          {g ? (
            <svg viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label="ZIP areas shaded by people on power-dependent equipment, with centers added one at a time" preserveAspectRatio="xMidYMid meet">
              <g>
                {g.zips.map((z) =>
                  z.d ? (
                    <g key={z.z} data-first={z.first}>
                      <path d={z.d} className="wt-out" fillRule="evenodd" />
                      <path d={z.d} className="wt-base" fillRule="evenodd" style={{ fill: z.fill }} />
                      <path d={z.d} className="wt-gap" fillRule="evenodd" fill="url(#ga-hatch)" />
                    </g>
                  ) : (
                    <g key={z.z} data-first={z.first}>
                      <circle cx={z.pt[0]} cy={z.pt[1]} r="5" className="wt-out" />
                      <circle cx={z.pt[0]} cy={z.pt[1]} r="5" className="wt-base" style={{ fill: z.fill }} />
                      <circle cx={z.pt[0]} cy={z.pt[1]} r="5" className="wt-gap" fill="url(#ga-hatch)" />
                    </g>
                  )
                )}
              </g>
              {g.picks.map((p, s) => (
                <circle key={`r${p.idx}`} className="wt-ring" data-step={s} cx={p.x} cy={p.y} r={g.rpx} />
              ))}
              {g.picks.map((p, s) => (
                <g key={`p${p.idx}`} className="wt-pin" data-step={s}>
                  <rect x={p.x - 13} y={p.y - 13} width="26" height="26" />
                  <text x={p.x} y={p.y + 4.5} textAnchor="middle">{p.n}</text>
                </g>
              ))}
            </svg>
          ) : (
            <p className="empty">Loading the county…</p>
          )}
          <figcaption>
            <span>Reach drawn to scale, {R} mi</span>
            <span>{cur ? `Center ${cur.n}: +${fmt(cur.gain)} people, ${fmt1(cur.cum)}% total` : "No centers yet"}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
