import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  connectivityZones,
  getSignalBadgeClass,
  getSignalEmoji,
  satelliteDevices,
} from "../data/connectivityData";
import {
  dayItinerary,
  ddgTeam,
  sectionOMeta,
  tripStats,
} from "../data/planContent";
import GearPlanner from "./GearPlanner";
import OpsLog from "./OpsLog";
import SourceChips from "./SourceChips";
import TerrainAnalysis from "./TerrainAnalysis";
import TransitPanel from "./TransitPanel";
import TripReadinessPanel from "./TripReadinessPanel";
import WildfireMonitor from "./WildfireMonitor";

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

function Sidebar({
  style,
  syncStatus,
  teamRoster,
  waterSources,
  waterSourceMeta,
  scheduleOptions,
  travelPlan,
  resupplyPlan,
  permitChecklist,
  referenceLibrary,
  gearBlueprint,
  packPlanner,
  riskPlaybook,
  nextStepsChecklist,
  liveSatelliteData,
  liveSatelliteStatus,
  liveSatelliteError,
  computedStats,
  onSelectPoint,
  setPopupInfo,
  currentUserId,
  onUserChange,
}) {
  const [activeTab, setActiveTab] = useState("mission");
  const tabsRef = useRef(null);
  const tabs = [
    { id: "mission", label: "Mission" },
    { id: "prep", label: "Prep" },
    { id: "itinerary", label: "Itinerary" },
    { id: "safety", label: "Safety" },
    { id: "gear", label: "Gear" },
    { id: "connectivity", label: "Connectivity" },
    { id: "logistics", label: "Logistics" },
    { id: "resources", label: "Resources" },
  ];

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    const handleWheel = (event) => {
      if (event.shiftKey) return;
      if (el.scrollWidth <= el.clientWidth) return;

      const dominantAxisIsVertical =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX);
      if (!dominantAxisIsVertical) return;

      el.scrollLeft += event.deltaY;
      event.preventDefault();
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const activeUser =
    ddgTeam.find((member) => member.id === currentUserId) || ddgTeam[2];
  const activeUserName = activeUser?.name || "Gunnar";
  const stats = computedStats ?? tripStats;
  const blackoutMiles =
    stats?.connectivityBlackoutMiles ?? tripStats.connectivityBlackoutMiles;
  const basePlanMiles = stats?.totalMiles ?? tripStats.totalMiles;
  const fullSectionMiles = stats?.fullSectionMiles;
  const timelineRangeMiles = stats?.connectivityRangeMiles || 90;

  const presenceRow = useMemo(() => {
    const hasRoster = Array.isArray(teamRoster) && teamRoster.length > 0;
    if (!syncStatus && !hasRoster) return null;

    const statusLabel =
      syncStatus === "synced"
        ? "Synced"
        : syncStatus === "syncing"
        ? "Syncing…"
        : "Offline";
    const statusColor =
      syncStatus === "synced"
        ? "#16a34a"
        : syncStatus === "syncing"
        ? "#ca8a04"
        : "#ef4444";

    return (
      <div className="presence-row">
        <div
          className="presence-status"
          title={`Data sync status: ${statusLabel}`}
        >
          <span
            className="presence-dot"
            style={{ backgroundColor: statusColor }}
          />
          <span className="presence-text">{statusLabel}</span>
        </div>
        {hasRoster && (
          <div className="presence-avatars" title="Currently online">
            {teamRoster.map((member) => (
              <div
                key={member.id}
                className="presence-avatar"
                aria-label={member.name || member.email}
              >
                {(member.name || member.email || "?").charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [syncStatus, teamRoster]);

  const liveStatusCopy = {
    idle: "Awaiting Apple live feed…",
    loading: "Loading Apple satellite intel…",
    refreshing: "Refreshing Apple coverage…",
    success: "Live Apple feed synced",
    error: "Apple feed offline—showing last known snapshot",
  };

  const renderRequirementList = (requirements) => {
    if (!requirements || requirements.length === 0) {
      return null;
    }

    const isObjectList = typeof requirements[0] === "object";

    return (
      <ul className="mini-list">
        {requirements.map((entry, index) => {
          if (isObjectList) {
            const region = entry.region ?? `Region ${index + 1}`;
            const requirement = entry.requirement ?? "";
            return (
              <li key={`${region}-${requirement}-${index}`}>
                <strong>{region}:</strong> {requirement}
              </li>
            );
          }
          return <li key={`${entry}-${index}`}>{entry}</li>;
        })}
      </ul>
    );
  };

  const renderCoverageList = (entries, label) => {
    return (
      <div className="live-sat-block">
        <p className="subhead">{label}</p>
        <ul className="mini-list">
          {entries.slice(0, 6).map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderLiveSatelliteIntel = () => {
    const lastUpdated = liveSatelliteData?.updatedAt
      ? formatTimestamp(liveSatelliteData.updatedAt)
      : "pending refresh";
    const hasLiveCards = SATELLITE_SECTION_CONFIG.some(
      ({ key }) => liveSatelliteData?.[key]
    );

    return (
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Live Satellite Coverage · iPhone 16 Pro Max</h2>
          <span className="section-subtitle">
            Direct Apple Support scrape every 30 min
          </span>
        </div>
        <div
          className={`live-sat-status live-sat-status--${liveSatelliteStatus}`}
        >
          <span className="status-dot" aria-hidden="true" />
          <div>
            <p className="live-sat-status__label">
              {liveStatusCopy[liveSatelliteStatus] ?? "Status unknown"}
            </p>
            <p className="note">Last updated {lastUpdated}</p>
          </div>
        </div>
        {liveSatelliteError && (
          <p className="error-text">{liveSatelliteError.message}</p>
        )}
        {hasLiveCards ? (
          <div className="live-sat-grid">
            {SATELLITE_SECTION_CONFIG.map(
              ({ key, title, icon, summary, coverageKey, coverageLabel }) => {
                const feature = liveSatelliteData?.[key];
                return (
                  <article key={key} className="live-sat-card">
                    <div className="live-sat-card__head">
                      <span className="live-sat-card__icon" aria-hidden="true">
                        {icon}
                      </span>
                      <div>
                        <h3>{title}</h3>
                        <p className="note">{summary}</p>
                      </div>
                    </div>
                    {renderRequirementList(feature?.iosRequirements)}
                    {renderCoverageList(feature?.[coverageKey], coverageLabel)}
                    {feature?.exclusions && (
                      <p className="note live-sat-card__exclusion">
                        {feature.exclusions}
                      </p>
                    )}
                    {feature?.source && (
                      <a
                        className="live-sat-source"
                        href={feature.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Apple source ↗
                      </a>
                    )}
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <p className="note">
            Waiting for Apple Support to return live coverage details…
          </p>
        )}
        <p className="note">
          Static cell intel stays below so you can compare field-scouted towers
          vs the live Apple satellite feed in one glance.
        </p>
      </section>
    );
  };

  const renderSafety = () => (
    <>
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Real-Time Safety Monitoring</h2>
          <span className="section-subtitle">
            Wildfire + air quality intel for Section O
          </span>
        </div>
        <p className="lede">
          Live wildfire perimeters and air quality monitoring across Section O.
          Data refreshes every 4 hours from NIFC (National Interagency Fire
          Center) and EPA AirNow. Critical for trip go/no-go decisions during
          fire season (July-October).
        </p>
      </section>

      <WildfireMonitor />

      {/* Terrain Analysis - Slope-angle breakdown */}
      <TerrainAnalysis />

      {/* Risk & Contingency Planning */}
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>⚠️ Risk &amp; Contingency Planning</h2>
          <span className="section-subtitle">
            Know the hazards before you go
          </span>
        </div>
        <p className="lede">
          Pre-identified hazards and mitigation strategies for Section O.
        </p>
        <ul className="bullet-list">
          {riskPlaybook.map((risk) => (
            <li key={risk.title}>
              <strong>{risk.title}:</strong> {risk.detail}
              {risk.sourceIds && risk.sourceIds.length > 0 && (
                <SourceChips sourceIds={risk.sourceIds} size="small" />
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );

  const renderMission = () => (
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
          <span className="date-badge">📅 {scheduleOptions[0].dates}</span>
          <span className="date-note">9-day express schedule</span>
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

  const renderItinerary = () => (
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
            <span className="stat-value">{tripStats.hikingDays}</span>
            <span className="stat-label">Days Hiking</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">{basePlanMiles}</span>
            <span className="stat-label">Total Miles</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">
              {(
                (basePlanMiles || tripStats.totalMiles) / tripStats.hikingDays
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
          {dayItinerary.map((day) => (
            <button
              type="button"
              key={day.day}
              className={`day-card day-card--detailed ${
                day.type === "drive" ? "day-card--drive" : ""
              }`}
              onClick={() => onSelectPoint(day.day)}
            >
              {/* Header Row */}
              <div className="day-card__header">
                <div className="day-card__day-info">
                  <span
                    className="day-pill"
                    style={{
                      backgroundColor: day.gradient
                        ? getGradientColor(day.gradient)
                        : undefined,
                    }}
                  >
                    {day.label}
                  </span>
                  {day.gradient && (
                    <span
                      className="gradient-badge"
                      style={{ color: getGradientColor(day.gradient) }}
                    >
                      {day.gradient}
                    </span>
                  )}
                </div>
                <div className="day-card__distance">
                  <span className="distance-value">{day.distance}</span>
                  <span className="distance-unit">
                    {day.type === "drive" ? "hr drive" : "mi"}
                  </span>
                </div>
              </div>

              {/* Route */}
              <h3 className="day-card__route">
                {day.from} → {day.to}
              </h3>

              {/* Elevation Stats */}
              {day.type === "hike" && (
                <div className="day-card__elevation-row">
                  <span className="elev-stat elev-start">
                    📍 {day.elevation.start.toLocaleString()}'
                  </span>
                  <span className="elev-arrow">→</span>
                  <span className="elev-stat elev-end">
                    🏕️ {day.elevation.end.toLocaleString()}'
                  </span>
                  <span className="elev-stat elev-gain">
                    ↗️ +{day.elevation.gain.toLocaleString()}'
                  </span>
                </div>
              )}

              {/* Terrain */}
              <p className="day-card__terrain">{day.terrain}</p>

              {/* Quick indicators row: water + connectivity */}
              <div className="day-card__indicators">
                {/* Water carry summary */}
                {day.waterCarry && (
                  <span
                    className="indicator-chip indicator-water"
                    title={day.waterCarry}
                  >
                    💧 {day.waterSources?.length || 0} sources
                  </span>
                )}

                {/* Connectivity */}
                <div className="day-card__connectivity">
                  <span
                    className={`signal-dot ${
                      day.connectivity.verizon !== "none"
                        ? "has-signal"
                        : "no-signal"
                    }`}
                    title={`Verizon: ${day.connectivity.verizon}`}
                  >
                    V
                  </span>
                  <span
                    className={`signal-dot ${
                      day.connectivity.att !== "none"
                        ? "has-signal"
                        : "no-signal"
                    }`}
                    title={`AT&T: ${day.connectivity.att}`}
                  >
                    A
                  </span>
                  <span
                    className={`signal-dot ${
                      day.connectivity.tmobile !== "none"
                        ? "has-signal"
                        : "no-signal"
                    }`}
                    title={`T-Mobile: ${day.connectivity.tmobile}`}
                  >
                    T
                  </span>
                  {day.connectivity.satellite && (
                    <span
                      className="satellite-icon"
                      title="Satellite available"
                    >
                      📡
                    </span>
                  )}
                </div>
              </div>

              {/* Camp Features */}
              {day.campFeatures && (
                <div className="day-card__features">
                  {day.campFeatures.slice(0, 3).map((feat, i) => (
                    <span key={i} className="feature-chip">
                      {feat}
                    </span>
                  ))}
                  {day.campFeatures.length > 3 && (
                    <span className="feature-chip feature-more">
                      +{day.campFeatures.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Notes */}
              <p className="day-card__notes">{day.notes}</p>
            </button>
          ))}
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

  const renderGear = () => {
    // Icon mapping for gear categories
    const categoryIcons = {
      Navigation: "🧭",
      "Shelter & Sleep": "⛺",
      "Cooking & Hydration": "🍳",
      "Lighting & Safety": "🔦",
    };

    // Icon mapping for personal priorities
    const priorityIcons = ["🦶", "☀️", "🌧️", "🔋", "💳"];

    return (
      <>
        {/* Quick Stats Bar */}
        <section className="sidebar-card gear-stats-bar">
          <div className="gear-stat">
            <span className="gear-stat-value">
              {packPlanner.baseWeightGoalLbs}
            </span>
            <span className="gear-stat-label">lb base goal</span>
          </div>
          <div className="gear-stat">
            <span className="gear-stat-value">
              {packPlanner.capacityLiters}
            </span>
            <span className="gear-stat-label">L capacity</span>
          </div>
          <div className="gear-stat">
            <span className="gear-stat-value">{gearBlueprint.core.length}</span>
            <span className="gear-stat-label">core systems</span>
          </div>
          <div className="gear-stat">
            <span className="gear-stat-value">
              {packPlanner.modules?.length || 8}
            </span>
            <span className="gear-stat-label">modules</span>
          </div>
        </section>

        {/* Core Systems - Compact Grid */}
        <section className="sidebar-card">
          <h2>Core Gear Systems</h2>
          <div className="gear-systems-grid">
            {gearBlueprint.core.map((kit) => (
              <details key={kit.name} className="gear-system-card">
                <summary className="gear-system-header">
                  <span className="gear-system-icon">
                    {categoryIcons[kit.name] || "📦"}
                  </span>
                  <span className="gear-system-name">{kit.name}</span>
                  <span className="gear-system-count">
                    {kit.items.length} items
                  </span>
                </summary>
                <ul className="gear-system-items">
                  {kit.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>

        {/* Personal Priorities - Horizontal Pills */}
        <section className="sidebar-card gear-priorities-card">
          <h2>Packing Priorities</h2>
          <div className="priority-pills">
            {gearBlueprint.personalPriorities.map((line, idx) => {
              // Extract the category name (before the colon)
              const colonIdx = line.indexOf(":");
              const category =
                colonIdx > 0
                  ? line.substring(0, colonIdx)
                  : `Priority ${idx + 1}`;
              const details =
                colonIdx > 0 ? line.substring(colonIdx + 1).trim() : line;

              return (
                <details key={line} className="priority-pill">
                  <summary>
                    <span className="priority-icon">
                      {priorityIcons[idx] || "✓"}
                    </span>
                    <span className="priority-label">{category}</span>
                  </summary>
                  <p className="priority-details">{details}</p>
                </details>
              );
            })}
          </div>
        </section>

        {/* Interactive Gear Planner */}
        <section className="sidebar-card sidebar-card--full">
          <GearPlanner
            key={currentUserId}
            data={packPlanner}
            currentUser={currentUserId}
          />
        </section>
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PREP TAB - Trip readiness, permits, next steps
  // ═══════════════════════════════════════════════════════════════════════════
  const renderPrep = () => (
    <>
      {/* Trip Readiness Dashboard */}
      <TripReadinessPanel
        packPlanner={packPlanner}
        nextStepsChecklist={nextStepsChecklist}
        permitChecklist={permitChecklist}
      />

      {/* Permit Checklist - Detailed */}
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>📝 Permit Checklist</h2>
          <span className="section-subtitle">
            Required documents for Section O
          </span>
        </div>
        <div className="permit-grid">
          {permitChecklist.map((permit) => (
            <article key={permit.name} className="permit-card">
              <h3>{permit.name}</h3>
              <p className="tag">{permit.coverage}</p>
              <p>
                <strong>Where:</strong> {permit.source}
              </p>
              <p>
                <strong>Cost:</strong> {permit.cost}
              </p>
              <p>{permit.notes}</p>
              {permit.sourceIds && (
                <SourceChips
                  sourceIds={permit.sourceIds}
                  size="small"
                  maxShow={4}
                />
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGISTICS TAB - Transit, travel, resupply (slimmed down)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderLogistics = () => (
    <>
      {/* Transit & Access Panel */}
      <TransitPanel />

      <section className="sidebar-card">
        <h2>Travel &amp; Shuttle Playbook</h2>
        {travelPlan.sourceIds && (
          <SourceChips
            sourceIds={travelPlan.sourceIds}
            size="small"
            maxShow={3}
          />
        )}
        <h3 className="subhead">Inbound</h3>
        <ul className="bullet-list bullet-list--sourced">
          {travelPlan.inbound.map((item, i) => {
            const step = typeof item === "string" ? item : item.step;
            const stepSourceIds =
              typeof item === "object" ? item.sourceIds : null;
            return (
              <li key={i}>
                <span>{step}</span>
                {stepSourceIds && (
                  <SourceChips
                    sourceIds={stepSourceIds}
                    size="small"
                    maxShow={2}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <h3 className="subhead">Exit strategy</h3>
        <ul className="bullet-list bullet-list--sourced">
          {travelPlan.exit.map((item, i) => {
            const step = typeof item === "string" ? item : item.step;
            const stepSourceIds =
              typeof item === "object" ? item.sourceIds : null;
            return (
              <li key={i}>
                <span>{step}</span>
                {stepSourceIds && (
                  <SourceChips
                    sourceIds={stepSourceIds}
                    size="small"
                    maxShow={2}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <p className="note">Trail angel intel: {travelPlan.trailAngelNotes}</p>
      </section>

      <section className="sidebar-card">
        <h2>Resupply Hub · {resupplyPlan.town}</h2>
        <p className="lede">{resupplyPlan.callouts}</p>
        {resupplyPlan.sourceIds && (
          <SourceChips
            sourceIds={resupplyPlan.sourceIds}
            size="small"
            maxShow={3}
          />
        )}
        <div className="two-column">
          <div>
            <h3 className="subhead">Access</h3>
            <ul className="bullet-list bullet-list--sourced">
              {resupplyPlan.access.map((item, i) => {
                const text = typeof item === "string" ? item : item.item;
                const itemSourceIds =
                  typeof item === "object" ? item.sourceIds : null;
                return (
                  <li key={i}>
                    <span>{text}</span>
                    {itemSourceIds && (
                      <SourceChips
                        sourceIds={itemSourceIds}
                        size="small"
                        maxShow={2}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="subhead">Services</h3>
            <ul className="bullet-list">
              {resupplyPlan.services.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTIVITY TAB - OpsLog + satellite/cell coverage
  // ═══════════════════════════════════════════════════════════════════════════
  const renderConnectivity = () => (
    <>
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOURCES TAB - Reference library (renamed from Library)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderResources = () => (
    <section className="sidebar-card sidebar-card--full">
      <h2>Reference Library</h2>
      <div className="link-columns">
        <div>
          <p className="subhead">Route Research</p>
          <ul>
            {referenceLibrary.routeResearch.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="subhead">Transport &amp; Resupply</p>
          <ul>
            {referenceLibrary.transportAndResupply.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="subhead">Permits</p>
          <ul>
            {referenceLibrary.permits.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );

  return (
    <aside className="sidebar" style={style}>
      {/* Identity Switcher - Controls who you're posting as in Comms */}
      <div className="identity-section">
        <span className="identity-label-text">Posting as:</span>
        <div
          className="identity-switcher"
          role="group"
          aria-label="Select your identity for comms"
        >
          {ddgTeam.map((member) => {
            const isActive = member.id === activeUser.id;
            return (
              <button
                key={member.id}
                type="button"
                className={`identity-chip ${isActive ? "is-active" : ""}`}
                style={{ "--identity-color": member.color }}
                onClick={() => onUserChange(member.id)}
                title={`Post and interact as ${member.name}`}
              >
                <span className="identity-emoji" aria-hidden="true">
                  {member.emoji}
                </span>
                <span className="identity-label">{member.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {presenceRow}

      <nav
        ref={tabsRef}
        className="sidebar__tabs"
        aria-label="Mission control sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? "tab-btn is-active" : "tab-btn"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="sidebar__sections">
        {activeTab === "mission" && renderMission()}
        {activeTab === "prep" && renderPrep()}
        {activeTab === "itinerary" && renderItinerary()}
        {activeTab === "safety" && renderSafety()}
        {activeTab === "gear" && renderGear()}
        {activeTab === "connectivity" && renderConnectivity()}
        {activeTab === "logistics" && renderLogistics()}
        {activeTab === "resources" && renderResources()}
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  style: PropTypes.object,
  syncStatus: PropTypes.string,
  teamRoster: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      email: PropTypes.string,
      name: PropTypes.string,
      role: PropTypes.string,
      last_seen: PropTypes.string,
      hiker_id: PropTypes.string,
    })
  ),
  waterSources: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      mile: PropTypes.number.isRequired,
      report: PropTypes.string.isRequired,
      waypoint: PropTypes.string,
    })
  ).isRequired,
  waterSourceMeta: PropTypes.shape({
    count: PropTypes.number.isRequired,
    mileRange: PropTypes.string.isRequired,
    sourceLabel: PropTypes.string.isRequired,
    lastSynced: PropTypes.string.isRequired,
  }).isRequired,
  scheduleOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  travelPlan: PropTypes.shape({
    inbound: PropTypes.arrayOf(PropTypes.string).isRequired,
    exit: PropTypes.arrayOf(PropTypes.string).isRequired,
    trailAngelNotes: PropTypes.string.isRequired,
  }).isRequired,
  resupplyPlan: PropTypes.shape({
    town: PropTypes.string.isRequired,
    access: PropTypes.arrayOf(PropTypes.string).isRequired,
    services: PropTypes.arrayOf(PropTypes.string).isRequired,
    callouts: PropTypes.string.isRequired,
  }).isRequired,
  permitChecklist: PropTypes.arrayOf(PropTypes.object).isRequired,
  referenceLibrary: PropTypes.shape({
    routeResearch: PropTypes.arrayOf(PropTypes.object).isRequired,
    transportAndResupply: PropTypes.arrayOf(PropTypes.object).isRequired,
    permits: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  gearBlueprint: PropTypes.shape({
    core: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        items: PropTypes.arrayOf(PropTypes.string).isRequired,
      })
    ).isRequired,
    personalPriorities: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  packPlanner: PropTypes.shape({
    packName: PropTypes.string.isRequired,
    capacityLiters: PropTypes.number.isRequired,
    baseWeightGoalLbs: PropTypes.number.isRequired,
    consumablesStartLbs: PropTypes.number.isRequired,
    summary: PropTypes.string.isRequired,
    modules: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        weightLbs: PropTypes.number.isRequired,
        volumeLiters: PropTypes.number.isRequired,
        readiness: PropTypes.string.isRequired,
        focus: PropTypes.string.isRequired,
        items: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            detail: PropTypes.string.isRequired,
            weight: PropTypes.string.isRequired,
            defaultPacked: PropTypes.bool,
          })
        ).isRequired,
      })
    ).isRequired,
    stashZones: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        focus: PropTypes.string.isRequired,
        suggestions: PropTypes.arrayOf(PropTypes.string).isRequired,
      })
    ).isRequired,
    resourceLinks: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        href: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
  riskPlaybook: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      detail: PropTypes.string.isRequired,
    })
  ).isRequired,
  nextStepsChecklist: PropTypes.arrayOf(
    PropTypes.shape({
      task: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
    })
  ).isRequired,
  liveSatelliteData: PropTypes.shape({
    updatedAt: PropTypes.string,
    emergencySos: PropTypes.object,
    messages: PropTypes.object,
    roadside: PropTypes.object,
  }),
  liveSatelliteStatus: PropTypes.oneOf([
    "idle",
    "loading",
    "refreshing",
    "success",
    "error",
  ]).isRequired,
  liveSatelliteError: PropTypes.instanceOf(Error),
  computedStats: PropTypes.shape({
    totalMiles: PropTypes.number,
    totalGain: PropTypes.number,
    totalLoss: PropTypes.number,
    highPoint: PropTypes.shape({
      elevation: PropTypes.number,
    }),
    waterSourceCount: PropTypes.number,
    connectivityBlackoutMiles: PropTypes.number,
    connectivityRangeMiles: PropTypes.number,
    basePlanMiles: PropTypes.number,
    fullSectionMiles: PropTypes.number,
  }),
  onSelectPoint: PropTypes.func.isRequired,
  setPopupInfo: PropTypes.func.isRequired,
  currentUserId: PropTypes.string.isRequired,
  onUserChange: PropTypes.func.isRequired,
};

Sidebar.defaultProps = {
  liveSatelliteData: null,
  liveSatelliteError: null,
  computedStats: null,
};

export default Sidebar;
