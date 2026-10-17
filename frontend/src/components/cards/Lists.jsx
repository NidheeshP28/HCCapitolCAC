import { usePlanner } from "../../state/PlannerContext.jsx";
import { fmt, fmt1, KIND, miles, peopleLabel, siteName } from "../../lib/format.js";
import Card from "../ui/Card.jsx";

export function CentersCard() {
  const { plan, hoverCenter, setHoverCenter, setFocusReq } = usePlanner();
  const rows = plan?.chosen ?? [];
  const maxGain = Math.max(1, ...rows.map((c) => c.gain));
  return (
    <Card id="05" title="Planned centers" aside={rows.length} dock="right" className="c-centers">
      <div className="tbl-h">
        <span>#</span><span>Site</span><span>+New</span><span>Total</span>
      </div>
      <ol className="rows" onMouseLeave={() => setHoverCenter(null)}>
        {rows.map((c) => (
          <li key={c.idx} className={hoverCenter === c.n ? "hot" : ""} style={{ "--w": c.gain / maxGain }}>
            <button
              type="button"
              onMouseEnter={() => setHoverCenter(c.n)}
              onFocus={() => setHoverCenter(c.n)}
              onBlur={() => setHoverCenter(null)}
              onClick={() => setFocusReq({ lat: c.lat, lon: c.lon, key: Date.now() })}
              title="Show on the map"
            >
              <b className="pinno">{c.n}</b>
              <span className="nm">
                <strong>{siteName(c).name}</strong>
                <em>{siteName(c).osm ?? KIND[c.type] ?? c.type}</em>
              </span>
              <span className="gain">+{fmt(c.gain)}</span>
              <span className="cum">{fmt1(c.cum)}%</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="foot">“+New” is how many people each center newly brings within reach, in the order added.</p>
    </Card>
  );
}

export function GapsCard() {
  const { plan, county, R, setPinZip, setFocusReq } = usePlanner();
  if (!plan || !county) return <Card id="06" title="Out of reach" dock="right" className="c-gaps" />;
  const rows = plan.unc
    .map((i) => ({ z: county.zips[i], i }))
    .sort((a, b) => b.z.w - a.z.w);
  const people = rows.reduce((s, r) => s + r.z.w, 0);
  const share = 100 - plan.cov;
  return (
    <Card id="06" title="Out of reach" aside={`${rows.length} ZIP${rows.length === 1 ? "" : "s"}`} dock="right" className="c-gaps">
      {rows.length === 0 ? (
        <p className="empty">Every ZIP is within {R} mi of a planned center at this setting.</p>
      ) : (
        <>
          <p className="sum">
            <b>{fmt(people)}</b> people · <b>{fmt1(share)}%</b> of the county
          </p>
          <div className="tbl-h tbl-h-gaps">
            <span>ZIP</span><span>People</span><span>Nearest</span>
          </div>
          <ul className="rows rows-gaps">
            {rows.map(({ z, i }) => (
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
                  <span className="dd">{miles(plan.nearD[i])} mi</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
