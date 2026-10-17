import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PlannerProvider } from "./state/PlannerContext.jsx";
import SvgDefs from "./components/SvgDefs.jsx";
import ProgressLine from "./components/sections/ProgressLine.jsx";
import Stage from "./components/Stage.jsx";
import Sections from "./components/Sections.jsx";

export default function App() {
  // web fonts change line heights after first paint; pins and reveals must be measured again once they land
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);
  return (
    <PlannerProvider>
      <SvgDefs />
      <ProgressLine />
      <main id="top">
        <Stage />
        <Sections />
      </main>
    </PlannerProvider>
  );
}
