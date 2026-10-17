import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { buildDistances, evaluatePlan, getCurve } from "./lib/plan.js";

const KMIN = 3;
const KMAX = 25;          // budget slider; plans for more than KPRE centers are computed live in the browser
const KPRE = 10;          // largest budget with a precomputed plan (and the robust plan)
const RMIN = 0.25, RMAX = 60;          // reach slider, in miles, on a log scale (small counties need fine steps)
const rToT = (r) => Math.max(0, Math.min(100, (100 * Math.log(r / RMIN)) / Math.log(RMAX / RMIN)));
const tToR = (t) => RMIN * Math.pow(RMAX / RMIN, t / 100);
const niceR = (r) => (r < 2 ? Math.round(r * 20) / 20 : r < 10 ? Math.round(r * 10) / 10 : Math.round(r * 2) / 2);
const MILE_M = 1609.34;
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

function BrandMark({ className = "" }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <span className="brand-cell brand-cell-bolt">
        <svg viewBox="0 0 12 16" focusable="false"><path d="M7.3 0 1.8 8h3.6L4.7 16l5.5-8H6.6L7.3 0Z" /></svg>
      </span>
      <i /><i /><i />
    </span>
  );
}

function BrandWord({ className = "" }) {
  return (
    <span className={`brand-word ${className}`.trim()} aria-label="GridAid">
      <span>Gr</span>
      <svg className="brand-word-bolt" viewBox="0 0 12 16" focusable="false" aria-hidden="true">
        <path d="M7.3 0 1.8 8h3.6L4.7 16l5.5-8H6.6L7.3 0Z" />
      </svg>
      <span>dAid</span>
    </span>
  );
}

function SectionEyebrow({ children }) {
  return <p className="eyebrow section-eyebrow"><BrandMark />{children}</p>;
}

function PlannerDashboard({ data, error, fips, setFips, k, setK, radius, setRadius, mode, setMode }) {
  const [showAll, setShowAll] = useState(false);

  const county = data && fips ? data.counties[fips] : null;

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
    const sel = getCurve(county, D, R).sel.slice(0, k);
    return { sel, ...evaluatePlan(county, D, sel, R, Number(fips) || 0) };
  }, [live, D, county, R, k, fips]);

  if (error) return <Message title="Can't load the data" body={error} />;
  if (!data) return <Message title="Loading…" />;
  if (!county)
    return <Message title="No counties built yet" body="Run scripts/build.py after fetching sites, then reload." />;

  const countyHasRobust = Array.isArray(county.k[String(KPRE)]?.rsel);
  const hasRobust = !!pre && Array.isArray(pre.rsel);
  const robust = mode === "robust" && hasRobust;
  let v;
  if (pre && robust)
    v = { sel: pre.rsel, unc: pre.runc, cov: pre.rcov, exp: pre.rexp, lo: pre.rlo, hi: pre.rhi };
  else if (pre)
    v = { sel: pre.sel, unc: pre.unc, cov: pre.cov, exp: pre.exp, lo: pre.lo, hi: pre.hi };
  else v = livePlan;
  const { sel, unc: uncList, cov, exp, lo, hi } = v;
  const chosen = sel.map((si, i) => ({ ...county.sites[si], n: i + 1 }));
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
            of estimated need within <b>{R} mi</b>, on paper.
          </p>
          <p className="sub">
            Expected <b>{exp.toFixed(0)}%</b> · range <b>{lo.toFixed(0)}–{hi.toFixed(0)}%</b>
          </p>
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
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [fips, setFips] = useState(null);
  const [k, setK] = useState(5);
  const [radius, setRadius] = useState(null);
  const [mode, setMode] = useState("phased");
  const [sloganTop, setSloganTop] = useState(null);
  const [powerline, setPowerline] = useState(null);

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

  useEffect(() => setRadius(null), [fips]);

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

  useEffect(() => {
    const shell = document.querySelector(".site-shell");
    const hero = document.querySelector(".hero-section");
    const identity = document.querySelector(".hero-identity");
    const wordmark = document.querySelector(".hero-wordmark");
    const planner = document.querySelector(".product-section");
    const slogan = document.querySelector(".hero-slogan");
    const plannerHeading = document.querySelector(".product-heading");
    if (!shell || !hero || !identity || !wordmark || !planner || !slogan || !plannerHeading) return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const shellRect = shell.getBoundingClientRect();
        const relativeRect = (element) => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left - shellRect.left,
            top: rect.top - shellRect.top,
            right: rect.right - shellRect.left,
            bottom: rect.bottom - shellRect.top,
            centerY: rect.top - shellRect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
          };
        };
        const layoutRectIn = (element, container) => {
          const rect = relativeRect(element);
          const containerRect = relativeRect(container);
          const matrixValues = getComputedStyle(container).transform.match(/^matrix\(([^)]+)\)$/)?.[1]
            .split(",")
            .map(Number);
          const scaleX = matrixValues?.[0] || 1;
          const scaleY = matrixValues?.[3] || 1;
          const translateX = matrixValues?.[4] || 0;
          const translateY = matrixValues?.[5] || 0;
          const layoutLeft = containerRect.left - translateX - (container.offsetWidth * (1 - scaleX)) / 2;
          const layoutTop = containerRect.top - translateY - (container.offsetHeight * (1 - scaleY)) / 2;
          const left = layoutLeft + (rect.left - containerRect.left) / scaleX;
          const top = layoutTop + (rect.top - containerRect.top) / scaleY;
          const width = rect.width / scaleX;
          const height = rect.height / scaleY;
          return { left, top, right: left + width, centerY: top + height / 2 };
        };
        const wordmarkRect = relativeRect(wordmark);
        const headingRect = layoutRectIn(plannerHeading, planner);
        const plannerRect = relativeRect(planner);
        const centerX = shell.clientWidth / 2;
        const sloganCenter = (wordmarkRect.bottom + headingRect.top) / 2;
        const plannerTransform = getComputedStyle(planner).transform;
        const plannerScale = plannerTransform.startsWith("matrix(")
          ? Number(plannerTransform.slice(7).split(",")[0])
          : 1;

        setSloganTop((sloganCenter - plannerRect.top) / plannerScale);
        const branchTo = (element, id, container) => {
          const rect = layoutRectIn(element, container);
          const gap = 8;
          return {
            id,
            x: rect.right <= centerX ? rect.right + gap : rect.left - gap,
            y: rect.centerY,
          };
        };
        const points = [
          branchTo(plannerHeading.firstElementChild, "planner", planner),
          ...[
            [".content-section", ".section-heading"],
            [".audience-section", ".section-heading"],
            [".method-section", ".method-heading"],
          ].flatMap(([sectionSelector, headingSelector], index) => {
            const section = document.querySelector(sectionSelector);
            const heading = section?.querySelector(headingSelector);
            if (!section || !heading) return [];
            const target = index === 2 ? heading.firstElementChild : heading;
            return [branchTo(target, `section-${index}`, section)];
          }),
        ];
        const lineEnd = shell.scrollHeight - 12;
        const path = `M ${centerX} ${wordmarkRect.bottom} V ${lineEnd}`;
        const branches = points
          .map(({ x, y }) => `M ${centerX} ${y} H ${x}`)
          .join(" ");
        const nodes = [
          { id: "start", x: centerX, y: wordmarkRect.bottom },
          { id: "end", x: centerX, y: lineEnd },
          ...points.map(({ id, x, y }) => ({ id, x, y })),
        ];
        const lineLength = lineEnd - wordmarkRect.bottom;
        setPowerline({
          width: shell.clientWidth,
          height: shell.scrollHeight,
          path,
          branches,
          nodes,
          lineLength,
        });
      });
    };

    const observer = new ResizeObserver(measure);
    [
      shell,
      hero,
      wordmark,
      planner,
      slogan,
      plannerHeading,
      ...document.querySelectorAll(".content-section .section-heading, .audience-section .section-heading, .method-section .method-heading"),
    ].forEach((element) => observer.observe(element));
    const revealSections = [...document.querySelectorAll(".motion-reveal")];
    window.addEventListener("resize", measure);
    revealSections.forEach((section) => section.addEventListener("transitionend", measure));
    identity.addEventListener("transitionend", measure);
    measure();
    const revealFrame = requestAnimationFrame(() => requestAnimationFrame(measure));
    const revealTimer = window.setTimeout(measure, 1100);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      revealSections.forEach((section) => section.removeEventListener("transitionend", measure));
      identity.removeEventListener("transitionend", measure);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(revealFrame);
      window.clearTimeout(revealTimer);
    };
  }, []);

  return (
    <div className="site-shell" id="top">
      {powerline && (
        <svg
          className="powerline-trace"
          viewBox={`0 0 ${powerline.width} ${powerline.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ "--line-travel": `${-powerline.lineLength}px` }}
        >
          <path className="powerline-base" d={powerline.path} />
          <path className="powerline-base powerline-branches" d={powerline.branches} />
          <path className="powerline-energy" d={powerline.path} />
          {powerline.nodes.map((node) => (
            <circle key={node.id} className="powerline-node" cx={node.x} cy={node.y} r="3" />
          ))}
        </svg>
      )}
      <main className="main-content">
        <section className="page-heading hero-section motion-reveal" aria-label="GridAid">
          <div className="hero-identity">
            <h1 className="hero-wordmark"><BrandWord className="hero-wordmark-type" /></h1>
          </div>
        </section>

        <section id="planner" className="product-section motion-reveal">
          <p className="hero-slogan" style={sloganTop == null ? undefined : { top: sloganTop }}>
            Backup power, placed where it is needed the most.
          </p>
          <div className="product-heading">
            <div>
              <SectionEyebrow>THE PLANNER</SectionEyebrow>
              <h2>Adjust the plan.</h2>
            </div>
          </div>
          <PlannerDashboard
            data={data}
            error={error}
            fips={fips}
            setFips={setFips}
            k={k}
            setK={setK}
            radius={radius}
            setRadius={setRadius}
            mode={mode}
            setMode={setMode}
          />
        </section>

        <section className="content-section motion-reveal" id="how-it-works">
          <div className="section-heading">
            <SectionEyebrow>HOW IT WORKS</SectionEyebrow>
            <h2>From data to a plan.</h2>
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
            <SectionEyebrow>WHO IT'S FOR</SectionEyebrow>
            <h2>Plan together.</h2>
          </div>
          <div className="audience-list">
            <article><span>County and emergency teams</span><p>Compare center budgets and reach assumptions, then use coverage estimates to start resource-placement conversations before an outage.</p></article>
            <article><span>Community partners</span><p>Bring local knowledge to candidate locations and check access, capacity, staffing, and needs.</p></article>
          </div>
        </section>

        <section className="method-section motion-reveal" id="method">
          <div className="method-heading">
            <div>
              <SectionEyebrow>DATA &amp; METHOD</SectionEyebrow>
              <h2>Know the limits.</h2>
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

    </div>
  );
}