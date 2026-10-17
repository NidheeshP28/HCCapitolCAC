// A range input with a printed scale underneath: ticks sit exactly under the thumb's travel.
export default function Slider({ value, min, max, step = 1, onChange, ticks = [], label, valueText }) {
  const frac = (v) => (v - min) / (max - min);
  return (
    <div className="slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={valueText}
        style={{ "--p": frac(value) }}
      />
      <div className="slider-scale" aria-hidden="true">
        {ticks.map((t) => (
          <i key={t.at} className={t.label ? "maj" : ""} style={{ "--f": frac(t.at) }}>
            {t.label && <em>{t.label}</em>}
          </i>
        ))}
      </div>
    </div>
  );
}
