import { usePlanner } from "../../state/PlannerContext.jsx";
import Card from "../ui/Card.jsx";
import Num from "../ui/Num.jsx";

const CELLS = 40;

export default function CoverageCard() {
  const { plan, R, county } = usePlanner();
  const cov = plan?.cov ?? 0;
  const on = Math.round((cov / 100) * CELLS);
  return (
    <Card title="Coverage on paper" dock="top" className="c-coverage" aria-live="polite">
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
            {plan && (
              <span className="cov-sub" title="Expected: average coverage if each ZIP's point is a little off. Range: coverage if reach is 20% shorter or longer.">
                {" "}Expected {plan.exp.toFixed(0)}%, range {plan.lo.toFixed(0)}–{plan.hi.toFixed(0)}%.
              </span>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
