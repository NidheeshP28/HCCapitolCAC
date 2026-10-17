import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { TARGETS, KLIVE, buildDistances, evaluatePlan, getCurve, minCenters, minReach } from "./lib/plan.js";
import coverageMethodIllustration from "./assets/coverage-method.svg";

const KMIN = 3;
const KMAX = 25;          // budget slider; plans for more than KPRE centers are computed live in the browser
const KPRE = 10;          // largest budget with a precomputed plan (and the robust plan)
const RMIN = 0.25, RMAX = 60;          // reach slider, in miles, on a log scale (small counties need fine steps)
const rToT = (r) => Math.max(0, Math.min(100, (100 * Math.log(r / RMIN)) / Math.log(RMAX / RMIN)));
const tToR = (t) => RMIN * Math.pow(RMAX / RMIN, t / 100);
const niceR = (r) => (r < 2 ? Math.round(r * 20) / 20 : r < 10 ? Math.round(r * 10) / 10 : Math.round(r * 2) / 2);
const upR = (r) => (r < 2 ? Math.ceil(r * 20) / 20 : r < 10 ? Math.ceil(r * 10) / 10 : Math.ceil(r * 2) / 2);
const MILE_M = 1609.34;
const TYPE_LABEL = {
  fire_station: "Fire station",
  library: "Library",
  community_centre: "Community center",
  school: "School",
};
const COLORS = { covered: "#25745d", uncovered: "#b84b43", center: "#274a63" };

const fmt = (n) => Math.round(n).toLocaleString("en-US");
const pin = (n) =>
  L.divIcon({ className: "pin", html: `<span>${n}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [32, 32] });
  }, [bounds, map]);
  return null;
}

function PlannerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [fips, setFips] = useState(null);
  const [k, setK] = useState(5);
  const [showAll, setShowAll] = useState(false);
  const [mode, setMode] = useState("phased");
  const [radius, setRadius] = useState(null);      // null = this county's default reach
  const [target, setTarget] = useState(90);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => {
        if (!r.ok) throw new Error(`The data service returned ${r.status}.`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        const ids = Object.keys(d.counties || {});
        setFips(ids.includes("48201") ? "48201" : ids[0] ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  const county = data && fips ? data.counties[fips] : null;
  useEffect(() => setRadius(null), [fips]);               // a new county starts at its own default reach

  const R = county ? radius ?? county.R : 0;
  const atDefault = !county || radius == null || Math.abs(radius - county.R) < 1e-9;
  const pre = county && atDefault && k <= KPRE ? county.k[String(k)] : null;     // precomputed plans (incl. robust)
  const live = !!county && !pre;                                                  // anything else is computed in the browser

  const view = useMemo(() => {
    if (!county) return null;
    return L.latLngBounds(county.zips.map((z) => [z.lat, z.lon]));
  }, [county]);
  const D = useMemo(() => (county ? buildDistances(county) : null), [county]);
  const livePlan = useMemo(() => {
    if (!live || !D) return null;
    const curve = getCurve(county, D, R);
    const sel = curve.sel.slice(0, k);
    return { sel, gains: curve.gains.slice(0, k), ...evaluatePlan(county, D, sel, R, Number(fips) || 0) };
  }, [live, D, county, R, k, fips]);

  // the trade-off panel is computed from deferred values so dragging a slider stays smooth
  const dR = useDeferredValue(R), dk = useDeferredValue(k);
  const panel = useMemo(() => {
    if (!county || !D) return null;
    const curve = getCurve(county, D, dR);
    return { R: dR, k: dk, need: TARGETS.map((t) => ({ t, n: minCenters(curve, t) })), reach: minReach(county, D, dk, target) };
  }, [county, D, dR, dk, target]);

  if (error) return <Message title="Can't load the data" body={error} />;
  if (!data) return <Message title="Loading…" />;
  if (!county)
    return <Message title="No counties built yet" body="Run scripts/build.py after fetching sites, then reload." />;

  const countyHasRobust = Array.isArray(county.k[String(KPRE)]?.rsel);
  const hasRobust = !!pre && Array.isArray(pre.rsel);
  const robust = mode === "robust" && hasRobust;
  let v;
  if (pre && robust)
    v = { sel: pre.rsel, gains: pre.rgains, unc: pre.runc, cov: pre.rcov, red: pre.rred, exp: pre.rexp, lo: pre.rlo, hi: pre.rhi };
  else if (pre)
    v = { sel: pre.sel, gains: county.gains, unc: pre.unc, cov: pre.cov, red: pre.red, exp: pre.exp, lo: pre.lo, hi: pre.hi };
  else v = livePlan;
  const opt = pre ? pre.opt : null, ratio = pre ? pre.ratio : null;
  const { sel, gains: gainsArr, unc: uncList, cov, red, exp, lo, hi } = v;
  const gap = opt != null ? opt - cov : null;
  const chosen = sel.map((si, i) => ({ ...county.sites[si], n: i + 1, gain: gainsArr[i] }));
  const uncovered = new Set(uncList);
  const maxW = Math.max(...county.zips.map((z) => z.w), 1);
  const worst = uncList
    .map((i) => county.zips[i])
    .sort((a, b) => b.w - a.w)
    .slice(0, 3);

  return (
    <div className="app">
      <aside className="rail">
        <header>
          <p className="panel-kicker">Planning inputs</p>
        </header>

        <label className="field">
          <span>County</span>
          <select value={fips} onChange={(e) => setFips(e.target.value)}>
            {Object.entries(data.counties).map(([id, c]) => (
              <option key={id} value={id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>
            Backup-power centers <b className="kval">{k}</b>
          </span>
          <input
            type="range"
            min={KMIN}
            max={KMAX}
            step={1}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            aria-valuetext={`${k} centers`}
          />
        </label>

        <label className="field">
          <span>
            Reach <b className="kval">{R} mi</b>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={rToT(R)}
            onChange={(e) => setRadius(niceR(tToR(Number(e.target.value))))}
            aria-valuetext={`${R} miles`}
          />
          {!atDefault && (
            <button type="button" className="linkbtn" onClick={() => setRadius(null)}>
              Reset to {county.R} mi, this county's default
            </button>
          )}
        </label>

        {countyHasRobust && (
          <fieldset className="seg">
            <legend>Placement</legend>
            <label className={!robust ? "on" : ""}>
              <input type="radio" name="mode" checked={!robust} onChange={() => setMode("phased")} />
              Phased
            </label>
            <label className={robust ? "on" : ""}>
              <input type="radio" name="mode" checked={robust} disabled={!hasRobust} onChange={() => setMode("robust")} />
              Robust for {k}
            </label>
          </fieldset>
        )}
        {countyHasRobust && !hasRobust && (
          <p className="note">The robust plan is solved only at this county's default reach ({county.R} mi) and up to {KPRE} centers.</p>
        )}

        <section className="hero" aria-live="polite">
          <div className="big">
            {cov.toFixed(1)}
            <small>%</small>
          </div>
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${cov}%` }} />
          </div>
          <p>
            of people on power-dependent medical equipment live within <b>{R} mi</b> of a planned center, on paper.
          </p>
          <p className="sub">
            <b>Expected {exp.toFixed(0)}%</b> if ZIP centers are a little off. If the real reach is 20% smaller or larger:{" "}
            <b>{lo.toFixed(0)}–{hi.toFixed(0)}%</b>.
          </p>
          <p className="sub">
            {gap == null
              ? live
                ? "Greedy placement, computed live for this reach and budget."
                : "Placement chosen by a greedy algorithm."
              : gap < 0.05
              ? "Matches the best possible on paper."
              : robust
              ? `Gives up ${gap.toFixed(1)} points on paper (best possible: ${opt.toFixed(1)}%) to hold up better when the data is a little off.`
              : `Reaches ${ratio.toFixed(1)}% of the best possible on paper (${opt.toFixed(1)}%).`}
            {robust && sel.length < k ? ` Full coverage needs only ${sel.length}; more would add nothing.` : ""}
          </p>
          <p className="sub">
            {red < 0.5
              ? "Almost nobody is within reach of two centers, so losing one center leaves its area uncovered."
              : `${red.toFixed(0)}% are within reach of two or more centers, so they stay covered if one is knocked out.`}
          </p>
          {countyHasRobust && hasRobust && (
            <p className="sub">
              {robust
                ? "Chosen to hold up if the data is a little off. Re-solved for each N, so centers can move as you drag the slider."
                : "Centers are added one at a time; earlier ones stay put."}
            </p>
          )}
        </section>

        <section className="trade">
          <h2>Reach vs. budget</h2>
          <p className="note">
            More centers or a longer reach both raise coverage. They trade off against each other, so fix one and solve for the other.
          </p>
          <fieldset className="seg targets">
            <legend>Coverage target</legend>
            {TARGETS.map((t) => (
              <label key={t} className={target === t ? "on" : ""}>
                <input type="radio" name="target" checked={target === t} onChange={() => setTarget(t)} />
                {t}%
              </label>
            ))}
          </fieldset>
          {panel && (
            <>
              <p>
                At <b>{panel.R} mi</b>, reaching <b>{target}%</b> takes{" "}
                {(() => {
                  const n = panel.need.find((x) => x.t === target).n;
                  return n === null ? (
                    <b>more than {KLIVE} centers</b>
                  ) : (
                    <button type="button" className="linkbtn" disabled={n > KMAX} onClick={() => setK(Math.max(KMIN, n))}>
                      {n} center{n === 1 ? "" : "s"}
                    </button>
                  );
                })()}
                .
              </p>
              <p>
                With <b>{panel.k} centers</b>, reaching <b>{target}%</b> takes a reach of{" "}
                {panel.reach === null ? (
                  <b>more than 150 mi</b>
                ) : (
                  <button type="button" className="linkbtn" onClick={() => setRadius(upR(panel.reach))}>
                    {upR(panel.reach)} mi
                  </button>
                )}
                .
              </p>
              <p className="note">
                Centers needed at {panel.R} mi:{" "}
                {panel.need.map((x, i) => (
                  <span key={x.t}>
                    {i > 0 && " · "}
                    {x.t}% needs {x.n === null ? `>${KLIVE}` : x.n}
                  </span>
                ))}
              </p>
              <p className="note">
                Greedy estimates. Reach is the distance people can realistically travel in an outage. Loosening it raises coverage on paper
                without helping anyone, so treat it as a standard to meet, not a dial to hit a number.
              </p>
            </>
          )}
        </section>

        <section>
          <h2>Planned centers</h2>
          <ol className="centers">
            {chosen.map((c) => (
              <li key={c.n}>
                <span className="num">{c.n}</span>
                <span className="who">
                  <b>{c.name}</b>
                  <em>{TYPE_LABEL[c.type] || "Facility"}</em>
                </span>
                <span className="gain">{c.gain > 0 ? `+${fmt(c.gain)}` : "0"}</span>
              </li>
            ))}
          </ol>
          <p className="note">“+” is how many people each center newly brings within reach, in the order it is added.</p>
        </section>

        {worst.length > 0 && (
          <section>
            <h2>Still out of reach</h2>
            <ul className="worst">
              {worst.map((z) => (
                <li key={z.z}>
                  <span>ZIP {z.z}</span>
                  <b>{z.masked ? "<11" : fmt(z.w)}</b>
                </li>
              ))}
            </ul>
          </section>
        )}

        <label className="check">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show all {fmt(county.sites.length)} candidate sites
        </label>

      </aside>

      <div className="mapwrap">
        <MapContainer center={[39, -98]} zoom={5} preferCanvas className="map" scrollWheelZoom>
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            maxZoom={18}
          />
          <FitBounds bounds={view} />

          {showAll &&
            county.sites.map((s, i) => (
              <CircleMarker
                key={`s${i}`}
                center={[s.lat, s.lon]}
                radius={2.5}
                pathOptions={{ color: "#5f6b75", weight: 0, fillOpacity: 0.48 }}
                interactive={false}
              />
            ))}

          {chosen.map((c) => (
            <Circle
              key={`r${fips}-${c.n}`}
              center={[c.lat, c.lon]}
              radius={R * MILE_M}
              pathOptions={{ color: COLORS.center, weight: 1, opacity: 0.35, fillColor: COLORS.center, fillOpacity: 0.05 }}
              interactive={false}
            />
          ))}

          {county.zips.map((z, i) => {
            const out = uncovered.has(i);
            const col = out ? COLORS.uncovered : COLORS.covered;
            return (
              <CircleMarker
                key={`z${fips}-${z.z}`}
                center={[z.lat, z.lon]}
                radius={4 + 14 * Math.sqrt(z.w / maxW)}
                pathOptions={{ color: col, weight: 1.5, fillColor: col, fillOpacity: out ? 0.7 : 0.4 }}
              >
                <Tooltip>
                  ZIP {z.z} · {z.masked ? "fewer than 11" : fmt(z.w)} people · {out ? "out of reach" : "within reach"}
                </Tooltip>
              </CircleMarker>
            );
          })}

          {chosen.map((c) => (
            <Marker key={`m${fips}-${c.n}`} position={[c.lat, c.lon]} icon={pin(c.n)} zIndexOffset={1000}>
              <Tooltip>
                {c.n}. {c.name}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>

        <div className="legend" role="group" aria-label="Map legend">
          <span><i style={{ background: COLORS.covered }} />Within reach</span>
          <span><i style={{ background: COLORS.uncovered }} />Out of reach</span>
          <span><i className="sq" />Planned center</span>
        </div>
      </div>
    </div>
  );
}

function Message({ title, body }) {
  return (
    <div className="planner-state" role={body ? "alert" : "status"}>
      <h1>{title}</h1>
      {body && <p>{body}</p>}
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const sections = document.querySelectorAll(".motion-reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }

    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -36px 0px", threshold: 0.08 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  return (
    <div className="site-shell" id="top">
      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>GridAid</span>
          <span className="brand-divider" />
          <span className="brand-context">County planning</span>
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#who-its-for">Who it's for</a>
          <a href="#method">Data &amp; limits</a>
          <a className="nav-cta" href="#planner">Open planner <span aria-hidden="true">↘</span></a>
        </nav>
      </header>

      <main className="main-content">
        <section className="page-heading motion-reveal">
          <div className="hero-copy">
            <p className="eyebrow">COMMUNITY RESILIENCE <span>/</span> COUNTY PLANNING</p>
            <h1>When the grid goes quiet, <em>plan for the people.</em></h1>
            <p>GridAid helps local teams explore where backup-power centers could reach people who rely on electricity-dependent medical equipment—and where the gaps remain.</p>
            <div className="hero-actions">
              <a className="button-primary" href="#planner">Explore the county planner <span aria-hidden="true">↘</span></a>
              <a className="button-text" href="#how-it-works">See how it works</a>
            </div>
            <aside className="planning-note">
              <span className="note-mark" aria-hidden="true">i</span>
              <div>
                <span className="note-label">A planning tool, not a promise.</span>
                <p>Coverage is estimated from public data. It is not a guarantee of access, available power, or safety.</p>
              </div>
            </aside>
          </div>
          <figure className="hero-method">
            <img
              src={coverageMethodIllustration}
              alt="Illustrative map diagram: ZIP-level need, candidate centers, their estimated reach, and a coverage gap. This is not live county data."
            />
            <figcaption>
              <span>ILLUSTRATIVE ONLY</span>
              <span>A diagram of the decisions—not a county report.</span>
            </figcaption>
          </figure>
        </section>

        <section className="approach-band motion-reveal" aria-label="What the planner brings together">
          <div>
            <span className="approach-index">INPUT</span>
            <p><b>Public health estimates</b><small>ZIP-level counts, not individual records</small></p>
          </div>
          <div>
            <span className="approach-index">OUTPUT</span>
            <p><b>A plan to question together</b><small>Candidate sites, estimated reach, and visible gaps</small></p>
          </div>
        </section>

        <section id="planner" className="product-section motion-reveal">
          <div className="product-heading">
            <div>
              <p className="eyebrow">THE LIVE PLANNING TOOL</p>
              <h2>See the map. Test the assumptions.</h2>
            </div>
            <p>Every county, coverage figure, candidate site, and map below comes from the working planner—not a mockup.</p>
          </div>
          <PlannerDashboard />
        </section>

        <section className="content-section motion-reveal" id="how-it-works">
          <div className="section-heading">
            <p className="eyebrow">HOW IT WORKS</p>
            <h2>From public data to a clearer plan.</h2>
            <p>GridAid is designed to help local teams ask better questions before an outage—not to make decisions for them.</p>
          </div>
          <ol className="steps-list">
            <li>
              <span>01</span>
              <div><h3>Start with a county</h3><p>See ZIP-level estimates for Medicare beneficiaries who rely on electricity-dependent medical equipment.</p></div>
            </li>
            <li>
              <span>02</span>
              <div><h3>Set planning assumptions</h3><p>Choose how many candidate sites to consider and how far people might travel to reach one.</p></div>
            </li>
            <li>
              <span>03</span>
              <div><h3>Review coverage and gaps</h3><p>Compare potential locations, estimated coverage, and ZIP areas that may need other forms of support.</p></div>
            </li>
          </ol>
        </section>

        <section className="audience-section motion-reveal" id="who-its-for">
          <div className="section-heading">
            <p className="eyebrow">WHO IT'S FOR</p>
            <h2>A shared picture for local planning.</h2>
          </div>
          <div className="audience-list">
            <article><span>County and emergency teams</span><p>Compare center budgets and reach assumptions, then use coverage estimates to start resource-placement conversations before an outage.</p></article>
            <article><span>Community partners</span><p>Bring local knowledge to candidate locations and check access, capacity, staffing, and needs.</p></article>
          </div>
        </section>

        <section className="method-section motion-reveal" id="method">
          <div className="method-heading">
            <div>
              <p className="eyebrow">DATA &amp; METHOD</p>
              <h2>Useful estimates need local context.</h2>
            </div>
            <p>Use the plan to compare options, then validate candidate sites and assumptions with local partners.</p>
          </div>
          <div className="method-grid">
            <article>
              <h3>What goes into a plan</h3>
              <p>
                <a href="https://empowermap.hhs.gov/" target="_blank" rel="noreferrer">HHS emPOWER</a> estimates describe Medicare beneficiaries using electricity-dependent medical equipment. Candidate facilities are drawn from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> and public facility data.
              </p>
              <p>The planner uses ZIP representative points and straight-line distance to estimate reach; it does not calculate road travel time.</p>
            </article>
            <article>
              <h3>What to check locally</h3>
              <p>Population estimates do not include everyone who may need powered medical equipment. Small source counts are suppressed, and ZIP-level locations are approximate.</p>
              <p>Candidate sites are not verified for generator capacity, accessibility, staffing, or availability. Real access may be affected by roads, flooding, and mobility needs.</p>
            </article>
          </div>
          <p className="privacy-note"><span>PRIVACY, BY DESIGN</span> GridAid uses aggregate estimates for planning; it does not identify or locate individuals.</p>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <span>GridAid</span>
          <span>County-level backup-power planning · Aggregate data, community context</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}