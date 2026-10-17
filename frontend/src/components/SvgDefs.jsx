// Shared SVG paint: the red hatch that marks a ZIP as out of reach, on the map, in the key, and in the walkthrough.
export default function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="ga-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="rgba(224,67,27,0.12)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#e0431b" strokeWidth="2.4" />
        </pattern>
      </defs>
    </svg>
  );
}
