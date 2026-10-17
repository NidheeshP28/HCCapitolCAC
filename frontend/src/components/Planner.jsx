import { usePlanner } from "../state/PlannerContext.jsx";
import MapView from "./MapView.jsx";
import { IdentityCard, BudgetCard, ReachCard } from "./cards/Controls.jsx";
import CoverageCard from "./cards/CoverageCard.jsx";
import { CentersCard, GapsCard } from "./cards/Lists.jsx";
import { CurveCard } from "./cards/Insight.jsx";
import ZipCard from "./cards/ZipCard.jsx";
import { LegendCard } from "./cards/Legend.jsx";
import Strip from "./cards/Strip.jsx";

// Controls across the top, the map in the middle with the two lists beside it, three readouts along the bottom.
export default function Planner() {
  const { error } = usePlanner();
  return (
    <div className="planner" id="planner">
      <div className="band band-top">
        <IdentityCard />
        <BudgetCard />
        <ReachCard />
        <CoverageCard />
      </div>
      <MapView />
      <div className="side">
        <CentersCard />
        <GapsCard />
      </div>
      <div className="band band-bottom">
        <CurveCard />
        <ZipCard />
        <LegendCard />
      </div>
      <Strip />
      {error && (
        <div className="planner-error" role="alert">
          <h2>Can't load the data</h2>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
