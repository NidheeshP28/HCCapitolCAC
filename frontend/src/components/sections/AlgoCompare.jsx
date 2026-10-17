import { useEffect, useRef, useState } from "react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import { solve } from "../../lib/solver.js";

// Seven ways to pick the same k centers, run live on the county open above. For seeing how the methods trade
// speed for quality; the planner itself uses greedy (phased) or the exact search (optimal).
export default function AlgoCompare() {
  const { fips, county, k, R } = usePlanner();
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: "200px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || !county) return;
    let live = true;
    setRows(null);
    const t = setTimeout(() => solve(fips, county, "compare", { k, R }).then((r) => live && setRows(r)).catch(() => {}), 200);
    return () => { live = false; clearTimeout(t); };
  }, [seen, fips, county, k, R]);

  const top = rows ? Math.max(...rows.map((r) => r.cov)) : 0;
  // bars start a few points below the weakest result so small differences are visible; the axis is labelled
  const floor = rows ? Math.max(0, Math.floor(Math.min(...rows.map((r) => r.cov)) - 5)) : 0;
  return (
    <div className="algo card rv" ref={ref}>
      <header className="card-h">
        <h3>Seven ways to pick {k} centers</h3>
        <span className="card-aside">{county ? `${county.name}, ${R} mi · bars from ${floor}% to 100%` : ""}</span>
      </header>
      <ol className="algo-rows">
        {(rows ?? Array.from({ length: 7 }, () => null)).map((r, i) => (
          <li key={r?.key ?? i} className={r && r.cov >= top - 1e-6 ? "is-top" : ""}>
            <span className="algo-n">{String(i + 1).padStart(2, "0")}</span>
            <span className="algo-name"><b>{r?.name ?? "…"}</b><em>{r?.about ?? "Running…"}</em></span>
            <span className="algo-bar" style={{ "--v": r ? (r.cov - floor) / (100 - floor) : 0 }} title={r ? `bar runs from ${floor}% to 100%` : undefined}><i /></span>
            <span className="algo-cov">{r ? `${r.cov.toFixed(1)}%` : ""}</span>
            <span className="algo-ms">{r ? (r.ms < 1 ? "<1 ms" : `${Math.round(r.ms)} ms`) : ""}</span>
            <span className="algo-x">{r ? (r.key === "bnb" ? (r.exact ? "proven best" : "time limit") : r.note) : ""}</span>
          </li>
        ))}
      </ol>
      <p className="foot">Same county, same reach, same number of centers. Exact integer programming also runs at build time (scripts/build.py) and at <code>/api/compare</code>.</p>
    </div>
  );
}
