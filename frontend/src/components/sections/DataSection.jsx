import { useRef } from "react";
import SectionHead from "./SectionHead.jsx";
import JoinForm from "./JoinForm.jsx";
import { useReveal } from "./useReveal.js";

const SOURCES = [
  ["HHS emPOWER", "How many people rely on powered medical equipment in each ZIP.", "https://empowermap.hhs.gov/"],
  ["US Census ZCTA", "ZIP code boundaries for the map.", "https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html"],
  ["OpenStreetMap", "Libraries, schools, community centers, and fire stations.", "https://www.openstreetmap.org/copyright"],
  ["County plans workbook", "Generator costs, FEMA share, reach, and power needs.", "https://ncdps.gov/news/press-releases/2019/06/18/communities-receive-generators-powering-critical-public"],
];

export default function DataSection() {
  const ref = useRef(null);
  useReveal(ref);
  return (
    <section className="sec data" id="data" ref={ref}>
      <SectionHead
        title="Join Our Mission Towards a Safer and Connected Community"
        action={<button type="button" className="logistics-btn">See logistics <span aria-hidden="true">→</span></button>}
      />
      <div className="data-grid">
        <JoinForm />

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
