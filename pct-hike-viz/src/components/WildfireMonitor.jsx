import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { fetchWildfires, fetchAirQuality, getAQIInfo, assessHikingSafety } from '../services/wildfireService';
import '../styles/WildfireMonitor.css';

/**
 * Real-time wildfire and air quality monitoring panel
 * Updates every 4 hours to match nst.guide refresh cadence
 */
function WildfireMonitor() {
  const [wildfireData, setWildfireData] = useState({ fires: [], timestamp: null, count: 0 });
  const [airQualityData, setAirQualityData] = useState({ readings: [], timestamp: null });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fires, airQuality] = await Promise.all([
        fetchWildfires(),
        fetchAirQuality()
      ]);
      
      setWildfireData(fires);
      setAirQualityData(airQuality);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load wildfire/AQ data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 4 hours
    if (autoRefresh) {
      const interval = setInterval(loadData, 4 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const safety = assessHikingSafety(wildfireData, airQualityData);
  
  return (
    <div className="wildfire-monitor">
      <div className="monitor-header">
        <h3>🔥 Fire & Air Quality Monitor</h3>
        <div className="monitor-controls">
          <button 
            onClick={loadData} 
            disabled={loading}
            className="refresh-btn"
            title="Refresh data"
          >
            {loading ? '⟳' : '↻'}
          </button>
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh (4hr)</span>
          </label>
        </div>
      </div>

      {lastUpdate && (
        <p className="last-update">
          Last updated: {lastUpdate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </p>
      )}

      {/* Safety Assessment */}
      <div className={`safety-assessment ${safety.safe ? 'safe' : 'warning'}`}>
        <div className="safety-header">
          <span className="safety-icon">{safety.safe ? '✅' : '⚠️'}</span>
          <strong>{safety.safe ? 'Conditions Favorable' : 'Caution Advised'}</strong>
        </div>
        
        {safety.warnings.length > 0 && (
          <div className="warnings">
            <h4>⚠️ Active Concerns:</h4>
            <ul>
              {safety.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="recommendations">
          <h4>📋 Recommendations:</h4>
          <ul>
            {safety.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Active Wildfires */}
      <div className="wildfire-section">
        <h4>🔥 Active Wildfires Near Trail</h4>
        {wildfireData.fires.length === 0 ? (
          <p className="no-fires">✅ No active fires within monitoring area</p>
        ) : (
          <div className="fire-list">
            {wildfireData.fires.map((fire, idx) => (
              <div key={idx} className="fire-card">
                <div className="fire-header">
                  <strong>{fire.name}</strong>
                  {fire.distanceToTrail && (
                    <span className="distance-badge">
                      {fire.distanceToTrail} mi from trail
                    </span>
                  )}
                </div>
                <div className="fire-details">
                  <span>🔥 {fire.acres.toLocaleString()} acres</span>
                  <span>📊 {fire.containment}% contained</span>
                  {fire.state && <span>📍 {fire.state}</span>}
                </div>
                {fire.discovered && (
                  <p className="fire-date">
                    Discovered: {new Date(fire.discovered).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Air Quality Readings */}
      <div className="air-quality-section">
        <h4>💨 Air Quality Index (AQI)</h4>
        <div className="aqi-grid">
          {airQualityData.readings.map((reading, idx) => {
            const aqiInfo = getAQIInfo(reading.aqi);
            return (
              <div key={idx} className="aqi-card">
                <div className="aqi-location">{reading.location}</div>
                {reading.aqi !== null ? (
                  <>
                    <div 
                      className="aqi-value"
                      style={{ color: aqiInfo.color }}
                    >
                      {aqiInfo.emoji} {reading.aqi}
                    </div>
                    <div className="aqi-category">{aqiInfo.category}</div>
                    {reading.pm25 && <div className="aqi-detail">PM2.5: {reading.pm25}</div>}
                  </>
                ) : (
                  <div className="aqi-unavailable">Data unavailable</div>
                )}
              </div>
            );
          })}
        </div>
        
        {airQualityData.note && (
          <p className="aqi-note">ℹ️ {airQualityData.note}</p>
        )}
      </div>

      {/* AQI Legend */}
      <div className="aqi-legend">
        <h5>AQI Scale:</h5>
        <div className="legend-grid">
          <span style={{ color: '#00E400' }}>✅ 0-50: Good</span>
          <span style={{ color: '#FFFF00' }}>⚠️ 51-100: Moderate</span>
          <span style={{ color: '#FF7E00' }}>🟠 101-150: Unhealthy (sensitive)</span>
          <span style={{ color: '#FF0000' }}>🔴 151-200: Unhealthy</span>
          <span style={{ color: '#8F3F97' }}>🟣 201-300: Very Unhealthy</span>
          <span style={{ color: '#7E0023' }}>☠️ 300+: Hazardous</span>
        </div>
      </div>

      {/* Data Sources */}
      <div className="monitor-footer">
        <p className="data-sources">
          Data: NIFC Active Fire Perimeters · EPA AirNow API
        </p>
        <p className="monitoring-note">
          ⏰ Automatic updates every 4 hours (matching nst.guide methodology)
        </p>
      </div>
    </div>
  );
}

WildfireMonitor.propTypes = {};

export default WildfireMonitor;
