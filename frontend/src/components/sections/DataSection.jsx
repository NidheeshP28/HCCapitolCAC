import { useRef } from "react";
import SectionHead from "./SectionHead.jsx";
import JoinForm from "./JoinForm.jsx";
import { useReveal } from "./useReveal.js";
import Apa from "../ui/Apa.jsx";
import { RESEARCH, SOURCE_GROUPS, REFS } from "../../data/references.js";
import { goTo } from "../../lib/route.js";

export default function DataSection() {
  const ref = useRef(null);
  useReveal(ref);
  return (
    <section className="sec data" id="data" ref={ref}>
      <SectionHead
        title="Join Our Mission Towards a Safer and Connected Community"
        action={<button type="button" className="logistics-btn" onClick={() => goTo("logistics")}>See logistics <span aria-hidden="true">→</span></button>}
      />
      <div className="data-grid">
        <JoinForm />

        <div className="data-side">
          <article className="card rv refs">
            <header className="card-h"><h3>Sources</h3></header>
            {SOURCE_GROUPS.map(([group, ids]) => (
              <details key={group} className="refs-g" open={group === "Data"}>
                <summary>{group} <span>{ids.length}</span></summary>
                <ol>
                  {ids.map((id) => (
                    <li key={id}>
                      <Apa id={id} />
                      {REFS[id].use && <p className="refs-use">{REFS[id].use}</p>}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </article>
        </div>
      </div>
    </section>
  );
}
