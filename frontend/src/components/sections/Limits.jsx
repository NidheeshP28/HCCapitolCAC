import { useRef } from "react";
import SectionHead from "./SectionHead.jsx";
import { useReveal } from "./useReveal.js";

const LIMITS = [
  ["Straight line, not roads", "“Within reach” means inside a fixed straight-line distance of a center. Real travel depends on roads, flooding, and traffic. Treat every radius as optimistic."],
  ["People who cannot go far", "Someone on oxygen or in a powered wheelchair often cannot travel far in a storm. A short reach is the honest setting. A long one only raises coverage on paper."],
  ["Medicare enrollees only", "emPOWER counts Medicare beneficiaries. Younger people and others on electricity-dependent equipment are undercounted, so the real need is larger than the map."],
  ["ZIP points, not addresses", "A ZIP is treated as one representative point. The plan check card estimates how much coverage moves if those points are a little off. No individual is ever located."],
  ["Sites are not verified", "A candidate is a library, school, community center, or fire station from public map data. None has been checked for generator capacity, access, staffing, or willingness."],
  ["Small counts are hidden", "HHS publishes any count from 1 to 10 as 11. Small ZIPs can be over- or understated. The map shows them as “1–10”, never as 11."],
];

export default function Limits() {
  const ref = useRef(null);
  useReveal(ref);
  return (
    <section className="sec limits" id="limits" ref={ref}>
      <SectionHead n="03" title="What this does not tell you" />
      <div className="limits-grid">
        {LIMITS.map(([t, p], i) => (
          <article className="card rv" key={t}>
            <header className="card-h"><span className="card-i">{String(i + 1).padStart(2, "0")}</span><h3>{t}</h3></header>
            <p>{p}</p>
          </article>
        ))}
      </div>
      <p className="limits-line rv">
        GridAid answers <b>“where should a county plan its centers?”</b> It does not tell anyone <b>“you will be safe here.”</b> A planner still has to visit the site.
      </p>
    </section>
  );
}
