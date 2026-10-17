import { usePlanner } from "../../state/PlannerContext.jsx";
import { fmt, fmt1, KIND, peopleLabel, siteName } from "../../lib/format.js";
import { MODES } from "../../lib/usePlan.js";
import Card from "../ui/Card.jsx";

const MODE_HELP = {
  phased: "Centers are added one at a time; earlier ones stay put as the budget grows.",
  robust: "Best average coverage if the real reach is 20% shorter or longer than set.",
  optimal: "The best plan the exact search can find at this reach. Centers can move when the budget changes.",
};

function Placement() {
  const { mode, setMode, plan } = usePlanner();
  return (
    <div className={`seg seg-s${plan?.pending ? " is-busy" : ""}`} role="radiogroup" aria-label="Placement method" aria-busy={!!plan?.pending}>
      {Object.entries(MODES).map(([id, label]) => (
        <button key={id} type="button" role="radio" aria-checked={mode === id} className={mode === id ? "on" : ""} onClick={() => setMode(id)} title={MODE_HELP[id]}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function CentersCard() {
  const { plan, hoverCenter, setHoverCenter, setFocusReq } = usePlanner();
  const rows = plan?.chosen ?? [];
  const maxGain = Math.max(1, ...rows.map((c) => c.gain));
  return (
    <Card title="Placement" aside={<Placement />} dock="right" className="c-centers">
      {plan?.source === "optimal" && <p className="proof">{plan.exact ? "Proven best possible at this reach." : "Best found; not proven optimal in the time allowed."}</p>}
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
