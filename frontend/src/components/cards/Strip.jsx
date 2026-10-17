const ITEMS = [
  ["Planning support", "not a safety guarantee"],
  ["Straight line", "not travel time"],
  ["Medicare enrollees", "only"],
];

export default function Strip() {
  return (
    <aside className="strip" data-dock="bottom" aria-label="What this map does not tell you">
      {ITEMS.map(([a, b]) => (
        <p key={a}><b>{a}</b> <span>{b}</span></p>
      ))}
      <a className="strip-next" href="#why">How it works ↓</a>
    </aside>
  );
}
