import { useEffect, useState } from "react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import { KMAX, KMIN } from "../../lib/usePlan.js";
import logistics from "../../data/logistics.json";
import Card from "../ui/Card.jsx";

const money = (v) => v.toLocaleString("en-US", { style: "currency", currency: "USD", notation: v >= 1e5 ? "compact" : "standard", maximumFractionDigits: v >= 1e5 ? 2 : 0 });
const WIRED = Object.values(logistics.counties).map((c) => c.name.split(" County")[0]).join(", ");

// Budget numbers come from GridAid_County_Logistics.xlsx (cost per site from a 2019 NC generator program,
// FEMA share 75%). Only the counties in that table are wired in for now.
export default function BudgetCard() {
  const { fips, k, setK, county } = usePlanner();
  const L = logistics.counties[fips], A = logistics.assumptions;
  const [cost, setCost] = useState(A.costPerSite);
  const [fema, setFema] = useState(A.fema);
  const [cap, setCap] = useState(null);
  useEffect(() => setCap(null), [fips]);

  if (!L)
    return (
      <Card title="Budget" dock="bottom" className="c-budget-plan">
        <p className="hint">No logistics table for {county ? county.name : "this county"} yet. Budgets are wired in for {WIRED}.</p>
      </Card>
    );

  const capV = cap ?? L.budget[0], fits = Math.floor(capV / cost), use = Math.max(KMIN, Math.min(KMAX, fits));
  const total = k * cost, local = total * (1 - fema), kw = k * A.kwPerSite;
  return (
    <Card title="Budget" aside={`${L.type} · table plan ${L.sites[0]}–${L.sites[1]} sites`} dock="bottom" className="c-budget-plan">
      <div className="bud">
        <div className="bud-in">
          <label className="bud-cap">
            <span className="sr">Budget</span>
            <input type="range" min={0} max={Math.round(L.budget[1] * 1.25)} step={1000} value={capV} onChange={(e) => setCap(Number(e.target.value))} style={{ "--p": capV / Math.round(L.budget[1] * 1.25) }} />
          </label>
          <p className="bud-line">
            <b className="bud-big">{money(capV)}</b> pays for <b>{fits}</b> center{fits === 1 ? "" : "s"}
            <button type="button" className="mini" onClick={() => setK(use)} disabled={use === k}>Use {use}</button>
          </p>
          <p className="bud-set">
            at <label>$<input type="number" min={1000} step={1000} value={cost} onChange={(e) => setCost(Math.max(1000, Number(e.target.value) || A.costPerSite))} aria-label="Cost per center" /></label> each,
            {" "}FEMA pays <label><select value={fema} onChange={(e) => setFema(Number(e.target.value))} aria-label="FEMA share">{[0, 0.5, 0.75, 0.9].map((f) => <option key={f} value={f}>{f * 100}%</option>)}</select></label>
          </p>
        </div>
        <dl className="bud-out">
          <div><dt>{k} centers</dt><dd>{money(total)}</dd></div>
          <div><dt>Local share</dt><dd>{money(local)}</dd></div>
          <div title={`${L.kw[0].toLocaleString()}–${L.kw[1].toLocaleString()} kW needed for about ${L.expected.toLocaleString()} expected visitors (table)`}><dt>Power</dt><dd>{kw.toLocaleString()}<small> / {L.kw[0].toLocaleString()} kW</small></dd></div>
        </dl>
      </div>
    </Card>
  );
}
