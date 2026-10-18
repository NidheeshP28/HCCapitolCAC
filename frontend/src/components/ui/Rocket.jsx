// The shuttle on its launch tower, right of the map on the landing screen. Stage.jsx lifts it off on the same scroll
// that opens the map: the tower's arms swing back, the engines light, smoke billows at the pad and blows left over the
// fading logo. Decorative only. The scene is drawn in a 200 x 400 box; the shuttle stack is 100 x 320 of it.

// smoke at the pad: [x, y] as a share of the scene's width, and the size it grows to
export const PAD = [[-0.55, -0.06, 1.8], [-0.95, -0.14, 2.2], [-1.35, -0.24, 2.4], [0.3, -0.05, 1.6], [0.55, -0.12, 1.8], [-0.2, -0.18, 2.0]];
// smoke blown toward the logo: [share of the way there, spread across the logo, rise, size it grows to]
export const PLUME = [
  [0.18, 0.1, 0.2, 1.6], [0.3, -0.1, -0.1, 1.9], [0.42, 0.2, 0.3, 2.1], [0.54, -0.2, -0.2, 2.3],
  [0.66, 0.4, 0.2, 2.4], [0.78, -0.3, -0.3, 2.5], [0.88, 0.6, 0.1, 2.6], [0.95, 0.15, -0.25, 2.7],
  [1.0, -0.45, 0.2, 2.7], [1.02, 0.85, -0.1, 2.5], [1.06, -0.85, 0.05, 2.6], [1.0, -0.15, 0.35, 2.4],
  [0.92, -0.6, 0.3, 2.6], [0.98, 0.45, 0.3, 2.5], [1.04, 0.35, -0.3, 2.6], [1.0, -1.0, -0.2, 2.4],
];

const INK = "#1b1d1f", STEEL = "#2b2f33";
// the tower and pad stand against the black sky, so they are drawn in light steel
const TOWER = "#b9c0c7";
const BAYS = Array.from({ length: 21 }, (_, i) => 24 + i * 16);       // the tower's bays, 16 units tall
const LEVELS = [56, 120, 184, 248, 312];                               // heavier girders and work platforms
const JOINTS = [118, 165, 212, 259];                                    // booster segment joints

function Flame({ className }) {
  return (
    <span className={`rocket-flame ${className}`}>
      <svg viewBox="0 0 24 46">
        <path d="M12 0C22 10 24 26 12 46 0 26 2 10 12 0Z" fill="#e0431b" />
        <path d="M12 2C19 11 20 24 12 38 4 24 5 11 12 2Z" fill="#f59a23" />
        <path d="M12 3C16 10 16 19 12 28 8 19 8 10 12 3Z" fill="#fde68a" />
      </svg>
    </span>
  );
}

// light from the left: cylinders are bright just left of centre and fall off to the right
function Shading() {
  return (
    <defs>
      <linearGradient id="rk-white" x1="0" x2="1">
        <stop offset="0" stopColor="#b4bac1" /><stop offset="0.32" stopColor="#ffffff" /><stop offset="0.6" stopColor="#f1f3f4" /><stop offset="1" stopColor="#a3aab2" />
      </linearGradient>
      <linearGradient id="rk-orange" x1="0" x2="1">
        <stop offset="0" stopColor="#8a4013" /><stop offset="0.32" stopColor="#e3893b" /><stop offset="0.62" stopColor="#cf7129" /><stop offset="1" stopColor="#7a3810" />
      </linearGradient>
      <linearGradient id="rk-metal" x1="0" x2="1">
        <stop offset="0" stopColor="#4b5157" /><stop offset="0.4" stopColor="#a3aab1" /><stop offset="1" stopColor="#3e4449" />
      </linearGradient>
      <linearGradient id="rk-steel" x1="0" x2="1">
        <stop offset="0" stopColor="#7f878f" /><stop offset="0.5" stopColor="#d6dbe0" /><stop offset="1" stopColor="#7f878f" />
      </linearGradient>
      <linearGradient id="rk-deck" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#6b737b" /><stop offset="1" stopColor="#3a4147" />
      </linearGradient>
    </defs>
  );
}

export default function Rocket() {
  return (
    <div className="launch" aria-hidden="true">
      {/* pad and tower: they stay behind */}
      <svg className="launch-tower" viewBox="0 0 200 400">
        <Shading />
        {/* the lightning mast's catenary wires, run from its tip down to the ground on both sides */}
        <path d="M166 2L4 392M166 2L199 330" stroke={TOWER} strokeWidth="0.45" opacity="0.55" fill="none" />
        {/* concrete pad, mobile launcher deck and its pedestals, flame trench openings under the boosters */}
        <path d="M-10 400L6 384H194L210 400Z" fill="#59616a" />
        <rect x="18" y="380" width="12" height="8" fill="#2f353b" />
        <rect x="170" y="380" width="12" height="8" fill="#2f353b" />
        <rect x="4" y="360" width="192" height="22" rx="1.5" fill="url(#rk-deck)" />
        <path d="M4 361.5H196" stroke="#8d959d" strokeWidth="1" />
        <path d="M28 362h22v5H28ZM90 362h22v5H90Z" fill="#0d0f11" />
        {/* tail service masts beside the orbiter's engines */}
        <path d="M53 334h7v26h-7ZM80 334h7v26h-7Z" fill="url(#rk-steel)" stroke="#5b636b" strokeWidth="0.6" />
        {/* hold-down posts under the boosters */}
        <path d="M30 344h3v16h-3Zm15 0h3v16h-3Zm47 0h3v16h-3Zm15 0h3v16h-3Z" fill="#2f353b" />
        {/* the fixed service structure: steel columns, braced bays, heavier girders and platforms every fourth bay */}
        <g stroke={TOWER} fill="none">
          {BAYS.map((y) => <path key={`x${y}`} d={`M150 ${y}L182 ${y + 16}M182 ${y}L150 ${y + 16}`} strokeWidth="0.7" opacity="0.45" />)}
          {BAYS.map((y) => <path key={`r${y}`} d={`M150 ${y}H182`} strokeWidth="0.9" opacity="0.8" />)}
          <path d="M166 20V360" strokeWidth="0.8" opacity="0.6" />
        </g>
        <path d="M148.6 18h3v342h-3ZM180.4 18h3v342h-3Z" fill="url(#rk-steel)" />
        {LEVELS.map((y) => <path key={`l${y}`} d={`M140 ${y}h44v3h-44Z`} fill="url(#rk-steel)" stroke="#5b636b" strokeWidth="0.4" />)}
        {/* hammerhead crane with its hook line, and the lightning mast */}
        <path d="M166 14V2" stroke={TOWER} strokeWidth="1.4" />
        <path d="M134 13h58v6h-58Z" fill="url(#rk-steel)" stroke="#5b636b" strokeWidth="0.5" />
        <path d="M140 19h9v8h-9Z" fill="#8d959d" />
        <path d="M137 19V40" stroke={TOWER} strokeWidth="0.5" />
        <path d="M135 40h4v3h-4Z" fill={TOWER} />
      </svg>

      <span className="rocket-trail" />

      {/* the stack: external tank, two boosters, and the orbiter */}
      <div className="rocket-ship">
        <Flame className="f-srb-l" />
        <Flame className="f-srb-r" />
        <Flame className="f-main" />
        <svg viewBox="0 0 100 320">
          <Shading />
          {/* external tank: foam-covered orange, the darker intertank band, the oxygen feedline down its side */}
          <path d="M50 0C58.5 9 63 24 63 40V266H37V40C37 24 41.5 9 50 0Z" fill="url(#rk-orange)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M37.8 72h24.4v15H37.8Z" fill="#9c4c1a" />
          <path d="M41 72v15M45 72v15M49 72v15M53 72v15M57 72v15M61 72v15" stroke="#7a3810" strokeWidth="0.6" />
          <path d="M60.5 87V264" stroke="#7a3810" strokeWidth="1.3" />
          <path d="M50 0l-1.4 3.2h2.8Z" fill="#6b7279" />
          {/* boosters: white cylinders, nose cones, segment joints, flared nozzle skirts */}
          {[19, 81].map((c) => (
            <g key={c}>
              <path d={`M${c - 8} 288H${c + 8}L${c + 11} 304H${c - 11}Z`} fill="url(#rk-metal)" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
              <path d={`M${c} 34C${c + 5} 38 ${c + 8} 47 ${c + 8} 58V288H${c - 8}V58C${c - 8} 47 ${c - 5} 38 ${c} 34Z`} fill="url(#rk-white)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
              <path d={`M${c - 8} 62h16v4h-16Z`} fill="#d5d9dd" />
              <path d={JOINTS.map((y) => `M${c - 8} ${y}h16`).join("")} stroke={INK} strokeWidth="1.4" />
              <path d={`M${c - 8} 282h16`} stroke="#9aa1a8" strokeWidth="1" />
              <path d={`M${c} 34l-1.2 2.6h2.4Z`} fill="#6b7279" />
            </g>
          ))}
          {/* orbiter, seen from above: wings with black leading edges and elevons, the body, engine pods and engines */}
          <g stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
            <path d="M41 150L36 172L13 250V262H41Z" fill="#f6f7f8" />
            <path d="M59 150L64 172L87 250V262H59Z" fill="#f6f7f8" />
            <path d="M41.5 262h5l1.2 11h-7.4ZM47.5 262h5l1.2 11h-7.4ZM53.5 262h5l1.2 11h-7.4Z" fill="url(#rk-metal)" strokeWidth="1.1" />
            <path d="M50 88C56 90 59 97 59 106V262H41V106C41 97 44 90 50 88Z" fill="url(#rk-white)" />
            <path d="M41.5 236c0-3 1.4-5 3.4-5s3.4 2 3.4 5v24h-6.8ZM51.7 236c0-3 1.4-5 3.4-5s3.4 2 3.4 5v24h-6.8Z" fill="#f1f3f4" strokeWidth="0.8" />
          </g>
          <path d="M15 254.5H40M60 254.5H85" stroke="#9aa1a8" strokeWidth="0.8" />
          <path d="M41 150L36 172L13 250M59 150L64 172L87 250" fill="none" stroke={STEEL} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M50 88C54.5 89.3 57.4 93 58.4 99H41.6C42.6 93 45.5 89.3 50 88Z" fill={INK} />
          <path d="M44.5 103.5L47 100H53L55.5 103.5L53 106H47Z" fill={INK} />
          <path d="M44.5 116V222H55.5V116ZM50 116V222" fill="none" stroke={INK} strokeWidth="0.7" opacity="0.4" />
          <path d="M49.2 212h1.6v48h-1.6Z" fill={INK} />
        </svg>
      </div>

      {/* the tower's arms, in front of the stack until they swing back */}
      <svg className="launch-tower launch-arms" viewBox="0 0 200 400">
        <Shading />
        <g className="launch-arm">
          <path d="M150 46H80V52H150Z" fill="url(#rk-steel)" stroke="#5b636b" strokeWidth="0.5" />
          <path d="M84 46l6 6M92 46l6 6M100 46l6 6M108 46l6 6M116 46l6 6M124 46l6 6M132 46l6 6M140 46l6 6" stroke="#5b636b" strokeWidth="0.5" />
          <path d="M70 38C76 38 80.5 41.5 82 47H58C59.5 41.5 64 38 70 38Z" fill={TOWER} stroke="#5b636b" strokeWidth="0.5" />
        </g>
        <g className="launch-arm">
          <path d="M150 150H114V156H150Z" fill="url(#rk-steel)" stroke="#5b636b" strokeWidth="0.5" />
          <path d="M118 150l6 6M126 150l6 6M134 150l6 6M142 150l6 6" stroke="#5b636b" strokeWidth="0.5" />
          <rect x="107" y="146" width="10" height="14" rx="1" fill={TOWER} stroke="#5b636b" strokeWidth="0.5" />
        </g>
      </svg>

      <span className="rocket-smoke">
        {PAD.map((_, i) => <i key={`p${i}`} className="smoke-pad" />)}
        {PLUME.map((_, i) => <i key={`m${i}`} className="smoke-plume" />)}
      </span>
    </div>
  );
}
