import { useState } from "react";
import { usePlanner } from "../../state/PlannerContext.jsx";
import { KMAX, KMIN, TARGETS } from "../../lib/usePlan.js";
import { fmt1 } from "../../lib/format.js";
import { useSize } from "../../lib/hooks.js";
import Card from "../ui/Card.jsx";

const M = { l: 26, r: 6, t: 8, b: 18 };

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
  const stride = xmax > 24 ? 10 : 5;
  for (let n = stride; n <= xmax; n += stride) xt.push(n);

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
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={M.l} x2={w - M.r} y1={Y(v)} y2={Y(v)} className="gl" />
              <text x={M.l - 5} y={Y(v) + 3} className="ax" textAnchor="end">{v}</text>
            </g>
          ))}
          <path d={area} className="ar" />
          <path d={line} className="ln" />
          {xt.map((n) => (
            <text key={n} x={X(n)} y={h - 4} className="ax" textAnchor="middle">{n}</text>
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
  const { needs, R } = usePlanner();
  return (
    <Card title="Centers vs. coverage" aside="click to set" dock="bottom" className="c-curve">
      <div className="curve">
        <Chart />
        <dl className="need" aria-label={`Centers needed at ${R} miles`}>
          {(needs ?? TARGETS.map((t) => ({ target: t }))).map((n) => (
            <div key={n.target}>
              <dt>{n.target}%</dt>
              <dd>{needs ? (n.centers == null ? "40+" : n.centers) : "…"}<small> centers</small></dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}
