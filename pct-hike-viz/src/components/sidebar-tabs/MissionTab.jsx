import PropTypes from 'prop-types';

function MissionTab({
  basePlanMiles,
  blackoutMiles,
  ddgTeam,
  fullSectionMiles,
  sectionOMeta,
  selectedItinerary,
  stats,
  tripStats,
}) {
  return (
    <>
      {/* Hero Card - Streamlined mission overview */}
      <section className="sidebar-card sidebar-card--full hero-card">
        <p className="eyebrow">
          PCT {sectionOMeta.name} · Mile {sectionOMeta.pctMileStart} →{" "}
          {sectionOMeta.pctMileEnd}
        </p>
        <h1>DDG Trail Mission Control</h1>
        <p className="lede">
          {basePlanMiles} miles through {sectionOMeta.region}.{" "}
          {tripStats.hikingDays} days of hiking with
          {blackoutMiles}+ miles of satellite-only coverage.
        </p>

        {/* Section O Quick Facts - Condensed */}
        <div className="section-o-facts">
          <div className="fact-grid">
            <div className="fact-item">
              <span className="fact-label">Distance</span>
              <span className="fact-value">{basePlanMiles} mi</span>
            </div>
            <div className="fact-item">
              <span className="fact-label">Elevation</span>
              <span className="fact-value">
                +{(stats?.totalGain ?? tripStats.totalGain).toLocaleString()}'
              </span>
            </div>
            <div className="fact-item">
              <span className="fact-label">High Point</span>
              <span className="fact-value">
                {(
                  stats?.highPoint?.elevation ?? tripStats.highPoint.elevation
                ).toLocaleString()}
                '
              </span>
            </div>
            <div className="fact-item">
              <span className="fact-label">Permits</span>
              <span className="fact-value">Self-issue</span>
            </div>
          </div>
        </div>
        {fullSectionMiles && (
          <p className="note">
            Optional extension: Dunsmuir brings total to ~{fullSectionMiles}{" "}
            miles. Base plan stays Burney → Castle Crags.
          </p>
        )}
      </section>

      {/* Quick Reference - Emergency contacts and key info */}
      <section className="sidebar-card sidebar-card--full quick-ref-card">
        <div className="section-header">
          <h2>🚨 Quick Reference</h2>
          <span className="section-subtitle">
            Emergency contacts & key info
          </span>
        </div>
        <div className="quick-ref-grid">
          <div className="quick-ref-item">
            <span className="ref-icon">📞</span>
            <div className="ref-content">
              <span className="ref-label">Mt. Shasta Taxi</span>
              <a href="tel:+15306057950" className="ref-value ref-phone">
                +1 530-605-7950
              </a>
            </div>
          </div>
          <div className="quick-ref-item">
            <span className="ref-icon">🏕️</span>
            <div className="ref-content">
              <span className="ref-label">Burney Falls SP</span>
              <a href="tel:+15303352777" className="ref-value ref-phone">
                +1 530-335-2777
              </a>
            </div>
          </div>
          <div className="quick-ref-item">
            <span className="ref-icon">🌲</span>
            <div className="ref-content">
              <span className="ref-label">Castle Crags SP</span>
              <a href="tel:+15302354630" className="ref-value ref-phone">
                +1 530-235-4630
              </a>
            </div>
          </div>
          <div className="quick-ref-item">
            <span className="ref-icon">📡</span>
            <div className="ref-content">
              <span className="ref-label">Satellite Backup</span>
              <span className="ref-value">InReach + iPhone 16</span>
            </div>
          </div>
        </div>
        <div className="quick-ref-dates">
          <span className="date-badge">📅 {selectedItinerary === "express" ? "Aug 29 – Sept 6" : "Aug 22 – Sept 6"}</span>
          <span className="date-note">{selectedItinerary === "express" ? "9-day express schedule" : "16-day relaxed schedule"}</span>
        </div>
      </section>

      {/* DDG Team Cards - Compact version */}
      <section className="sidebar-card sidebar-card--full ddg-team-section">
        <div className="section-header">
          <h2>The DDG Crew</h2>
          <span className="section-subtitle">Two generations, one trail</span>
        </div>
        <div className="ddg-team-compact">
          {ddgTeam.map((member) => (
            <div
              key={member.id}
              className="ddg-member-compact"
              style={{ "--member-color": member.color }}
            >
              <span className="member-avatar-sm">{member.emoji}</span>
              <div className="member-details">
                <span className="member-name">{member.name}</span>
                <span className="member-role-sm">{member.role}</span>
              </div>
              <div className="member-tags">
                {member.responsibilities.slice(0, 2).map((r, i) => (
                  <span key={i} className="tag-mini">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Route Highlights - Key trail features */}
      <section className="sidebar-card sidebar-card--full highlights-card">
        <div className="section-header">
          <h2>🎯 Route Highlights</h2>
          <span className="section-subtitle">Don't miss these</span>
        </div>
        <div className="highlights-list">
          <div className="highlight-item">
            <span className="highlight-icon">🌊</span>
            <div className="highlight-content">
              <span className="highlight-title">Burney Falls</span>
              <span className="highlight-desc">
                "The 8th Wonder of the World" - Day 0 staging
              </span>
            </div>
          </div>
          <div className="highlight-item">
            <span className="highlight-icon">🌌</span>
            <div className="highlight-content">
              <span className="highlight-title">Black Rock Camp</span>
              <span className="highlight-desc">
                Famous stargazing clearings - Day 2
              </span>
            </div>
          </div>
          <div className="highlight-item">
            <span className="highlight-icon">🏔️</span>
            <div className="highlight-content">
              <span className="highlight-title">Castle Crags Vista</span>
              <span className="highlight-desc">
                Sunrise at 5,642' with Shasta views - Day 5
              </span>
            </div>
          </div>
          <div className="highlight-item">
            <span className="highlight-icon">🪨</span>
            <div className="highlight-content">
              <span className="highlight-title">Granite Spires</span>
              <span className="highlight-desc">
                Castle Crags' iconic formations - Days 5-6
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Critical Alerts - What to watch */}
      <section className="sidebar-card sidebar-card--full alerts-card">
        <div className="section-header">
          <h2>⚠️ Critical Alerts</h2>
          <span className="section-subtitle">Know before you go</span>
        </div>
        <div className="alerts-list">
          <div className="alert-item alert-warning">
            <span className="alert-icon">📶</span>
            <div className="alert-content">
              <span className="alert-title">Cell Blackout Zone</span>
              <span className="alert-desc">
                {blackoutMiles}+ miles with zero cell service. Satellite
                required.
              </span>
            </div>
          </div>
          <div className="alert-item alert-info">
            <span className="alert-icon">⛰️</span>
            <div className="alert-content">
              <span className="alert-title">Elevation Notice</span>
              <span className="alert-desc">
                Days 2-5 are at 5,000-5,600ft—pace accordingly and hydrate.
              </span>
            </div>
          </div>
          <div className="alert-item alert-info">
            <span className="alert-icon">🔥</span>
            <div className="alert-content">
              <span className="alert-title">Fire Permit Required</span>
              <span className="alert-desc">
                CA campfire permit needed for all stove use. Each hiker needs
                their own.
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

MissionTab.propTypes = {
  basePlanMiles: PropTypes.number.isRequired,
  blackoutMiles: PropTypes.number.isRequired,
  ddgTeam: PropTypes.array.isRequired,
  fullSectionMiles: PropTypes.number,
  sectionOMeta: PropTypes.object.isRequired,
  selectedItinerary: PropTypes.string,
  stats: PropTypes.object,
  tripStats: PropTypes.object.isRequired,
};

export default MissionTab;
