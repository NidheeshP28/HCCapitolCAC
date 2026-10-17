// The wordmark: "Gr", a bolt for the i, "dAid", set in Oxanium.
const BOLT = "M7.3 0 1.8 8h3.6L4.7 16l5.5-8H6.6L7.3 0Z";

export default function Logo({ className = "" }) {
  return (
    <span className={`logo ${className}`.trim()} role="img" aria-label="GridAid">
      <span aria-hidden="true">Gr</span>
      <svg className="logo-bolt" viewBox="0 0 12 16" aria-hidden="true"><path d={BOLT} /></svg>
      <span aria-hidden="true">dAid</span>
    </span>
  );
}

// The same wordmark, one mask per letter, so each letter can rise into place.
export function LogoRise({ className = "" }) {
  const piece = (c, i) => (
    <span className="lg-mask" key={i} aria-hidden="true"><span className="lg-ch">{c}</span></span>
  );
  return (
    <span className={`logo logo-rise ${className}`.trim()} role="img" aria-label="GridAid">
      {"Gr".split("").map(piece)}
      <span className="lg-mask lg-bolt" aria-hidden="true">
        <span className="lg-ch"><svg className="logo-bolt" viewBox="0 0 12 16"><path d={BOLT} /></svg></span>
      </span>
      {"dAid".split("").map(piece)}
    </span>
  );
}
