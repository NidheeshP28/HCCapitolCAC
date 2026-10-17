import { useRef } from "react";
import ShapeGrid from "../reactbits/ShapeGrid.jsx";
import { useReveal } from "./useReveal.js";

export default function Footer() {
  const ref = useRef(null);
  useReveal(ref);
  return (
    <footer className="foot-sec" ref={ref}>
      <ShapeGrid className="foot-grid" shape="hexagon" cellSize={54} lineColor="rgba(242,239,229,0.12)" hoverColor="#f4c21f" hoverFillColor="#f4c21f" fillOpacity={0.22} direction="none" speed={0} radius={2.2} trail={1.1} glow={0} fade={0} intro={false} />
      <div className="foot-in">
        <p className="foot-big rv" aria-label="GridAid">Gr<svg viewBox="0 0 12 16" aria-hidden="true"><path d="M7.3 0 1.8 8h3.6L4.7 16l5.5-8H6.6L7.3 0Z" /></svg>dAid</p>
        <div className="foot-cols rv">
          <p>An open, public planning tool. Not a product, not an alert system, and not a safety guarantee. It uses only aggregate, de-identified counts and never tries to locate anyone.</p>
          <p>Built for the Congressional App Challenge. Thanks to Hack Club’s Capitol. Data from the HHS emPOWER Program, the US Census Bureau, and OpenStreetMap contributors.</p>
          <p><a href="#top">Back to the map ↑</a></p>
        </div>
      </div>
    </footer>
  );
}
