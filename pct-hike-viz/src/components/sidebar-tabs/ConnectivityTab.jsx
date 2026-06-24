import PropTypes from 'prop-types';
import { useState } from 'react';
import OpsLog from "../OpsLog";
import {
  connectivityZones,
  getSignalBadgeClass,
  getSignalEmoji,
  satelliteDevices,
} from "../../data/connectivityData";

// Present readable timestamps next to live Apple data refresh events.
const formatTimestamp = (isoString) => {
  if (!isoString) return "pending refresh";
  try {
    return new Date(isoString).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (error) {
    console.debug("Failed to humanize live satellite timestamp.", error);
    return isoString;
  }
};

// Config for each Apple feature surfaced in the sidebar so copy stays centralized.
const SATELLITE_SECTION_CONFIG = [
  {
    key: "emergencySos",
    title: "Emergency SOS via satellite",
    icon: "🚨",
    summary:
      "Hands the call off to Apple relay teams when towers are out of range.",
    coverageKey: "countries",
    coverageLabel: "Where it works today",
  },
  {
    key: "messages",
    title: "Messages via satellite",
    icon: "✉️",
    summary: "Keeps iMessage/SMS alive at 16 Pro Max altitudes without LTE.",
    coverageKey: "coverageNotes",
    coverageLabel: "Availability notes",
  },
  {
    key: "roadside",
    title: "Roadside Assistance via satellite",
    icon: "🛠️",
    summary: "AAA dispatch hand-off for wilderness breakdowns.",
    coverageKey: "coverageNotes",
    coverageLabel: "Coverage partners",
  },
];

const SatelliteSMSGenerator = ({ campPoints }) => {
  const [selectedCheckpointIndex, setSelectedCheckpointIndex] = useState(0);

  const checkpoints = (campPoints || []).map(camp => ({
    name: camp.properties.name || "Unknown Location",
    coord: camp.geometry.coordinates ? `${camp.geometry.coordinates[1].toFixed(4)}, ${camp.geometry.coordinates[0].toFixed(4)}` : "Unknown"
  }));

  const handleCopyStatus = () => {
    const cp = checkpoints[selectedCheckpointIndex];
    if (!cp) return;
    const statusText = `DDG Status: Safe at ${cp.name}. Coord: [${cp.coord}]. Garmin inReach connected. All well.`;
    navigator.clipboard.writeText(statusText)
      .then(() => alert('Status copied to clipboard!'))
      .catch(err => {
        console.error('Failed to copy', err);
        alert('Failed to copy to clipboard.');
      });
  };

  return (
    <section className="sidebar-card sidebar-card--full">
      <div className="section-header">
        <h2>Satellite Status SMS Generator</h2>
        <span className="section-subtitle">Quick-copy templates for inReach messages</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <select
          value={selectedCheckpointIndex}
          onChange={(e) => setSelectedCheckpointIndex(Number(e.target.value))}
          className="rpg-select"
          style={{ flex: 1 }}
        >
          {checkpoints.map((cp, idx) => (
            <option key={idx} value={idx}>{cp.name}</option>
          ))}
        </select>
        <button onClick={handleCopyStatus} className="rpg-btn-add" style={{ padding: '0.5rem 1rem' }}>Copy SMS</button>
      </div>
      <p className="note">Pre-formatted coordinate check-ins to save character limits on satellite plans.</p>
    </section>
  );
};

SatelliteSMSGenerator.propTypes = {
  campPoints: PropTypes.array,
};

function ConnectivityTab({
  activeUserName,
  blackoutMiles,
  campPoints,
  liveSatelliteData,
  liveSatelliteError,
  liveSatelliteStatus,
  setPopupInfo,
  timelineRangeMiles,
}) {

  // Reusable list renderer for hardware and software requirements
  const renderRequirementList = (requirements) => {
    if (!requirements || requirements.length === 0) {
      return <li className="none-found">No requirements data available.</li>;
    }
    return requirements.map((req, i) => (
      <li key={i}>
        <span className="req-icon">✓</span> {req}
      </li>
    ));
  };

  // Reusable list renderer for coverage footprint or partners
  const renderCoverageList = (entries, label) => {
    if (!entries || entries.length === 0) return null;
    return (
      <div className="sat-coverage-block">
        <h4>{label}</h4>
        <p>{entries.join(", ")}</p>
      </div>
    );
  };

  // Dedicated section for Apple Satellite features (live data)
  const renderLiveSatelliteIntel = () => {
    if (liveSatelliteStatus === "error" || liveSatelliteError) {
      return (
        <section className="sidebar-card sidebar-card--full live-intel live-intel--error">
          <div className="section-header">
            <h2>Apple Satellite Intel</h2>
            <span className="status-badge status-badge--error">
              Sync Failed
            </span>
          </div>
          <p className="error-note">
            Could not fetch the latest satellite capability data from Apple.
            <br />
            {liveSatelliteError?.message || "Unknown proxy error occurred."}
          </p>
        </section>
      );
    }

    if (
      liveSatelliteStatus === "loading" ||
      liveSatelliteStatus === "refreshing" ||
      !liveSatelliteData
    ) {
      return (
        <section className="sidebar-card sidebar-card--full live-intel live-intel--loading">
          <div className="section-header">
            <h2>Apple Satellite Intel</h2>
            <span className="status-badge status-badge--loading">
              Syncing...
            </span>
          </div>
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text" />
        </section>
      );
    }

    return (
      <section className="sidebar-card sidebar-card--full live-intel live-intel--success">
        <div className="section-header">
          <h2>Apple Satellite Intel</h2>
          <span className="status-badge status-badge--live">Live Sync</span>
        </div>

        <p className="last-sync">
          Last checked: {formatTimestamp(liveSatelliteData.updatedAt)}
        </p>

        <div className="sat-feature-list">
          {SATELLITE_SECTION_CONFIG.map((config) => {
            const dataNode = liveSatelliteData[config.key];
            if (!dataNode) return null; // Skip if Apple dropped a node from their payload

            return (
              <details key={config.key} className="sat-feature-card">
                <summary className="sat-feature-summary">
                  <span className="feature-icon">{config.icon}</span>
                  <div className="feature-title-block">
                    <h3>{config.title}</h3>
                    <span className="feature-status">
                      {dataNode.status === "active" ? "🟢 Active" : "🔴 Offline"}
                    </span>
                  </div>
                </summary>
                <div className="sat-feature-details">
                  <p className="feature-summary">{config.summary}</p>
                  <div className="req-columns">
                    <div className="req-col">
                      <h4>Hardware Limits</h4>
                      <ul className="req-list">
                        {renderRequirementList(dataNode.requirements?.hardware)}
                      </ul>
                    </div>
                    <div className="req-col">
                      <h4>Software Limits</h4>
                      <ul className="req-list">
                        {renderRequirementList(dataNode.requirements?.software)}
                      </ul>
                    </div>
                  </div>
                  {renderCoverageList(
                    dataNode.coverage?.[config.coverageKey],
                    config.coverageLabel
                  )}
                  {dataNode.coverage?.limitations && (
                    <div className="sat-limitations">
                      <p>
                        <strong>Note:</strong> {dataNode.coverage.limitations}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <>
      <SatelliteSMSGenerator campPoints={campPoints} />

      {/* Mission Control Log */}
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Mission Control Log</h2>
          <span className="section-subtitle">
            Live ops traffic for the DDG crew
          </span>
        </div>
        <OpsLog contextId="general" userName={activeUserName} />
      </section>

      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Tasking Channel</h2>
          <span className="section-subtitle">
            Use /task to flag work and alerts
          </span>
        </div>
        <OpsLog contextId="tasks" userName={activeUserName} />
      </section>

      {/* Live Satellite Intel */}
      {renderLiveSatelliteIntel()}

      {/* Connectivity Timeline Visualization */}
      <section className="sidebar-card sidebar-card--full connectivity-timeline-card">
        <div className="section-header">
          <h2>Signal Timeline</h2>
          <span className="section-subtitle">
            Cell service availability along the route
          </span>
        </div>
        <div className="connectivity-timeline">
          <div className="timeline-track">
            {connectivityZones.map((zone, i) => {
              const nextZone = connectivityZones[i + 1];
              const hasSignal =
                zone.cellCoverage.verizon !== "none" ||
                zone.cellCoverage.att !== "none";
              const segmentWidth =
                nextZone && timelineRangeMiles
                  ? `${
                      ((nextZone.mile - zone.mile) / timelineRangeMiles) * 100
                    }%`
                  : "5%";

              return (
                <div
                  key={zone.mile}
                  className="timeline-segment"
                  style={{ width: segmentWidth }}
                >
                  <div
                    className={`timeline-bar ${
                      hasSignal ? "has-signal" : "no-signal"
                    }`}
                    title={`${zone.name}: ${
                      hasSignal ? "Signal available" : "No signal"
                    }`}
                  />
                  <div className="timeline-marker">
                    <span
                      className="marker-dot"
                      style={{
                        backgroundColor: hasSignal ? "#4CAF50" : "#BDBDBD",
                      }}
                    />
                  </div>
                  <span className="timeline-label">
                    {zone.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="timeline-legend">
            <span className="legend-item">
              <span className="legend-dot signal-on" /> Cell service
            </span>
            <span className="legend-item">
              <span className="legend-dot signal-off" /> Satellite only
            </span>
          </div>
        </div>
        <p className="note">
          📱 Expect ~{blackoutMiles} miles of complete cell blackout. iPhone 16
          Pro Max satellite + Garmin InReach provide backup.
        </p>
      </section>

      {/* Cell Coverage Map */}
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Cell Coverage Map</h2>
          <span className="section-subtitle">
            9 connectivity checkpoints along Section O
          </span>
        </div>
        <div className="connectivity-list">
          {connectivityZones.map((zone) => (
            <button
              type="button"
              key={zone.mile}
              className="connectivity-item"
              onClick={() => setPopupInfo({ ...zone, type: "connectivity" })}
            >
              <div className="connectivity-header">
                <h4>{zone.name}</h4>
                <span className="mile-marker">Mile {zone.mile}</span>
              </div>
              <div className="signal-badges">
                <span
                  className={`signal-badge ${getSignalBadgeClass(
                    zone.cellCoverage.verizon
                  )}`}
                >
                  {getSignalEmoji(zone.cellCoverage.verizon)} Verizon:{" "}
                  {zone.cellCoverage.verizon}
                </span>
                <span
                  className={`signal-badge ${getSignalBadgeClass(
                    zone.cellCoverage.att
                  )}`}
                >
                  {getSignalEmoji(zone.cellCoverage.att)} AT&T:{" "}
                  {zone.cellCoverage.att}
                </span>
                <span
                  className={`signal-badge ${getSignalBadgeClass(
                    zone.cellCoverage.tmobile
                  )}`}
                >
                  {getSignalEmoji(zone.cellCoverage.tmobile)} T-Mobile:{" "}
                  {zone.cellCoverage.tmobile}
                </span>
              </div>
              {zone.satelliteCompatible && (
                <p className="satellite-note">
                  📡 Satellite connectivity available
                </p>
              )}
              <p className="note">{zone.notes}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Satellite Communication Devices */}
      <section className="sidebar-card sidebar-card--full">
        <h2>Satellite Communication Devices</h2>
        <p className="lede">
          Section O has ~{blackoutMiles} miles with zero cell service. Satellite
          devices provide emergency SOS and two-way messaging in deep
          wilderness.
        </p>
        <div className="device-grid">
          {satelliteDevices.map((device) => (
            <article key={device.device} className="device-card">
              <h3>{device.device}</h3>
              <p className="device-cost">{device.cost}</p>
              <p className="device-compatibility">
                <strong>Compatibility:</strong> {device.compatibility}
              </p>
              <div className="device-features">
                {device.features.map((feature) => (
                  <span key={feature} className="feature-badge">
                    {feature}
                  </span>
                ))}
              </div>
              <p className="note">{device.notes}</p>
              <p className="trail-note">
                <strong>Trail intel:</strong> {device.trailNotes}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

ConnectivityTab.propTypes = {
  activeUserName: PropTypes.string,
  blackoutMiles: PropTypes.number.isRequired,
  campPoints: PropTypes.array,
  liveSatelliteData: PropTypes.object,
  liveSatelliteError: PropTypes.object,
  liveSatelliteStatus: PropTypes.string,
  setPopupInfo: PropTypes.func.isRequired,
  timelineRangeMiles: PropTypes.number.isRequired,
};

export default ConnectivityTab;
