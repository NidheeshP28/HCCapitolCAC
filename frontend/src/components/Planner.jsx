import { usePlanner } from "../state/PlannerContext.jsx";
import MapView from "./MapView.jsx";
import { IdentityCard, BudgetCard, ReachCard, PlacementCard } from "./cards/Controls.jsx";
import CoverageCard from "./cards/CoverageCard.jsx";
import { CentersCard, GapsCard } from "./cards/Lists.jsx";
import { CurveCard, CheckCard } from "./cards/Insight.jsx";
import { LookupCard, InspectorCard } from "./cards/Lookup.jsx";
import { LegendCard } from "./cards/Legend.jsx";
import Strip from "./cards/Strip.jsx";

// Everything the planner shows sits next to everything else: controls across the top, the map in the middle with
// the two lists beside it, the readouts across the bottom. Nothing scrolls the page except the lists.
export default function Planner() {
  const { error } = usePlanner();
  return (
    <div className="planner" id="planner">
      <div className="band band-top">
        <IdentityCard />
        <BudgetCard />
        <ReachCard />
        <PlacementCard />
        <CoverageCard />
      </div>
      <MapView />
      <div className="side">
        <CentersCard />
        <GapsCard />
      </div>
      <div className="band band-bottom">
        <CurveCard />
        <CheckCard />
        <LookupCard />
        <InspectorCard />
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
