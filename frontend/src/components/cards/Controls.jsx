import { useMemo, useState } from "react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import { KMAX, KMIN, TARGET, niceR, niceRUp, rToT, tToR } from "../../lib/usePlan.js";
import { solve } from "../../lib/solver.js";
import Card from "../ui/Card.jsx";
import Logo from "../ui/Logo.jsx";
import Slider from "../ui/Slider.jsx";
import Num from "../ui/Num.jsx";

const K_TICKS = [3, 5, 10, 15, 20, 25].map((at) => ({ at, label: String(at) }));
const R_TICKS = [1, 5, 10, 20, 60].map((r) => ({ at: rToT(r), label: String(r) }));
const clampK = (k) => Math.max(KMIN, Math.min(KMAX, k));

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

// "Optimal" asks the worker for the cheapest answer: fewest centers, or shortest reach, that still reach TARGET%.
function OptimalButton({ run, title }) {
  const [state, setState] = useState(null);
  const go = async () => {
    setState("busy");
    try { setState(await run()); }
    catch { setState("Could not solve"); }
  };
  return (
    <>
      <button type="button" className="opt" onClick={go} disabled={state === "busy"} title={title}>
        {state === "busy" ? "Solving…" : "Optimal"}
      </button>
      {state && state !== "busy" && <p className="opt-note" role="status">{state}</p>}
    </>
  );
}

export function CountCard() {
  const { k, setK, fips, county, R, setMode } = usePlanner();
  const run = async () => {
    const r = await solve(fips, county, "minCenters", { R, target: TARGET });
    if (r.k == null) return `${TARGET}% isn't reachable at ${R} mi`;
    setK(clampK(r.k));
    setMode("optimal");
    return r.k < KMIN ? `${r.k} would do; ${KMIN} is the minimum here` : `Fewest for ${TARGET}% at ${R} mi`;
  };
  return (
    <Card title="Centers" dock="top" className="c-budget">
      <div className="dial">
        <button type="button" className="step" onClick={() => setK(Math.max(KMIN, k - 1))} disabled={k <= KMIN} aria-label="One fewer center">−</button>
        <output className="dial-v" aria-live="polite"><Num value={k} /></output>
        <button type="button" className="step" onClick={() => setK(Math.min(KMAX, k + 1))} disabled={k >= KMAX} aria-label="One more center">+</button>
        <OptimalButton key={`${fips}`} run={run} title={`Fewest centers, so the least money, that put ${TARGET}% of people within reach at the current reach. Uses the exact search where it can.`} />
      </div>
      <Slider value={k} min={KMIN} max={KMAX} onChange={setK} ticks={K_TICKS} label="Number of backup-power centers" valueText={`${k} centers`} />
    </Card>
  );
}

export function ReachCard() {
  const { county, radius, setRadius, k, fips, setMode } = usePlanner();
  const Rnow = county ? radius ?? county.R : 0;
  const run = async () => {
    const r = await solve(fips, county, "minReach", { k, target: TARGET });
    if (r.R == null) return `${TARGET}% isn't reachable with ${k} centers`;
    setRadius(niceRUp(r.R));
    setMode("optimal");
    return `Shortest reach for ${TARGET}% with ${k} centers`;
  };
  return (
    <Card title="Reach" dock="top" className="c-reach">
      <div className="dial">
        <output className="dial-v" aria-live="polite"><Num value={Rnow} decimals={Rnow < 10 ? (Rnow < 2 ? 2 : 1) : Rnow % 1 ? 1 : 0} /></output>
        <span className="dial-u">mi</span>
        {radius != null && county && Math.abs(radius - county.R) > 1e-9 && (
          <button type="button" className="mini" onClick={() => setRadius(null)} title={`Back to ${county.R} mi, this county's default`}>Reset</button>
        )}
        <OptimalButton key={`${fips}`} run={run} title={`Shortest reach at which the current centers put ${TARGET}% of people within reach. Shorter is kinder to people who cannot travel far.`} />
      </div>
      <Slider value={rToT(Rnow)} min={0} max={100} step={0.5} onChange={(t) => setRadius(niceR(tToR(t)))} ticks={R_TICKS} label="Reach in miles" valueText={`${Rnow} miles`} />
    </Card>
  );
}
