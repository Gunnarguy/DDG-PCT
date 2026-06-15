import {
  getTransitPlan,
  rentalCarInfo,
  resupplyAccess,
  shuttleServices,
  transitRoutes,
} from "../services/transitService";
import "../styles/TransitPanel.css";

/**
 * Public Transit & Trailhead Access Information
 * Based on nst.guide transit layer methodology
 */
function TransitPanel() {
  const renderPlan = (label, origin, defaultOpen = false) => {
    const plan = getTransitPlan(origin);
    if (!plan) return null;

    return (
      <details
        className="plan-accordion"
        {...(defaultOpen ? { open: true } : {})}
      >
        <summary>{label}</summary>
        <div className="plan-content">
          <div className="plan-stats">
            {plan.duration && <span>⏱️ {plan.duration}</span>}
            {plan.cost && <span>💰 ~{plan.cost}</span>}
          </div>
          <ol className="plan-steps">
            {(plan.steps || []).map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
          {plan.notes && <p className="plan-notes">📝 {plan.notes}</p>}
        </div>
      </details>
    );
  };

  return (
    <div className="transit-panel">
      <div className="panel-header">
        <h3>🚌 Trailhead Access & Transit</h3>
        <p className="panel-subtitle">
          Public transit, shuttles, and rental car options for Section O
        </p>
      </div>

      {/* Quick access summary */}
      <div className="access-summary">
        <div className="summary-card recommended">
          <h4>✅ Recommended: Rental Car</h4>
          <p>
            <strong>3.5 hours</strong> from Sacramento (SMF) or{" "}
            <strong>~5 hours</strong> from SJC/SFO. Drive I-505 → I-5 → CA-299 →
            CA-89. Park at trailhead ($10/day, confirm extended parking with
            park office).
          </p>
          <a href="tel:5303352777" className="contact-link">
            📞 Call Burney Falls SP: (530) 335-2777
          </a>
        </div>

        <div className="summary-card">
          <h4>⚠️ Public Transit: Limited Weekday Service</h4>
          <p>
            Amtrak to Redding → RABA bus to Burney → Taxi to trailhead.
            <strong>RABA Route 5 runs Mon-Fri only.</strong> Last-mile rideshare
            east of Redding is unreliable.
          </p>
        </div>
      </div>

      {/* Public Transit Routes Timeline */}
      <div className="transit-routes-section">
        <h4>🚆 Interactive Logistics Timeline</h4>
        <div className="logistics-timeline">
          {transitRoutes.map((route) => {
            const isWeekendGap = route.notes?.toLowerCase().includes("saturday") || route.notes?.toLowerCase().includes("weekend");
            const requiresBooking = route.notes?.toLowerCase().includes("call") || route.notes?.toLowerCase().includes("book");

            return (
              <div key={route.id} className="timeline-step" style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--sand-50)', borderLeft: '3px solid var(--pine-500)', marginBottom: '1rem', position: 'relative' }}>
                <div className="step-icon" style={{ fontSize: '1.5rem', flexShrink: 0 }}>{route.emoji}</div>
                <div className="step-content">
                  <strong style={{ fontSize: '1.1rem', display: 'block', color: 'var(--pine-900)' }}>{route.name}</strong>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: 'var(--stone-600)' }}>{route.agency} · {route.frequency}</p>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.85rem' }}><strong>Route:</strong> {route.stops.join(" → ")}</p>

                  {(isWeekendGap || requiresBooking) && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--orange-50)', borderLeft: '2px solid var(--orange-500)', borderRadius: '4px' }}>
                      {isWeekendGap && <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: 'var(--orange-900)' }}><strong>⚠️ Weekend Gap:</strong> This service may not run on Saturday/Sunday.</p>}
                      {requiresBooking && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--orange-900)' }}><strong>📅 Booking Required:</strong> {route.notes}</p>}
                    </div>
                  )}
                  {!isWeekendGap && !requiresBooking && route.notes && (
                    <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: 'var(--stone-600)' }}>{route.notes}</p>
                  )}
                  {route.cost && <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>💰 {route.cost}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shuttle Services */}
      <div className="shuttle-section">
        <h4>🚐 Shuttle & Trail Angel Services</h4>
        <div className="shuttle-list">
          {shuttleServices.map((service) => (
            <div key={service.id} className="shuttle-card">
              <div className="shuttle-header">
                <span className="shuttle-icon">{service.emoji}</span>
                <strong>{service.name}</strong>
              </div>
              <p className="shuttle-notes">{service.notes}</p>
              <div className="shuttle-details">
                {service.cost && <span>💰 {service.cost}</span>}
                {service.phone && <span>📞 {service.phone}</span>}
                <span>🗺️ {service.coverage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rental Car Details */}
      <div className="rental-car-section">
        <h4>🚗 Rental Car Information</h4>

        <div className="airport-options">
          <h5>Airports with Rental Cars:</h5>
          {rentalCarInfo.airports.map((airport) => (
            <div
              key={airport.code}
              className={`airport-card ${
                airport.recommended ? "recommended" : ""
              }`}
            >
              <div className="airport-header">
                <strong>
                  {airport.code} - {airport.name}
                </strong>
                {airport.recommended && (
                  <span className="rec-badge">✅ Recommended</span>
                )}
              </div>
              <p className="airport-distance">📍 {airport.distanceToBurney}</p>
              <p className="airport-agencies">
                🚗 Agencies: {airport.rentalAgencies.join(", ")}
              </p>
              <p className="airport-notes">{airport.notes}</p>
            </div>
          ))}
        </div>

        <div className="parking-options">
          <h5>Extended Parking:</h5>
          {rentalCarInfo.parkingOptions.map((parking, idx) => (
            <div key={idx} className="parking-card">
              <strong>{parking.location}</strong>
              <p className="parking-address">{parking.address}</p>
              <div className="parking-details">
                <span>💰 {parking.cost}</span>
                <span>🔒 {parking.security}</span>
              </div>
              <p className="parking-notes">
                <strong>Long-term:</strong> {parking.longTermPermit}
              </p>
              <p className="parking-notes">{parking.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resupply Town Access */}
      <div className="resupply-section">
        <h4>🏪 Resupply Town Access</h4>
        <div className="resupply-list">
          {resupplyAccess.map((town, idx) => (
            <div key={idx} className="resupply-card">
              <div className="resupply-header">
                <strong>📍 {town.town}</strong>
                <span className="trail-distance">{town.trailDistance}</span>
              </div>

              <div className="resupply-services">
                <strong>Services:</strong>
                <div className="service-tags">
                  {town.services.map((service, sidx) => (
                    <span key={sidx} className="service-tag">
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              <p className="resupply-transit">
                <strong>Transit:</strong> {town.transitAccess}
              </p>

              <p className="resupply-notes">{town.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sample Transit Plans */}
      <div className="transit-plans">
        <h4>📋 Sample Access Plans</h4>

        {renderPlan("SJC arrival (rail + rental backup)", "SJC")}
        {renderPlan("SFO arrival (rail + rental backup)", "SFO")}
        {renderPlan("Home base (drive from Joseph Ave)", "Home")}
        {renderPlan("From Sacramento (public transit)", "Sacramento")}
        {renderPlan("Rental car (recommended)", "Rental Car", true)}
      </div>

      {/* Important Notes */}
      <div className="transit-notes">
        <h4>⚠️ Important Notes</h4>
        <ul>
          <li>
            <strong>RABA weekday-only service:</strong> Route 5 to Burney does
            not operate Saturdays or Sundays. Plan travel days accordingly.
          </li>
          <li>
            <strong>Last-mile problem:</strong> All public transit stops 1-5
            miles from trailheads. Budget for taxi/Uber (~$15-30) or arrange
            trail angel pickup.
          </li>
          <li>
            <strong>Cell service limited:</strong> Book rides in advance. Don't
            rely on hailing Uber from the trail.
          </li>
          <li>
            <strong>Night driving:</strong> Try to clear CA-299 before dark to
            avoid deer and one-lane construction controls.
          </li>
          <li>
            <strong>Extended parking:</strong> Always call ahead to confirm
            multi-day parking policies. Some parks have 72-hour limits.
          </li>
        </ul>
      </div>

      {/* Data Attribution */}
      <div className="panel-footer">
        <p className="data-sources">
          Transit data methodology adapted from <strong>nst.guide</strong>{" "}
          (routes within 1km of trail)
        </p>
      </div>
    </div>
  );
}

TransitPanel.propTypes = {};

export default TransitPanel;
