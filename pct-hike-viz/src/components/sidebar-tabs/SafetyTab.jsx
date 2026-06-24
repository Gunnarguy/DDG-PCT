import PropTypes from 'prop-types';
import WildfireMonitor from "../WildfireMonitor";
import TerrainAnalysis from "../TerrainAnalysis";
import SourceChips from "../SourceChips";

function SafetyTab({ riskPlaybook }) {
  return (
    <>
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Real-Time Safety Monitoring</h2>
          <span className="section-subtitle">
            Wildfire + air quality intel for Section O
          </span>
        </div>
        <p className="lede">
          Live wildfire perimeters and air quality monitoring across Section O.
          Data refreshes every 4 hours from NIFC (National Interagency Fire
          Center) and EPA AirNow. Critical for trip go/no-go decisions during
          fire season (July-October).
        </p>
      </section>

      <WildfireMonitor />

      {/* Terrain Analysis - Slope-angle breakdown */}
      <TerrainAnalysis />

      {/* Risk & Contingency Planning */}
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>⚠️ Risk &amp; Contingency Planning</h2>
          <span className="section-subtitle">
            Know the hazards before you go
          </span>
        </div>
        <p className="lede">
          Pre-identified hazards and mitigation strategies for Section O.
        </p>
        <ul className="bullet-list">
          {riskPlaybook.map((risk) => (
            <li key={risk.title}>
              <strong>{risk.title}:</strong> {risk.detail}
              {risk.sourceIds && risk.sourceIds.length > 0 && (
                <SourceChips sourceIds={risk.sourceIds} size="small" />
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

SafetyTab.propTypes = {
  riskPlaybook: PropTypes.array.isRequired,
};

export default SafetyTab;
