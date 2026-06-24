import PropTypes from 'prop-types';
import TripReadinessPanel from "../TripReadinessPanel";
import SourceChips from "../SourceChips";

function PrepTab({
  nextStepsChecklist,
  packPlanner,
  permitChecklist,
}) {
  return (
    <>
      {/* Trip Readiness Dashboard */}
      <TripReadinessPanel
        packPlanner={packPlanner}
        nextStepsChecklist={nextStepsChecklist}
        permitChecklist={permitChecklist}
      />

      {/* Permit Checklist - Detailed */}
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>📝 Permit Checklist</h2>
          <span className="section-subtitle">
            Required documents for Section O
          </span>
        </div>
        <div className="permit-grid">
          {permitChecklist.map((permit) => (
            <article key={permit.name} className="permit-card">
              <h3>{permit.name}</h3>
              <p className="tag">{permit.coverage}</p>
              <p>
                <strong>Where:</strong> {permit.source}
              </p>
              <p>
                <strong>Cost:</strong> {permit.cost}
              </p>
              <p>{permit.notes}</p>
              {permit.sourceIds && (
                <SourceChips
                  sourceIds={permit.sourceIds}
                  size="small"
                  maxShow={4}
                />
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

PrepTab.propTypes = {
  nextStepsChecklist: PropTypes.array.isRequired,
  packPlanner: PropTypes.object.isRequired,
  permitChecklist: PropTypes.array.isRequired,
};

export default PrepTab;
