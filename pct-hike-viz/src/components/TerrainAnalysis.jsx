import PropTypes from "prop-types";
import {
  slopeCategories,
  sectionOTerrainProfile,
  terrainGradeMethod,
  terrainHazards,
  getDayTerrainSummary,
} from "../data/slopeData";
import "../styles/TerrainAnalysis.css";

const mixKeys = ["easy", "moderate", "steep", "verySteep"];

function TerrainAnalysis({ selectedDay = null }) {
  const summaries = Object.values(sectionOTerrainProfile);
  const easiestDay = [...summaries].sort(
    (first, second) => first.terrainLoad.effortMiles - second.terrainLoad.effortMiles,
  )[0];
  const hardestDay = [...summaries].sort(
    (first, second) => second.terrainLoad.effortMiles - first.terrainLoad.effortMiles,
  )[0];
  const biggestClimb = [...summaries].sort(
    (first, second) => second.elevationGain - first.elevationGain,
  )[0];
  const biggestDescent = [...summaries].sort(
    (first, second) => second.elevationLoss - first.elevationLoss,
  )[0];

  const renderDayProfile = (dayNum) => {
    const summary = getDayTerrainSummary(dayNum);
    if (!summary) return null;

    return (
      <div key={dayNum} className="day-terrain-card">
        <div className="day-terrain-header">
          <h4>
            {summary.categoryEmoji} Day {dayNum} Terrain
          </h4>
          <span
            className="difficulty-badge"
            data-difficulty={summary.difficulty
              .toLowerCase()
              .replace(/[^a-z]+/g, "-")
              .replace(/^-|-$/g, "")}
          >
            {summary.difficulty}
          </span>
        </div>

        <div className="terrain-stats">
          <div className="stat">
            <span className="stat-label">Distance</span>
            <span className="stat-value">{summary.distance.toFixed(3)} mi</span>
          </div>
          <div className="stat">
            <span className="stat-label">Gain</span>
            <span className="stat-value">+{summary.elevationGain.toLocaleString()} ft</span>
          </div>
          <div className="stat">
            <span className="stat-label">Loss</span>
            <span className="stat-value">−{summary.elevationLoss.toLocaleString()} ft</span>
          </div>
          <div className="stat">
            <span className="stat-label">Max uphill grade</span>
            <span className="stat-value">{summary.maxUphillPercent.toFixed(1)}%</span>
          </div>
          <div className="stat">
            <span className="stat-label">Max downhill grade</span>
            <span className="stat-value">{summary.maxDownhillPercent.toFixed(1)}%</span>
          </div>
          <div className="stat">
            <span className="stat-label">Group time</span>
            <span className="stat-value">{summary.estimatedTime}</span>
          </div>
        </div>

        <div className="terrain-breakdown">
          <div className="breakdown-label">
            Grade mix · {summary.gradeWindowCount} × {terrainGradeMethod.windowMeters}m windows
          </div>
          <div className="breakdown-bar" aria-label={`Day ${dayNum} grade mix`}>
            {mixKeys.map((key) => {
              const mix = summary.terrainBreakdown[key];
              if (!mix?.percent) return null;
              return (
                <div
                  key={key}
                  className={`breakdown-segment ${key === "verySteep" ? "verysteep" : key}`}
                  style={{ width: `${mix.percent}%` }}
                  title={`${mix.percent.toFixed(1)}% ${mix.label}`}
                />
              );
            })}
          </div>
          <p className="note">
            Strongest 100m window: {summary.maxAbsolutePercent.toFixed(1)}%
            {" · "}{summary.maxAbsoluteAngleDegrees.toFixed(1)}° profile angle
          </p>
        </div>

        <p className="terrain-notes">{summary.notes}</p>
      </div>
    );
  };

  return (
    <div className="terrain-analysis">
      <div className="analysis-header">
        <h3>⛰️ Terrain Difficulty Analysis</h3>
        <p className="analysis-subtitle">
          {terrainGradeMethod.windowMeters}m grade windows from the same normalized USGS 3DEP profile as the elevation chart
        </p>
      </div>

      <div className="slope-legend">
        <h4>Planning-grade guide</h4>
        <div className="legend-items">
          {slopeCategories.map((category) => (
            <div key={category.id} className="legend-item">
              <span className="color-swatch" style={{ backgroundColor: category.color }} />
              <div className="legend-details">
                <strong>{category.emoji} {category.range} · {category.label}</strong>
                <span className="legend-description">{category.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="day-profiles">
        <h4>Daily terrain breakdown</h4>
        {selectedDay
          ? renderDayProfile(selectedDay)
          : summaries.map((summary) => renderDayProfile(summary.day))}
      </div>

      <div className="terrain-hazards">
        <h4>⚠️ Key terrain hazards</h4>
        <div className="hazard-list">
          {terrainHazards.map((hazard) => (
            <div key={hazard.location} className="hazard-card">
              <div className="hazard-location"><strong>📍 {hazard.location}</strong></div>
              <div className="hazard-concern">⚠️ <strong>Concern:</strong> {hazard.concern}</div>
              <div className="hazard-mitigation">✅ <strong>Mitigation:</strong> {hazard.mitigation}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="difficulty-summary">
        <h4>Route reality</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Lowest effort load</span>
            <span className="summary-value">🟢 Day {easiestDay.day} ({easiestDay.distance.toFixed(3)} mi)</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Highest effort load</span>
            <span className="summary-value">🔴 Day {hardestDay.day} ({hardestDay.distance.toFixed(3)} {hardestDay.stopType === "support-transfer" ? "supported" : "loaded"} mi)</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Largest climb</span>
            <span className="summary-value">↗ Day {biggestClimb.day} (+{biggestClimb.elevationGain.toLocaleString()} ft)</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Largest descent</span>
            <span className="summary-value">↘ Day {biggestDescent.day} (−{biggestDescent.elevationLoss.toLocaleString()} ft)</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total elevation</span>
            <span className="summary-value">+{terrainGradeMethod.totalGainFeet.toLocaleString()} ft / −{terrainGradeMethod.totalLossFeet.toLocaleString()} ft</span>
          </div>
        </div>
      </div>

      <div className="terrain-gear-tips">
        <h4>🎒 Terrain-specific preparation</h4>
        <ul>
          <li><strong>Trekking poles:</strong> Prioritize them for the long descents; Day {biggestDescent.day} alone loses {biggestDescent.elevationLoss.toLocaleString()} ft.</li>
          <li><strong>Pacing:</strong> Day {biggestClimb.day} has the largest climb (+{biggestClimb.elevationGain.toLocaleString()} ft); Day {hardestDay.day} is the highest effort load.</li>
          <li><strong>Foot care:</strong> Eight consecutive hiking days leave little recovery; treat hotspots early.</li>
          <li><strong>Conditions:</strong> Grade is only one input—brush, heat, smoke, water carry, footing, and current closures can dominate the day.</li>
        </ul>
      </div>

      <div className="analysis-footer">
        <p className="data-note">
          {terrainGradeMethod.method} Cumulative elevation uses the separate continuous 20-foot hysteresis method disclosed above the route chart.
        </p>
      </div>
    </div>
  );
}

TerrainAnalysis.propTypes = {
  selectedDay: PropTypes.number,
};

export default TerrainAnalysis;
