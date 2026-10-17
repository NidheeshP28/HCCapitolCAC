import { useRef } from "react";
import SectionHead from "./SectionHead.jsx";
import { useReveal } from "./useReveal.js";

const LIMITS = [
  ["Distance is optimistic", "“Within reach” means inside a straight-line distance of a center, not a drive. Someone on oxygen or in a powered wheelchair often cannot go far in a storm, so a short reach is the honest setting."],
  ["The counts are partial", "emPOWER counts Medicare enrollees only, and HHS publishes any count from 1 to 10 as 11. The real need is larger than the map, and small ZIPs show as “1–10”."],
  ["ZIPs are points, not addresses", "A ZIP is one representative point. The coverage line shows an expected value and a range for when those points are off. No individual is ever located."],
  ["Sites are not verified", "Candidates are libraries, schools, community centers, and fire stations from public map data. None has been checked for generator capacity, access, or willingness."],
];

export default function Limits() {
  const ref = useRef(null);
  useReveal(ref);
  return (
    <section className="sec limits" id="limits" ref={ref}>
      <SectionHead n="03" title="What this does not tell you" />
      <div className="limits-grid">
        {LIMITS.map(([t, p]) => (
          <article className="card rv" key={t}>
            <header className="card-h"><h3>{t}</h3></header>
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
