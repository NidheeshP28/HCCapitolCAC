import { usePlanner } from "../../state/PlannerContext.jsx";
import { fmt, fmt1, KIND, peopleLabel, siteName } from "../../lib/format.js";
import { KPRE } from "../../lib/usePlan.js";
import Card from "../ui/Card.jsx";

function Placement() {
  const { setMode, countyHasRobust, hasRobust, robust, k, county } = usePlanner();
  return (
    <div className="seg seg-s" role="radiogroup" aria-label="Placement method">
      <button type="button" role="radio" aria-checked={!robust} className={!robust ? "on" : ""} onClick={() => setMode("phased")} title="Centers are added one at a time; earlier ones stay put.">
        Phased
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={robust}
        className={robust ? "on" : ""}
        onClick={() => setMode("robust")}
        disabled={!hasRobust}
        title={countyHasRobust && !hasRobust ? `Robust plans are solved at this county's default reach (${county?.R} mi) and up to ${KPRE} centers.` : "Best average coverage if reach is 20% shorter or longer."}
      >
        Robust
      </button>
    </div>
  );
}

export function CentersCard() {
  const { plan, hoverCenter, setHoverCenter, setFocusReq } = usePlanner();
  const rows = plan?.chosen ?? [];
  const maxGain = Math.max(1, ...rows.map((c) => c.gain));
  return (
    <Card title="Planned centers" aside={<Placement />} dock="right" className="c-centers">
      <ol className="rows" onMouseLeave={() => setHoverCenter(null)}>
        {rows.map((c) => (
          <li key={c.idx} className={hoverCenter === c.n ? "hot" : ""} style={{ "--w": c.gain / maxGain }}>
            <button
              type="button"
              onMouseEnter={() => setHoverCenter(c.n)}
              onFocus={() => setHoverCenter(c.n)}
              onBlur={() => setHoverCenter(null)}
              onClick={() => setFocusReq({ lat: c.lat, lon: c.lon, key: Date.now() })}
              title={`Adds ${fmt(c.gain)} people newly within reach (${fmt1(c.cum)}% in total). Click to show on the map.`}
            >
              <b className="pinno">{c.n}</b>
              <span className="nm">
                <strong>{siteName(c).name}</strong>
                <em>{siteName(c).osm ?? KIND[c.type] ?? c.type}</em>
              </span>
              <span className="gain">+{fmt(c.gain)}</span>
            </button>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function GapsCard() {
  const { plan, county, R, setPinZip, setFocusReq } = usePlanner();
  if (!plan || !county) return <Card title="Out of reach" dock="right" className="c-gaps" />;
  const rows = plan.unc
    .map((i) => ({ z: county.zips[i], i }))
    .sort((a, b) => b.z.w - a.z.w);
  const people = rows.reduce((s, r) => s + r.z.w, 0);
  return (
    <Card title="Out of reach" aside={`${fmt(people)} people · ${fmt1(100 - plan.cov)}%`} dock="right" className="c-gaps">
      {rows.length === 0 ? (
        <p className="empty">Every ZIP is within {R} mi of a planned center at this setting.</p>
      ) : (
        <ul className="rows rows-gaps">
          {rows.map(({ z }) => (
            <li key={z.z}>
              <button
                type="button"
                onClick={() => {
                  setPinZip(z.z);
                  setFocusReq({ lat: z.lat, lon: z.lon, key: Date.now() });
                }}
                title="Show on the map"
              >
                <span className="zp">{z.z}</span>
                <span className="pp">{peopleLabel(z)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
