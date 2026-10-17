import { useMemo } from "react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import { KMAX, KMIN, niceR, rToT, tToR } from "../../lib/usePlan.js";
import Card from "../ui/Card.jsx";
import Logo from "../ui/Logo.jsx";
import Slider from "../ui/Slider.jsx";
import Num from "../ui/Num.jsx";

const K_TICKS = [3, 5, 10, 15, 20, 25].map((at) => ({ at, label: String(at) }));
const R_TICKS = [1, 5, 10, 20, 60].map((r) => ({ at: rToT(r), label: String(r) }));

export function IdentityCard() {
  const { data, fips, setFips } = usePlanner();
  const groups = useMemo(() => {
    if (!data) return [];
    const by = new Map();
    for (const [id, c] of Object.entries(data.counties)) {
      const st = c.name.includes(", ") ? c.name.split(", ").pop() : "DC";
      if (!by.has(st)) by.set(st, []);
      by.get(st).push([id, c.name]);
    }
    return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([st, items]) => [st, items.sort((a, b) => a[1].localeCompare(b[1]))]);
  }, [data]);

  return (
    <Card dock="top" className="c-identity">
      <div className="ident">
        <Logo className="ident-logo" />
        <label className="select">
          <span className="sr">County</span>
          <select value={fips ?? ""} onChange={(e) => setFips(e.target.value)} disabled={!data}>
            {groups.map(([st, items]) => (
              <optgroup key={st} label={st}>
                {items.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
    </Card>
  );
}

export function BudgetCard() {
  const { k, setK } = usePlanner();
  return (
    <Card title="Centers" dock="top" className="c-budget">
      <div className="dial">
        <button type="button" className="step" onClick={() => setK(Math.max(KMIN, k - 1))} disabled={k <= KMIN} aria-label="One fewer center">−</button>
        <output className="dial-v" aria-live="polite"><Num value={k} /></output>
        <button type="button" className="step" onClick={() => setK(Math.min(KMAX, k + 1))} disabled={k >= KMAX} aria-label="One more center">+</button>
      </div>
      <Slider value={k} min={KMIN} max={KMAX} onChange={setK} ticks={K_TICKS} label="Number of backup-power centers" valueText={`${k} centers`} />
    </Card>
  );
}

export function ReachCard() {
  const { R, county, atDefault, setRadius } = usePlanner();
  return (
    <Card title="Reach" dock="top" className="c-reach">
      <div className="dial">
        <output className="dial-v" aria-live="polite"><Num value={R} decimals={R < 10 ? (R < 2 ? 2 : 1) : R % 1 ? 1 : 0} /></output>
        <span className="dial-u">mi</span>
        {!atDefault && county && (
          <button type="button" className="mini" onClick={() => setRadius(null)} title={`Back to ${county.R} mi, this county's default`}>
            Reset
          </button>
        )}
      </div>
      <Slider value={rToT(R)} min={0} max={100} step={0.5} onChange={(t) => setRadius(niceR(tToR(t)))} ticks={R_TICKS} label="Reach in miles" valueText={`${R} miles`} />
    </Card>
  );
}
