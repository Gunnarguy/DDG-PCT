import PropTypes from 'prop-types';
import { getAQIInfo, assessHikingSafety } from '../services/wildfireService';
import '../styles/WildfireMonitor.css';

/**
 * Unified route-condition monitor backed by a daily Supabase snapshot.
 * Open clients use a four-hour cache and can request an authenticated refresh.
 */
function WildfireMonitor({ conditions, loading, error, onRefresh }) {

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
    weatherForecast: 'Seven-day weather forecast',
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
            onClick={onRefresh}
            disabled={loading}
            className="refresh-btn"
            title="Fetch a new shared trail-condition snapshot"
          >
            {loading ? '⟳' : '↻'}
          </button>
          <span className="monitor-cache-note">Shared map + chart snapshot</span>
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
          {Object.entries(conditions?.sourceStatus ?? {}).map(([key, source]) => {
            const content = (
              <>
                <strong>{statusLabel(key)}</strong>
                <span>
                  {source.status === 'live'
                    ? 'Live source read'
                    : source.status === 'manual_required'
                      ? 'Manual check required'
                      : 'Source unavailable'}
                </span>
                {source.detail && <small>{source.detail}</small>}
              </>
            );
            const className = `source-status source-status--${source.status}`;
            return source.url ? (
              <a
                className={className}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                key={key}
              >
                {content}
              </a>
            ) : (
              <div className={className} key={key}>{content}</div>
            );
          })}
        </div>
        <p className="truth-note">
          “Live source read” means the source responded; it does not certify that
          the trail, crossing, campsite, or water is safe. A blocked or missing
          official feed is never converted into a green status.
        </p>
      </div>

      <div className="condition-section">
        <h4>💧 PCT Water Report · PCTA 1420.653–1472.497</h4>
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
                  {Number.isFinite(source.ageDays) ? ` · ${source.ageDays} day${source.ageDays === 1 ? '' : 's'} old` : ''}
                  {source.freshness ? ` · ${source.freshness}` : ''}
                </small>
                {source.dateConflict && (
                  <small>
                    Date repaired from the latest report text; the sheet’s
                    separate date cell says {source.metadataDate || 'unknown'}.
                  </small>
                )}
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
          named closures outside this 51.844-mile corridor. Treat each extracted
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

      <div className="air-quality-section">
        <h4>🌦️ Seven-Day Corridor Weather</h4>
        <div className="aqi-grid">
          {(conditions?.weather?.locations ?? []).map((location) => {
            const today = location.daily?.[0];
            return (
              <div className="aqi-card" key={location.location}>
                <div className="aqi-location">{location.location}</div>
                <div className="aqi-value">
                  {location.current?.temperatureF == null
                    ? '—'
                    : `${Math.round(location.current.temperatureF)}°F`}
                </div>
                <div className="aqi-category">
                  {today?.minTemperatureF == null || today?.maxTemperatureF == null
                    ? 'Daily range unavailable'
                    : `${Math.round(today.minTemperatureF)}°–${Math.round(today.maxTemperatureF)}°F`}
                </div>
                <div className="aqi-detail">
                  Rain {today?.precipitationProbability ?? '—'}% · gusts{' '}
                  {today?.maxGustMph == null ? '—' : `${Math.round(today.maxGustMph)} mph`}
                </div>
              </div>
            );
          })}
        </div>
        <p className="aqi-note">
          ℹ️ {conditions?.weather?.note || 'Weather forecast unavailable'}
        </p>
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
          Data: PCT Water Report · NIFC · Open-Meteo weather/CAMS · USFS ·
          California State Parks · PCTA official links
        </p>
        <p className="monitoring-note">
          ⏰ Supabase saves one server snapshot daily; this shared snapshot feeds
          the Field panel, map water markers, and elevation-chart water nodes.
        </p>
      </div>
    </div>
  );
}

WildfireMonitor.propTypes = {
  conditions: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRefresh: PropTypes.func,
};

WildfireMonitor.defaultProps = {
  conditions: null,
  loading: false,
  error: null,
  onRefresh: () => {},
};

export default WildfireMonitor;
