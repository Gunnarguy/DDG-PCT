import PropTypes from 'prop-types';
import { transitRoutes, shuttleServices, rentalCarInfo, resupplyAccess, getTransitPlan } from '../services/transitService';
import '../styles/TransitPanel.css';

/**
 * Public Transit & Trailhead Access Information
 * Based on nst.guide transit layer methodology
 */
function TransitPanel() {
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
            <strong>3.5 hours</strong> from Sacramento (SMF). Drive CA-299 to Burney Falls SP. 
            Park at trailhead ($10/day, confirm extended parking with park office).
          </p>
          <a href="tel:5303352777" className="contact-link">
            📞 Call Burney Falls SP: (530) 335-2777
          </a>
        </div>

        <div className="summary-card">
          <h4>⚠️ Public Transit: Limited Weekday Service</h4>
          <p>
            Amtrak to Redding → RABA bus to Burney → Taxi to trailhead. 
            <strong>RABA Route 5 runs Mon-Fri only.</strong> Plan accordingly.
          </p>
        </div>
      </div>

      {/* Public Transit Routes */}
      <div className="transit-routes-section">
        <h4>🚆 Public Transit Options</h4>
        <div className="route-list">
          {transitRoutes.map((route) => (
            <div key={route.id} className="route-card">
              <div className="route-header">
                <span className="route-icon">{route.emoji}</span>
                <div className="route-title">
                  <strong>{route.name}</strong>
                  <span className="route-agency">{route.agency}</span>
                </div>
              </div>

              <div className="route-details">
                <div className="route-info">
                  <span>🕐 {route.frequency}</span>
                  {route.cost && <span>💰 {route.cost}</span>}
                  {route.distance && <span>📍 {route.distance}</span>}
                </div>
                
                <div className="route-stops">
                  <strong>Stops:</strong> {route.stops.join(' → ')}
                </div>

                <p className="route-notes">{route.notes}</p>

                <a 
                  href={route.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="route-link"
                >
                  View Schedule →
                </a>
              </div>
            </div>
          ))}
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
              className={`airport-card ${airport.recommended ? 'recommended' : ''}`}
            >
              <div className="airport-header">
                <strong>{airport.code} - {airport.name}</strong>
                {airport.recommended && <span className="rec-badge">✅ Recommended</span>}
              </div>
              <p className="airport-distance">📍 {airport.distanceToBurney}</p>
              <p className="airport-agencies">
                🚗 Agencies: {airport.rentalAgencies.join(', ')}
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
                    <span key={sidx} className="service-tag">{service}</span>
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
        
        <details className="plan-accordion">
          <summary>From Sacramento (Public Transit)</summary>
          <div className="plan-content">
            {(() => {
              const plan = getTransitPlan('Sacramento');
              return (
                <>
                  <div className="plan-stats">
                    <span>⏱️ {plan.duration}</span>
                    <span>💰 ~{plan.cost}</span>
                  </div>
                  <ol className="plan-steps">
                    {plan.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                  <p className="plan-notes">📝 {plan.notes}</p>
                </>
              );
            })()}
          </div>
        </details>

        <details className="plan-accordion">
          <summary>From San Francisco (Public Transit)</summary>
          <div className="plan-content">
            {(() => {
              const plan = getTransitPlan('San Francisco');
              return (
                <>
                  <div className="plan-stats">
                    <span>⏱️ {plan.duration}</span>
                    <span>💰 ~{plan.cost}</span>
                  </div>
                  <ol className="plan-steps">
                    {plan.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                  <p className="plan-notes">📝 {plan.notes}</p>
                </>
              );
            })()}
          </div>
        </details>

        <details className="plan-accordion" open>
          <summary>Rental Car (Recommended)</summary>
          <div className="plan-content">
            {(() => {
              const plan = getTransitPlan('Rental Car');
              return (
                <>
                  <div className="plan-stats">
                    <span>⏱️ {plan.duration}</span>
                    <span>💰 ~{plan.cost}</span>
                  </div>
                  <ol className="plan-steps">
                    {plan.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                  <p className="plan-notes">📝 {plan.notes}</p>
                </>
              );
            })()}
          </div>
        </details>
      </div>

      {/* Important Notes */}
      <div className="transit-notes">
        <h4>⚠️ Important Notes</h4>
        <ul>
          <li><strong>RABA weekday-only service:</strong> Route 5 to Burney does not operate Saturdays or Sundays. Plan travel days accordingly.</li>
          <li><strong>Last-mile problem:</strong> All public transit stops 1-5 miles from trailheads. Budget for taxi/Uber (~$15-30) or arrange trail angel pickup.</li>
          <li><strong>Cell service limited:</strong> Book rides in advance. Don't rely on hailing Uber from the trail.</li>
          <li><strong>Extended parking:</strong> Always call ahead to confirm multi-day parking policies. Some parks have 72-hour limits.</li>
        </ul>
      </div>

      {/* Data Attribution */}
      <div className="panel-footer">
        <p className="data-sources">
          Transit data methodology adapted from <strong>nst.guide</strong> (routes within 1km of trail)
        </p>
      </div>
    </div>
  );
}

TransitPanel.propTypes = {};

export default TransitPanel;
