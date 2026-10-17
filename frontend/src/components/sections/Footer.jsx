import { useRef } from "react";
import ShapeGrid from "../reactbits/ShapeGrid.jsx";
import Logo from "../ui/Logo.jsx";
import { useReveal } from "./useReveal.js";

export default function Footer() {
  const ref = useRef(null);
  useReveal(ref);
  return (
    <footer className="foot-sec" ref={ref}>
      <ShapeGrid className="foot-grid" shape="hexagon" cellSize={54} lineColor="rgba(242,239,229,0.12)" hoverColor="#f4c21f" hoverFillColor="#f4c21f" fillOpacity={0.22} direction="none" speed={0} radius={2.2} trail={1.1} glow={0} fade={0} intro={false} />
      <div className="foot-in">
        <div className="foot-logo rv"><Logo /></div>
        <div className="foot-cols rv"></div>
      </div>
    </footer>
  );
}
