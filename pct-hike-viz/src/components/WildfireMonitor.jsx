import { useState, useEffect } from 'react';
import { getAQIInfo, assessHikingSafety } from '../services/wildfireService';
import { fetchTrailConditions } from '../services/trailConditionsService';
import '../styles/WildfireMonitor.css';

/**
 * Unified route-condition monitor backed by a daily Supabase snapshot.
 * Open clients use a four-hour cache and can request an authenticated refresh.
 */
function WildfireMonitor() {
  const [conditions, setConditions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      setConditions(await fetchTrailConditions({ force }));
    } catch (error) {
      console.error('Failed to load trail conditions:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
    
    // Auto-refresh every 4 hours
    if (autoRefresh) {
      const interval = setInterval(() => loadData(false), 4 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const wildfireData = conditions?.wildfire ?? { fires: [], count: 0, unavailable: true };
  const airQualityData = conditions?.airQuality ?? { readings: [] };
  const safety = assessHikingSafety(wildfireData, airQualityData);
  const manualChecks = Object.entries(conditions?.sourceStatus ?? {})
    .filter(([, source]) => source.status === 'manual_required');
  const failedSources = Object.entries(conditions?.sourceStatus ?? {})
    .filter(([, source]) => source.status === 'error');
  const overallReady =
    safety.safe && manualChecks.length === 0 && failedSources.length === 0;
  const statusLabel = (key) => ({
    pctWater: 'PCT Water Report',
    nifcFirePerimeters: 'Wildfire incidents / perimeters',
    smokeAqi: 'Smoke / AQI model',
    shastaTrinityAlerts: 'Shasta-Trinity alerts',
    lassenAlerts: 'Lassen alerts',
    burneyPark: 'Burney Falls park',
    burneyClosures: 'State Parks closures',
    pctaClosures: 'PCTA closure map',
    campsiteAvailability: 'Campsite availability',
    lakeBrittonBridge: 'Lake Britton crossing',
    backend: 'Daily backend',
  }[key] || key);
  
  return (
    <div className="wildfire-monitor">
      <div className="monitor-header">
        <h3>🛰️ Daily Trail Conditions</h3>
        <div className="monitor-controls">
          <button 
            onClick={() => loadData(true)}
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

      {conditions?.fetchedAt && (
        <p className="last-update">
          Snapshot checked: {new Date(conditions.fetchedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </p>
      )}

      {error && <p className="condition-error">Refresh failed: {error}</p>}

      <div className={`safety-assessment ${overallReady ? 'safe' : 'warning'}`}>
        <div className="safety-header">
          <span className="safety-icon">{overallReady ? '✅' : '⚠️'}</span>
          <strong>
            {overallReady
              ? 'Automated sources checked'
              : 'Not fully cleared — review checks below'}
          </strong>
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
            {manualChecks.length > 0 && (
              <li>
                Complete {manualChecks.length} manual verification
                {manualChecks.length === 1 ? '' : 's'} before the go/no-go decision.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="condition-section">
        <h4>Verification status</h4>
        <div className="source-status-grid">
          {Object.entries(conditions?.sourceStatus ?? {}).map(([key, source]) => (
            <a
              className={`source-status source-status--${source.status}`}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              key={key}
            >
              <strong>{statusLabel(key)}</strong>
              <span>
                {source.status === 'live'
                  ? 'Live source read'
                  : source.status === 'manual_required'
                    ? 'Manual check required'
                    : 'Source unavailable'}
              </span>
              {source.detail && <small>{source.detail}</small>}
            </a>
          ))}
        </div>
        <p className="truth-note">
          “Live source read” means the source responded; it does not certify that
          the trail, crossing, campsite, or water is safe. A blocked or missing
          official feed is never converted into a green status.
        </p>
      </div>

      <div className="condition-section">
        <h4>💧 Current PCT Water Report · route miles 1420–1473</h4>
        <p className="condition-meta">
          {conditions?.water?.updatedText || 'Report update time unavailable'} ·{' '}
          {conditions?.water?.count ?? 0} entries in the active corridor
        </p>
        {conditions?.water?.sources?.length ? (
          <div className="water-condition-list">
            {conditions.water.sources.map((source) => (
              <article className={`water-condition water-condition--${source.condition}`} key={`${source.mile}-${source.name}`}>
                <div>
                  <strong>Mile {source.mile.toFixed(1)} · {source.name}</strong>
                  <span className="condition-badge">{source.condition}</span>
                </div>
                <p>{source.latestReport}</p>
                <small>
                  {source.reportDate ? `Reported ${source.reportDate}` : 'No report date'}
                  {source.reportedBy ? ` by ${source.reportedBy}` : ''}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p className="condition-unavailable">
            No live water rows are available. Use the offline map only for
            locations, not flow.
          </p>
        )}
      </div>

      <div className="condition-section">
        <h4>🚧 Closures, bridge, fire restrictions & agency alerts</h4>
        <div className="bridge-check">
          <strong>Lake Britton / Pit River crossing</strong>
          <span>Manual official confirmation required</span>
          {conditions?.bridgeCrossing?.reports?.map((report) => (
            <p key={`${report.mile}-${report.name}`}>
              Water report mile {report.mile}: {report.latestReport}
            </p>
          ))}
        </div>
        <p className="truth-note">
          Forest alert pages include forest-wide orders and can also contain
          named closures outside this 54.2-mile corridor. Treat each extracted
          item as a review lead; open the source and confirm its map/order
          boundaries before changing the itinerary.
        </p>
        {conditions?.agencyAlerts?.length ? (
          <div className="agency-alert-list">
            {conditions.agencyAlerts.map((alert, index) => (
              <a href={alert.url} target="_blank" rel="noreferrer" key={`${alert.agency}-${index}`}>
                <strong>{alert.agency}</strong>
                <span>{alert.text}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="condition-unavailable">
            No relevant agency text was extracted. This is not an all-clear;
            use the official links in Verification status.
          </p>
        )}
      </div>

      {/* Active Wildfires */}
      <div className="wildfire-section">
        <h4>🔥 Active Wildfires Near Trail</h4>
        {wildfireData.unavailable ? (
          <p className="condition-unavailable">NIFC data unavailable — status unknown</p>
        ) : wildfireData.fires.length === 0 ? (
          <p className="no-fires">
            No current fire incidents are mapped inside the route monitoring box
          </p>
        ) : (
          <div className="fire-list">
            {wildfireData.fires.map((fire, idx) => (
              <div key={idx} className="fire-card">
                <div className="fire-header">
                  <strong>{fire.name}</strong>
                  {Number.isFinite(fire.distanceToTrail) ? (
                    <span className="distance-badge">
                      {fire.distanceToTrail} mi from trail
                    </span>
                  ) : fire.inMonitoringArea ? (
                    <span className="distance-badge">route monitoring area</span>
                  ) : null}
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
                    {reading.pm25 !== null && reading.pm25 !== undefined && (
                      <div className="aqi-detail">
                        PM2.5: {reading.pm25} {reading.pm25Unit || ""}
                      </div>
                    )}
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
          Data: PCT Water Report · NIFC · Open-Meteo CAMS · USFS · California
          State Parks · PCTA official links
        </p>
        <p className="monitoring-note">
          ⏰ Supabase saves one server snapshot daily; open apps check a
          four-hour cache and can refresh on demand
        </p>
      </div>
    </div>
  );
}

export default WildfireMonitor;
