import { lazy, Suspense, useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PlannerProvider } from "./state/PlannerContext.jsx";
import SvgDefs from "./components/SvgDefs.jsx";
import ProgressLine from "./components/sections/ProgressLine.jsx";
import Stage from "./components/Stage.jsx";
import Sections from "./components/Sections.jsx";
import { goTo, usePage } from "./lib/route.js";
import Boundary from "./components/ui/Boundary.jsx";

const Logistics = lazy(() => import("./pages/Logistics.jsx"));

export default function App() {
  const page = usePage();
  // web fonts change line heights after first paint; pins and reveals must be measured again once they land
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);
  return (
    <PlannerProvider>
      <SvgDefs />
      {page === "logistics" ? (
        <Boundary fallback={<p className="page-wait">Something went wrong on this page. <button type="button" className="lg-link" onClick={() => goTo("planner")}>Back to the map</button></p>}>
          <Suspense fallback={<p className="page-wait">Loading the logistics page…</p>}>
            <Logistics />
          </Suspense>
        </Boundary>
      ) : (
        <>
          <ProgressLine />
          <main id="top">
            <Stage />
            <Sections />
          </main>
        </>
      )}
    </PlannerProvider>
  );
}
