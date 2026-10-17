import { useRef } from "react";
import SectionHead from "./SectionHead.jsx";
import JoinForm from "./JoinForm.jsx";
import { useReveal } from "./useReveal.js";

const SOURCES = [
  ["HHS emPOWER", "People on electricity-powered medical equipment, by ZIP, de-identified, small counts suppressed.", "https://empowermap.hhs.gov/"],
  ["US Census ZCTA", "ZIP boundaries (2020 cartographic file) for the map polygons.", "https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html"],
  ["OpenStreetMap", "Libraries, schools, community centers, and fire stations as candidate sites.", "https://www.openstreetmap.org/copyright"],
  ["County logistics table", "Costs, FEMA share, and power needs for ten counties, from public program records.", "https://ncdps.gov/news/press-releases/2019/06/18/communities-receive-generators-powering-critical-public"],
];

export default function DataSection() {
  const ref = useRef(null);
  useReveal(ref);
  return (
    <section className="sec data" id="data" ref={ref}>
      <SectionHead n="04" title="Join us" />
      <div className="data-grid">
        <JoinForm />

        <article className="card rv">
          <header className="card-h"><h3>Three ways to place</h3></header>
          <dl className="two">
            <div><dt>Phased</dt><dd>Greedy. Each new center is the one adding the most people not yet covered, and placed centers never move. Right when money arrives in stages.</dd></div>
            <div><dt>Robust</dt><dd>Best average coverage when reach is 20% shorter, as set, and 20% longer. Gives up a little on paper to hold up when assumptions are wrong.</dd></div>
            <div><dt>Optimal</dt><dd>The best plan an exact search can find at this reach. The Optimal buttons also find the fewest centers, or the shortest reach, for 90% coverage.</dd></div>
          </dl>
        </article>

        <article className="card rv">
          <header className="card-h"><h3>Sources</h3></header>
          <ul className="src">
            {SOURCES.map(([n, d, h]) => (
              <li key={n}><a href={h} target="_blank" rel="noreferrer">{n} ↗</a><span>{d}</span></li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
