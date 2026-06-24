import PropTypes from 'prop-types';

const getGradientColor = (gradient) => {
  switch (gradient) {
    case "easy":
      return "#4CAF50";
    case "moderate":
      return "#FFC107";
    case "steep":
      return "#FF9800";
    case "brutal":
      return "#F44336";
    default:
      return "#9E9E9E";
  }
};

function ItineraryTab({
  basePlanMiles,
  blackoutMiles,
  campPoints,
  ddgTeam,
  onSelectPoint,
  setPopupInfo,
  stats,
  tripStats,
  waterSourceMeta,
  waterSources,
}) {
  return (
    <>
      {/* Trip Stats Overview */}
      <section className="sidebar-card sidebar-card--full trip-stats-card">
        <div className="section-header">
          <div className="trip-stats-title-row">
            <div className="ddg-avatars-mini">
              {ddgTeam.map((m) => (
                <span
                  key={m.id}
                  className="ddg-avatar-mini"
                  style={{ backgroundColor: m.color }}
                  title={m.name}
                >
                  {m.emoji}
                </span>
              ))}
            </div>
            <div>
              <h2>DDG Section O Mission</h2>
              <span className="section-subtitle">
                Burney Falls → Castle Crags · {basePlanMiles} miles
              </span>
            </div>
          </div>
        </div>

        <div className="trip-stats-grid">
          <div className="trip-stat">
            <span className="stat-value">{campPoints.length > 0 ? campPoints[campPoints.length - 1].properties.day : 0}</span>
            <span className="stat-label">Days Hiking</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">{basePlanMiles}</span>
            <span className="stat-label">Total Miles</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">
              {(
                (basePlanMiles || tripStats.totalMiles) / (campPoints.length > 0 ? campPoints[campPoints.length - 1].properties.day : 1)
              ).toFixed(1)}
            </span>
            <span className="stat-label">Avg/Day</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">
              {((stats?.totalGain ?? tripStats.totalGain) / 1000).toFixed(1)}k
            </span>
            <span className="stat-label">Elev Gain</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">
              {(
                stats?.highPoint?.elevation ?? tripStats.highPoint.elevation
              ).toLocaleString()}
              '
            </span>
            <span className="stat-label">High Point</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">
              {stats?.waterSourceCount ?? tripStats.waterSourceCount}
            </span>
            <span className="stat-label">Water Sources</span>
          </div>
        </div>

        <div className="trip-connectivity-warning">
          <span className="warning-icon">📵</span>
          <span>
            {blackoutMiles}+ miles with zero cell service — satellite comms
            required
          </span>
        </div>
      </section>

      {/* Day-by-Day Detailed Cards */}
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Day-by-day plan</h2>
          <span className="section-subtitle">
            Tap cards to fly to location on map
          </span>
        </div>
        <div className="itinerary-list itinerary-list--detailed">
          {campPoints.slice(1).map((camp, idx) => {
            const day = camp.properties.day;
            const prevCamp = campPoints[idx];
            const dist = camp.properties.mile - prevCamp.properties.mile;
            return (
              <button
                type="button"
                key={day}
                className="day-card day-card--detailed"
                onClick={() => onSelectPoint(day)}
              >
                <div className="day-card__header">
                  <div className="day-card__day-info">
                    <span className="day-pill" style={{ backgroundColor: getGradientColor(dist > 12 ? "hard" : "moderate") }}>
                      Day {day}
                    </span>
                  </div>
                  <div className="day-card__distance">
                    <span className="distance-value">{dist.toFixed(1)}</span>
                    <span className="distance-unit">mi</span>
                  </div>
                </div>
                <h3 className="day-card__route">
                  {prevCamp.properties.name} → {camp.properties.name}
                </h3>
                <p className="day-card__terrain">PCT segment through Section O</p>
                <div className="day-card__indicators">
                  <span className="indicator-chip indicator-water" title="Water sources">
                    💧 Check water map
                  </span>
                </div>
                <p className="day-card__notes">{camp.properties.segment}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Water Sources - tap to show on map */}
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>💧 Water Sources</h2>
          <span className="section-subtitle">
            {waterSourceMeta.count} reliable sources ·{" "}
            {waterSourceMeta.mileRange}
          </span>
        </div>
        <div className="water-list">
          {waterSources.map((source) => (
            <button
              type="button"
              key={source.waypoint || source.mile}
              className="water-item"
              onClick={() => setPopupInfo(source)}
            >
              <div className="water-item__meta">
                <span className="water-icon">💧</span>
                <span className="mile-marker">Mile {source.mile}</span>
              </div>
              <h4>{source.name}</h4>
              <p className="note">{source.report}</p>
            </button>
          ))}
        </div>
        <p className="note water-source-note">
          Synced from {waterSourceMeta.sourceLabel}; last checked{" "}
          {waterSourceMeta.lastSynced}. Tap a source to drop the 💧 marker on
          the map.
        </p>
      </section>
    </>
  );
}

ItineraryTab.propTypes = {
  basePlanMiles: PropTypes.number.isRequired,
  blackoutMiles: PropTypes.number.isRequired,
  campPoints: PropTypes.array.isRequired,
  ddgTeam: PropTypes.array.isRequired,
  onSelectPoint: PropTypes.func.isRequired,
  setPopupInfo: PropTypes.func.isRequired,
  stats: PropTypes.object,
  tripStats: PropTypes.object.isRequired,
  waterSourceMeta: PropTypes.object.isRequired,
  waterSources: PropTypes.array.isRequired,
};

export default ItineraryTab;
