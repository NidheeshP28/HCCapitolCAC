import { useState } from "react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import { fmt, fmt1, miles, peopleLabel, siteName } from "../../lib/format.js";
import Card from "../ui/Card.jsx";

export function LookupCard() {
  const { zipDirectory, fips, setFips, county, plan, zipIndex, setPinZip, setFocusReq, data, R } = usePlanner();
  const [q, setQ] = useState("");

  const zip = q.length === 5 ? q : null;
  const home = zip ? zipDirectory.get(zip) : null;
  const i = zip && home === fips ? zipIndex.get(zip) : null;

  const go = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 5);
    setQ(digits);
    if (digits.length === 5 && zipDirectory.get(digits) === fips) {
      const idx = zipIndex.get(digits);
      const z = county.zips[idx];
      setPinZip(digits);
      setFocusReq({ lat: z.lat, lon: z.lon, key: Date.now() });
    }
  };

  let result = <p className="hint">Type a ZIP to see its nearest planned center. Nothing is stored or sent, and there is no address field.</p>;
  if (zip && !home) {
    result = <p className="res bad">No data for {zip}. The dataset covers {zipDirectory.size.toLocaleString()} ZIPs in {data ? Object.keys(data.counties).length : 0} counties.</p>;
  } else if (zip && home !== fips) {
    result = (
      <p className="res">
        {zip} is in <b>{data.counties[home].name}</b>.{" "}
        <button type="button" className="mini" onClick={() => setFips(home)}>Open that county</button>
      </p>
    );
  } else if (i != null && plan) {
    const z = county.zips[i];
    const out = plan.uncovered.has(i);
    const c = plan.chosen[plan.nearN[i] - 1];
    result = (
      <div className={`res ${out ? "out" : "in"}`}>
        <p><b>{out ? "Out of reach" : "Within reach"}</b> · {peopleLabel(z)} people</p>
        <p>
          Nearest: <b>#{c.n} {siteName(c).name}</b>, {miles(plan.nearD[i])} mi straight line
          {out ? ` (${fmt1(plan.nearD[i] - R)} past reach)` : ""}
        </p>
      </div>
    );
  }

  return (
    <Card id="09" title="ZIP lookup" aside="ZIP only" dock="bottom" className="c-lookup">
      <label className="zipin">
        <span className="sr">ZIP code</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          placeholder="77002"
          value={q}
          onChange={(e) => go(e.target.value)}
          aria-describedby="zip-res"
        />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Clear ZIP">×</button>}
      </label>
      <div id="zip-res" aria-live="polite">{result}</div>
    </Card>
  );
}

export function InspectorCard() {
  const { activeZip, pinZip, setPinZip, county, plan, zipIndex, shapes } = usePlanner();
  const i = activeZip ? zipIndex.get(activeZip) : null;

  if (!county || !plan) return <Card id="10" title="Inspector" dock="bottom" className="c-inspect" />;

  if (i == null) {
    const biggest = county.zips.reduce((a, b) => (b.w > a.w ? b : a), county.zips[0]);
    return (
      <Card id="10" title="Inspector" aside="hover a ZIP" dock="bottom" className="c-inspect">
        <dl className="kv">
          <div><dt>ZIPs</dt><dd>{county.zips.length}</dd></div>
          <div><dt>People</dt><dd>{fmt(county.total)}</dd></div>
          <div><dt>Sites</dt><dd>{fmt(county.sites.length)}</dd></div>
          <div><dt>Top ZIP</dt><dd>{biggest.z}</dd></div>
        </dl>
        <p className="hint">Hover a ZIP on the map to see its numbers, or click to pin it.</p>
      </Card>
    );
  }
  const z = county.zips[i];
  const out = plan.uncovered.has(i);
  const area = shapes?.zips?.[z.z]?.a;
  const c = plan.chosen[plan.nearN[i] - 1];
  return (
    <Card id="10" title="Inspector" aside={pinZip === z.z ? "pinned" : "hover"} dock="bottom" className="c-inspect">
      <div className="insp-h">
        <b className="insp-zip">{z.z}</b>
        <span className={`chip ${out ? "out" : "in"}`}>{out ? "Out of reach" : "Within reach"}</span>
        {pinZip === z.z && <button type="button" className="mini" onClick={() => setPinZip(null)}>Unpin</button>}
      </div>
      <dl className="kv">
        <div><dt>People</dt><dd>{peopleLabel(z)}{z.masked ? <small> suppressed</small> : null}</dd></div>
        <div><dt>Share</dt><dd>{((100 * z.w) / county.total).toFixed(1)}%</dd></div>
        <div><dt>Area</dt><dd>{area ? `${area.toFixed(area < 10 ? 1 : 0)} sq mi` : "no polygon"}</dd></div>
        <div><dt>Density</dt><dd>{area ? `${(z.w / area).toFixed(1)} /sq mi` : "n/a"}</dd></div>
        <div className="wide"><dt>Nearest</dt><dd>#{c.n} {siteName(c).name} · {miles(plan.nearD[i])} mi</dd></div>
      </dl>
    </Card>
  );
}
