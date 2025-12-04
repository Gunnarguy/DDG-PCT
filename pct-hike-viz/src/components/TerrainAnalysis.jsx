import PropTypes from 'prop-types';
import { slopeCategories, sectionOTerrainProfile, terrainHazards, getDayTerrainSummary } from '../data/slopeData';
import '../styles/TerrainAnalysis.css';

/**
 * Terrain difficulty analysis with slope-angle breakdown
 * Inspired by nst.guide slope shading + CalTopo methodology
 */
function TerrainAnalysis({ selectedDay = null }) {
  const renderDayProfile = (dayNum) => {
    const summary = getDayTerrainSummary(dayNum);
    if (!summary) return null;

    return (
      <div key={dayNum} className="day-terrain-card">
        <div className="day-terrain-header">
          <h4>
            {summary.categoryEmoji} Day {dayNum} Terrain
          </h4>
          <span className="difficulty-badge" data-difficulty={summary.difficulty.toLowerCase().replace(' ', '-')}>
            {summary.difficulty}
          </span>
        </div>

        <div className="terrain-stats">
          <div className="stat">
            <span className="stat-label">Distance</span>
            <span className="stat-value">{summary.distance} mi</span>
          </div>
          <div className="stat">
            <span className="stat-label">Gain</span>
            <span className="stat-value">+{summary.elevationGain.toLocaleString()}ft</span>
          </div>
          <div className="stat">
            <span className="stat-label">Loss</span>
            <span className="stat-value">−{Math.abs(summary.elevationLoss).toLocaleString()}ft</span>
          </div>
          <div className="stat">
            <span className="stat-label">Max Grade</span>
            <span className="stat-value">{summary.maxGrade}°</span>
          </div>
        </div>

        {/* Terrain difficulty breakdown bar */}
        <div className="terrain-breakdown">
          <div className="breakdown-label">Terrain Mix:</div>
          <div className="breakdown-bar">
            {summary.terrainBreakdown.easy > 0 && (
              <div 
                className="breakdown-segment easy"
                style={{ width: `${summary.terrainBreakdown.easy}%` }}
                title={`${summary.terrainBreakdown.easy.toFixed(0)}% Easy (0-15°)`}
              />
            )}
            {summary.terrainBreakdown.moderate > 0 && (
              <div 
                className="breakdown-segment moderate"
                style={{ width: `${summary.terrainBreakdown.moderate}%` }}
                title={`${summary.terrainBreakdown.moderate.toFixed(0)}% Moderate (15-25°)`}
              />
            )}
            {summary.terrainBreakdown.steep > 0 && (
              <div 
                className="breakdown-segment steep"
                style={{ width: `${summary.terrainBreakdown.steep}%` }}
                title={`${summary.terrainBreakdown.steep.toFixed(0)}% Steep (25-35°)`}
              />
            )}
            {summary.terrainBreakdown.verysteep > 0 && (
              <div 
                className="breakdown-segment verysteep"
                style={{ width: `${summary.terrainBreakdown.verysteep}%` }}
                title={`${summary.terrainBreakdown.verysteep.toFixed(0)}% Very Steep (35°+)`}
              />
            )}
          </div>
        </div>

        <p className="terrain-notes">{summary.notes}</p>
        
        <div className="estimated-time">
          ⏱️ Estimated time: <strong>{summary.estimatedTime}</strong> (moving time only)
        </div>
      </div>
    );
  };

  return (
    <div className="terrain-analysis">
      <div className="analysis-header">
        <h3>⛰️ Terrain Difficulty Analysis</h3>
        <p className="analysis-subtitle">
          Slope-angle breakdown based on GPS elevation profile
        </p>
      </div>

      {/* Slope angle legend (CalTopo-style) */}
      <div className="slope-legend">
        <h4>Slope Angle Guide</h4>
        <div className="legend-items">
          {slopeCategories.map((category, idx) => (
            <div key={idx} className="legend-item">
              <span 
                className="color-swatch"
                style={{ backgroundColor: category.color }}
              />
              <div className="legend-details">
                <strong>{category.emoji} {category.range}</strong>
                <span className="legend-description">{category.description}</span>
                <span className="legend-speed">Pace: ~{category.hikingSpeed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day-by-day terrain profiles */}
      <div className="day-profiles">
        <h4>Daily Terrain Breakdown</h4>
        {selectedDay ? (
          renderDayProfile(selectedDay)
        ) : (
          Object.keys(sectionOTerrainProfile).map((key) => {
            const dayNum = parseInt(key.replace('day', ''));
            return renderDayProfile(dayNum);
          })
        )}
      </div>

      {/* Terrain hazards callout */}
      <div className="terrain-hazards">
        <h4>⚠️ Key Terrain Hazards</h4>
        <div className="hazard-list">
          {terrainHazards.map((hazard, idx) => (
            <div key={idx} className="hazard-card">
              <div className="hazard-location">
                <strong>📍 {hazard.location}</strong>
              </div>
              <div className="hazard-concern">
                ⚠️ <strong>Concern:</strong> {hazard.concern}
              </div>
              <div className="hazard-mitigation">
                ✅ <strong>Mitigation:</strong> {hazard.mitigation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall difficulty summary */}
      <div className="difficulty-summary">
        <h4>Overall Difficulty Assessment</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Easiest Day</span>
            <span className="summary-value">🟢 Day 3 (Rolling terrain)</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Hardest Day</span>
            <span className="summary-value">🔴 Day 5 (2,531ft gain)</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Most Technical</span>
            <span className="summary-value">🟣 Castle Crags (32-35° granite)</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Elevation</span>
            <span className="summary-value">+6,419ft / −6,360ft</span>
          </div>
        </div>
      </div>

      {/* Gear recommendations based on terrain */}
      <div className="terrain-gear-tips">
        <h4>🎒 Terrain-Specific Gear Recommendations</h4>
        <ul>
          <li><strong>Trekking poles (essential):</strong> Days 5-6 have sustained 25-30° grades. Poles reduce knee stress by 25%.</li>
          <li><strong>Knee braces/compression:</strong> Day 6 is 2,552ft descent. Protect your knees early.</li>
          <li><strong>Extra traction:</strong> Granite sections can be slippery when wet. Consider Microspikes if late season.</li>
          <li><strong>Hand protection:</strong> Scrambling on Castle Crags may require handholds. Light gloves useful.</li>
        </ul>
      </div>

      {/* Data attribution */}
      <div className="analysis-footer">
        <p className="data-note">
          Analysis based on USGS-validated GPS elevation data. 
          Slope methodology adapted from <strong>nst.guide</strong> + CalTopo.
        </p>
      </div>
    </div>
  );
}

TerrainAnalysis.propTypes = {
  selectedDay: PropTypes.number
};

export default TerrainAnalysis;
