import { useRef } from "react";
import ScrollReveal from "../reactbits/ScrollReveal.jsx";
import Num from "../ui/Num.jsx";
import { usePlanner } from "../../state/PlannerContext.jsx";
import SectionHead from "./SectionHead.jsx";
import { useReveal } from "./useReveal.js";

export default function Why() {
  const ref = useRef(null);
  const { totals } = usePlanner();
  useReveal(ref);
  return (
    <section className="sec why" id="why" ref={ref}>
      <SectionHead n="01" title="Why this exists" />
      <ScrollReveal containerClassName="why-statement" baseOpacity={0.1} baseRotation={0} blurStrength={5} wordAnimationEnd="bottom 70%" rotationEnd="bottom 70%">
        When the power stays out for days, the people in danger first are the ones on home oxygen, dialysis, and powered wheelchairs. Public data already says how many of them live in each ZIP code. What a county lacks is a way to ask: if we can staff only a handful of backup-power centers, where do they go?
      </ScrollReveal>
      <div className="why-cards">
        <article className="card rv">
          <header className="card-h"><span className="card-i">A</span><h3>Winter Storm Uri</h3><span className="card-aside">February 2021</span></header>
          <p>Texas lost power for days in freezing weather. People who depend on electricity-powered medical equipment had very little margin, and few places to go.</p>
        </article>
        <article className="card rv">
          <header className="card-h"><span className="card-i">B</span><h3>Hurricane Beryl</h3><span className="card-aside">July 2024</span></header>
          <p>Outages across the Houston area ran for days in summer heat. Charging an oxygen concentrator or powering a lift depends on a place with working electricity within reach.</p>
        </article>
        <article className="card rv why-data">
          <header className="card-h"><span className="card-i">C</span><h3>What the public data gives us</h3><span className="card-aside">HHS emPOWER</span></header>
          <p>De-identified counts, by ZIP, of Medicare beneficiaries who use electricity-powered medical equipment. Here that is</p>
          <div className="big-n">
            <Num value={totals?.people ?? 0} className="big-num" />
            <span>people in {totals ? totals.counties : "…"} counties</span>
          </div>
        </article>
      </div>
    </section>
  );
}
