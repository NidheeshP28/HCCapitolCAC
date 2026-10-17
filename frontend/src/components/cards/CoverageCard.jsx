import { usePlanner } from "../../state/PlannerContext.jsx";
import Card from "../ui/Card.jsx";
import Num from "../ui/Num.jsx";

const CELLS = 50;

export default function CoverageCard() {
  const { plan, R, county } = usePlanner();
  const cov = plan?.cov ?? 0;
  const on = Math.round((cov / 100) * CELLS);
  return (
    <Card id="04" title="Coverage on paper" dock="top" className="c-coverage" aria-live="polite">
      <div className="cov">
        <div className="cov-n">
          <Num value={cov} decimals={1} className="cov-num" />
          <small>%</small>
        </div>
        <div className="cov-r">
          <div className="meter" role="img" aria-label={`${cov.toFixed(1)} percent covered`}>
            {Array.from({ length: CELLS }, (_, i) => (
              <i key={i} className={i < on ? "on" : ""} />
            ))}
          </div>
          <p>
            of people on power-dependent medical equipment in {county ? county.name.split(",")[0] : "the county"} live within <b>{R} mi</b> of a planned center.
          </p>
        </div>
      </div>
    </Card>
  );
}
