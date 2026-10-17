import { useMemo } from "react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import { KMAX, KMIN, KPRE, niceR, rToT, tToR } from "../../lib/usePlan.js";
import Card from "../ui/Card.jsx";
import Slider from "../ui/Slider.jsx";
import Num from "../ui/Num.jsx";

const K_TICKS = Array.from({ length: KMAX - KMIN + 1 }, (_, i) => {
  const at = KMIN + i;
  return { at, label: at % 5 === 0 || at === KMIN ? String(at) : "" };
});
const R_TICKS = [0.25, 0.5, 1, 2, 3, 5, 7.5, 10, 15, 20, 30, 45, 60].map((r) => ({
  at: rToT(r),
  label: [0.5, 1, 2, 5, 10, 20, 60].includes(r) ? String(r) : "",
}));

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
    <Card id="00" title="County" dock="top" className="c-identity">
      <div className="ident">
        <span className="ident-word" aria-label="GridAid">
          Gr
          <svg viewBox="0 0 12 16" aria-hidden="true"><path d="M7.3 0 1.8 8h3.6L4.7 16l5.5-8H6.6L7.3 0Z" /></svg>
          dAid
        </span>
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
    <Card id="01" title="Centers" aside={`${KMIN}–${KMAX}`} dock="top" className="c-budget">
      <div className="dial">
        <button type="button" className="step" onClick={() => setK(Math.max(KMIN, k - 1))} disabled={k <= KMIN} aria-label="One fewer center">−</button>
        <output className="dial-v" aria-live="polite"><Num value={k} /></output>
        <button type="button" className="step" onClick={() => setK(Math.min(KMAX, k + 1))} disabled={k >= KMAX} aria-label="One more center">+</button>
        <p className="dial-u">backup-power<br />centers</p>
      </div>
      <Slider value={k} min={KMIN} max={KMAX} onChange={setK} ticks={K_TICKS} label="Number of backup-power centers" valueText={`${k} centers`} />
    </Card>
  );
}

export function ReachCard() {
  const { R, county, atDefault, setRadius } = usePlanner();
  return (
    <Card id="02" title="Reach" aside="straight line" dock="top" className="c-reach">
      <div className="dial">
        <output className="dial-v" aria-live="polite"><Num value={R} decimals={R < 10 ? (R < 2 ? 2 : 1) : R % 1 ? 1 : 0} /></output>
        <p className="dial-u dial-u-inline">mi<br /><span>{(R * 1.609).toFixed(R < 10 ? 1 : 0)} km</span></p>
        {!atDefault && county && (
          <button type="button" className="mini" onClick={() => setRadius(null)} title={`Back to ${county.R} mi, this county's default`}>
            Reset {county.R}
          </button>
        )}
      </div>
      <Slider value={rToT(R)} min={0} max={100} step={0.5} onChange={(t) => setRadius(niceR(tToR(t)))} ticks={R_TICKS} label="Reach in miles" valueText={`${R} miles`} />
    </Card>
  );
}

export function PlacementCard() {
  const { mode, setMode, countyHasRobust, hasRobust, robust, plan, k, county } = usePlanner();
  const source = plan?.source;
  return (
    <Card id="03" title="Placement" aside={source === "live" ? "live" : "solved"} dock="top" className="c-placement">
      <div className="seg" role="radiogroup" aria-label="Placement method">
        <button type="button" role="radio" aria-checked={!robust} className={!robust ? "on" : ""} onClick={() => setMode("phased")}>
          Phased
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={robust}
          className={robust ? "on" : ""}
          onClick={() => setMode("robust")}
          disabled={!hasRobust}
          title={countyHasRobust && !hasRobust ? `Robust plans are solved at this county's default reach (${county?.R} mi) and up to ${KPRE} centers.` : undefined}
        >
          Robust&nbsp;{k}
        </button>
      </div>
      <p className="hint">
        {robust
          ? "Best average over a reach 20% shorter or longer."
          : "Centers are added one at a time; earlier ones stay put."}
      </p>
    </Card>
  );
}
