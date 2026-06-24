import PropTypes from 'prop-types';
import TransitPanel from "../TransitPanel";
import SourceChips from "../SourceChips";
import { generateGPX } from "../../utils/gpxExporter";

function LogisticsTab({
  campPoints,
  hikingTrail,
  resupplyPlan,
  travelPlan,
}) {
  const handleExportGPX = () => {
    const gpxContent = generateGPX(hikingTrail, campPoints);
    const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pct_section_o.gpx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Transit & Access Panel */}
      <TransitPanel />

      <section className="sidebar-card">
        <h2>GPS Export</h2>
        <p className="note">Download waypoints and trail geometry to load into Garmin, FarOut, or CalTopo before losing service.</p>
        <button onClick={handleExportGPX} className="rpg-btn-add" style={{ width: '100%', marginTop: '0.5rem', cursor: 'pointer', padding: '0.75rem', background: 'var(--pine-500)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          Export GPX to Garmin/FarOut
        </button>
      </section>

      <section className="sidebar-card">
        <h2>Travel &amp; Shuttle Playbook</h2>
        {travelPlan.sourceIds && (
          <SourceChips
            sourceIds={travelPlan.sourceIds}
            size="small"
            maxShow={3}
          />
        )}
        <h3 className="subhead">Inbound</h3>
        <ul className="bullet-list bullet-list--sourced">
          {travelPlan.inbound.map((item, i) => {
            const step = typeof item === "string" ? item : item.step;
            const stepSourceIds =
              typeof item === "object" ? item.sourceIds : null;
            return (
              <li key={i}>
                <span>{step}</span>
                {stepSourceIds && (
                  <SourceChips
                    sourceIds={stepSourceIds}
                    size="small"
                    maxShow={2}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <h3 className="subhead">Exit strategy</h3>
        <ul className="bullet-list bullet-list--sourced">
          {travelPlan.exit.map((item, i) => {
            const step = typeof item === "string" ? item : item.step;
            const stepSourceIds =
              typeof item === "object" ? item.sourceIds : null;
            return (
              <li key={i}>
                <span>{step}</span>
                {stepSourceIds && (
                  <SourceChips
                    sourceIds={stepSourceIds}
                    size="small"
                    maxShow={2}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <p className="note">Trail angel intel: {travelPlan.trailAngelNotes}</p>
      </section>

      <section className="sidebar-card">
        <h2>Resupply Hub · {resupplyPlan.town}</h2>
        <p className="lede">{resupplyPlan.callouts}</p>
        {resupplyPlan.sourceIds && (
          <SourceChips
            sourceIds={resupplyPlan.sourceIds}
            size="small"
            maxShow={3}
          />
        )}
        <div className="two-column">
          <div>
            <h3 className="subhead">Access</h3>
            <ul className="bullet-list bullet-list--sourced">
              {resupplyPlan.access.map((item, i) => {
                const text = typeof item === "string" ? item : item.item;
                const itemSourceIds =
                  typeof item === "object" ? item.sourceIds : null;
                return (
                  <li key={i}>
                    <span>{text}</span>
                    {itemSourceIds && (
                      <SourceChips
                        sourceIds={itemSourceIds}
                        size="small"
                        maxShow={2}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="subhead">Services</h3>
            <ul className="bullet-list">
              {resupplyPlan.services.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

LogisticsTab.propTypes = {
  campPoints: PropTypes.array,
  hikingTrail: PropTypes.array,
  resupplyPlan: PropTypes.object.isRequired,
  travelPlan: PropTypes.object.isRequired,
};

export default LogisticsTab;
