import { W, H, INK, BOLT_FILL, LETTERS, BOLT, BOLT_BOX } from "./logoPaths.js";

// The wordmark: GRIDAID with a bolt in the A, drawn from the logo artwork. Its size follows the font size (--logo-h).
const [BX0, BY0, BX1, BY1] = BOLT_BOX;
const box = (w) => ({ width: `calc(var(--logo-h) * ${(w / H).toFixed(4)})` });

// the bolt sits over a box spanning [x0, x0 + w] of the artwork, so it can pulse on its own
function Bolt({ x0 = 0, w = W }) {
  const style = { left: `${((BX0 - x0) / w) * 100}%`, top: `${(BY0 / H) * 100}%`, width: `${((BX1 - BX0) / w) * 100}%`, height: `${((BY1 - BY0) / H) * 100}%` };
  return (
    <svg className="logo-bolt" viewBox={`${BX0} ${BY0} ${BX1 - BX0} ${BY1 - BY0}`} style={style} aria-hidden="true">
      <path d={BOLT} fill={BOLT_FILL} />
    </svg>
  );
}

export default function Logo({ className = "" }) {
  return (
    <span className={`logo ${className}`.trim()} role="img" aria-label="GridAid">
      <svg className="logo-word" viewBox={`0 0 ${W} ${H}`} style={box(W)} fill={INK} aria-hidden="true">
        {LETTERS.map((l) => <path key={l.x0} d={l.d} />)}
      </svg>
      <Bolt />
    </span>
  );
}

// The same wordmark, one mask per letter, so each letter can rise into place. Each letter's slot runs halfway to its
// neighbours; the bolt rises with the A.
const SLOTS = LETTERS.map((l, i) => ({
  ...l,
  a: i ? (LETTERS[i - 1].x1 + l.x0) / 2 : 0,
  b: i < LETTERS.length - 1 ? (l.x1 + LETTERS[i + 1].x0) / 2 : W,
}));

export function LogoRise({ className = "" }) {
  return (
    <span className={`logo logo-rise ${className}`.trim()} role="img" aria-label="GridAid">
      {SLOTS.map((s) => (
        <span className="lg-mask" key={s.x0} aria-hidden="true">
          <span className="lg-ch">
            <svg className="logo-word" viewBox={`${s.a} 0 ${s.b - s.a} ${H}`} style={box(s.b - s.a)} fill={INK}>
              <path d={s.d} />
            </svg>
            {s.ch === "A" && <Bolt x0={s.a} w={s.b - s.a} />}
          </span>
        </span>
      ))}
    </span>
  );
}
