import { useState } from "react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import { fmt1, miles, peopleLabel, siteName } from "../../lib/format.js";
import Card from "../ui/Card.jsx";

// Type a ZIP, or hover / click one on the map: the same card answers both. ZIP only, never an address.
export default function ZipCard() {
  const { zipDirectory, fips, setFips, county, plan, zipIndex, setPinZip, pinZip, activeZip, setFocusReq, data, shapes, R } = usePlanner();
  const [q, setQ] = useState("");

  const zip = q.length === 5 ? q : null;
  const home = zip ? zipDirectory.get(zip) : null;

  const go = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 5);
    setQ(digits);
    if (digits.length === 5 && zipDirectory.get(digits) === fips) {
      const z = county.zips[zipIndex.get(digits)];
      setPinZip(digits);
      setFocusReq({ lat: z.lat, lon: z.lon, key: Date.now() });
    }
  };

  const shown = activeZip ?? null;
  const i = shown ? zipIndex.get(shown) : null;
  let body;
  if (zip && !home) {
    body = <p className="res bad">No data for {zip}. This covers {data ? Object.keys(data.counties).length : 0} counties.</p>;
  } else if (zip && home !== fips) {
    body = (
      <p className="res">
        {zip} is in <b>{data.counties[home].name}</b>. <button type="button" className="mini" onClick={() => setFips(home)}>Open</button>
      </p>
    );
  } else if (i != null && plan) {
    const z = county.zips[i];
    const out = plan.uncovered.has(i);
    const c = plan.chosen[plan.nearN[i] - 1];
    const area = shapes?.zips?.[z.z]?.a;
    body = (
      <div className="res">
        <p className="res-h">
          <b className="res-zip">{z.z}</b>
          <span className={`chip ${out ? "out" : "in"}`}>{out ? "Out of reach" : "Within reach"}</span>
          {pinZip === z.z && <button type="button" className="mini" onClick={() => { setPinZip(null); setQ(""); }}>Unpin</button>}
        </p>
        <p>
          {peopleLabel(z)} people{area ? `, ${area.toFixed(area < 10 ? 1 : 0)} sq mi` : ""}. Nearest center: #{c.n} {siteName(c).name}, {miles(plan.nearD[i])} mi
          {out ? ` (${fmt1(plan.nearD[i] - R)} past reach)` : ""}.
        </p>
      </div>
    );
  } else {
    body = <p className="hint">Type a ZIP, or hover one on the map. ZIP only: no addresses, nothing stored.</p>;
  }

  return (
    <Card title="ZIP" dock="bottom" className="c-zip">
      <label className="zipin">
        <span className="sr">ZIP code</span>
        <input inputMode="numeric" autoComplete="off" maxLength={5} placeholder="77002" value={q} onChange={(e) => go(e.target.value)} aria-describedby="zip-res" />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Clear ZIP">×</button>}
      </label>
      <div id="zip-res" aria-live="polite">{body}</div>
    </Card>
  );
}
