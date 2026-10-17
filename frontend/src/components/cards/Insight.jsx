import { useState } from "react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import { KMAX, KMIN, TARGETS } from "../../lib/usePlan.js";
import { fmt1, miles } from "../../lib/format.js";
import { useSize } from "../../lib/hooks.js";
import Card from "../ui/Card.jsx";

const M = { l: 28, r: 8, t: 8, b: 18 };

function Chart() {
  const { curve, k, setK } = usePlanner();
  const [ref, { w, h }] = useSize();
  const [hov, setHov] = useState(null);
  const cum = curve?.cum ?? [];
  const full = cum.findIndex((c) => c >= 99.95);
  const xmax = Math.max(8, Math.min(cum.length || 8, Math.max(k + 2, full >= 0 ? full + 3 : 0, 10)));
  const iw = Math.max(1, w - M.l - M.r), ih = Math.max(1, h - M.t - M.b);
  const X = (n) => M.l + ((n - 1) / (xmax - 1)) * iw;
  const Y = (v) => M.t + (1 - v / 100) * ih;
  const pts = cum.slice(0, xmax).map((v, i) => [X(i + 1), Y(v)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const area = pts.length ? `${line}L${X(pts.length).toFixed(1)} ${Y(0)}L${X(1).toFixed(1)} ${Y(0)}Z` : "";
  const xt = [];
  const stride = xmax > 24 ? 5 : xmax > 12 ? 2 : 1;
  for (let n = 1; n <= xmax; n++) if (n === 1 || n % stride === 0) xt.push(n);

  const at = (e) => {
    const r = ref.current.getBoundingClientRect();
    const n = Math.round(1 + ((e.clientX - r.left - M.l) / iw) * (xmax - 1));
    return Math.max(1, Math.min(xmax, n));
  };
  const kk = Math.min(k, xmax);
  return (
    <div className="chart" ref={ref}>
      {w > 0 && curve && (
        <svg
          width={w}
          height={h}
          role="img"
          aria-label={`Coverage by number of centers. With ${k} centers: ${cum[k - 1]?.toFixed(1)} percent.`}
          onPointerMove={(e) => setHov(at(e))}
          onPointerLeave={() => setHov(null)}
          onClick={(e) => setK(Math.max(KMIN, Math.min(KMAX, at(e))))}
        >
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={M.l} x2={w - M.r} y1={Y(v)} y2={Y(v)} className="gl" />
              <text x={M.l - 5} y={Y(v) + 3} className="ax" textAnchor="end">{v}</text>
            </g>
          ))}
          {TARGETS.map((t) => (
            <line key={t} x1={M.l} x2={w - M.r} y1={Y(t)} y2={Y(t)} className="tg" />
          ))}
          <path d={area} className="ar" />
          <path d={line} className="ln" />
          {xt.map((n) => (
            <text key={n} x={X(n)} y={h - 5} className="ax" textAnchor="middle">{n}</text>
          ))}
          {hov != null && cum[hov - 1] != null && (
            <g className="hv">
              <line x1={X(hov)} x2={X(hov)} y1={M.t} y2={Y(0)} />
              <circle cx={X(hov)} cy={Y(cum[hov - 1])} r="3" />
              <text x={Math.min(w - M.r - 4, Math.max(M.l + 4, X(hov) + 6))} y={Math.max(M.t + 10, Y(cum[hov - 1]) - 7)} textAnchor={X(hov) > w - 90 ? "end" : "start"}>
                {hov} → {fmt1(cum[hov - 1])}%
              </text>
            </g>
          )}
          {cum[kk - 1] != null && (
            <g className="me">
              <line x1={X(kk)} x2={X(kk)} y1={Y(cum[kk - 1])} y2={Y(0)} />
              <rect x={X(kk) - 4} y={Y(cum[kk - 1]) - 4} width="8" height="8" />
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

export function CurveCard() {
  const { needs, R, k } = usePlanner();
  return (
    <Card id="07" title="Reach vs. budget" aside="greedy · click to set" dock="bottom" className="c-curve">
      <div className="curve">
        <Chart />
        <table className="need">
          <caption>To cover…</caption>
          <thead>
            <tr><th></th><th>at {R} mi</th><th>with {k}</th></tr>
          </thead>
          <tbody>
            {(needs ?? TARGETS.map((t) => ({ target: t }))).map((n) => (
              <tr key={n.target}>
                <th>{n.target}%</th>
                <td>{needs ? (n.centers == null ? "40+" : <><b>{n.centers}</b> ctr</>) : "…"}</td>
                <td>{needs ? (n.reach == null ? "—" : <><b>{miles(n.reach)}</b> mi</>) : "…"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="need-note">Reach is a standard to meet, not a dial to tune.</p>
      </div>
    </Card>
  );
}

export function CheckCard() {
  const { plan, county } = usePlanner();
  if (!plan) return <Card id="08" title="Plan check" dock="bottom" className="c-check" />;
  return (
    <Card id="08" title="Plan check" aside={plan.source === "live" ? "live estimate" : plan.source} dock="bottom" className="c-check">
      <dl className="stats">
        <div>
          <dt>Expected</dt>
          <dd>{plan.exp.toFixed(0)}<small>%</small></dd>
          <p>if ZIP points are off a bit</p>
        </div>
        <div>
          <dt>Range</dt>
          <dd>{plan.lo.toFixed(0)}–{plan.hi.toFixed(0)}<small>%</small></dd>
          <p>reach 20% shorter / longer</p>
        </div>
        <div>
          <dt>Best possible</dt>
          <dd>{plan.opt != null ? <>{plan.opt.toFixed(1)}<small>%</small></> : "n/a"}</dd>
          <p>{plan.opt != null ? `this plan gets ${plan.ratio.toFixed(1)}% of it` : "solved exactly for preset plans only"}</p>
        </div>
        <div>
          <dt>Backed up</dt>
          <dd>{plan.red.toFixed(0)}<small>%</small></dd>
          <p>reached by 2+ centers</p>
        </div>
      </dl>
    </Card>
  );
}
