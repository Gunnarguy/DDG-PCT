import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  connectivityZones,
  getSignalBadgeClass,
  getSignalEmoji,
} from "../data/connectivityData";
import { ddgTeam, sectionOMeta, tripStats } from "../data/planContent";
import {
  comparableHikerEvidence,
  formatTripDate,
  primaryItinerary,
  tripFacts,
  tripOperations,
} from "../data/tripFacts";
import fieldBrief from "../data/fieldBrief.generated.json";
import GearPlanner from "./GearPlanner";
import OpsLog from "./OpsLog";
import SourceChips from "./SourceChips";
import TerrainAnalysis from "./TerrainAnalysis";
import TransitPanel from "./TransitPanel";
import TripReadinessPanel from "./TripReadinessPanel";
import WildfireMonitor from "./WildfireMonitor";
import { generateGPX } from "../utils/gpxExporter";

// Present readable timestamps next to live Apple data refresh events.
const formatTimestamp = (isoString) => {
  if (!isoString) return "pending refresh";
  try {
    return new Date(isoString).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
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
    summary:
      "Can support contact messaging where Apple, device, account, and regional eligibility allow.",
    coverageKey: "coverageNotes",
    coverageLabel: "Availability notes",
  },
  {
    key: "roadside",
    title: "Roadside Assistance via satellite",
    icon: "🛠️",
    summary:
      "Availability and provider hand-off vary; confirm eligibility before relying on it.",
    coverageKey: "coverageNotes",
    coverageLabel: "Coverage partners",
  },
];

const SatelliteSMSGenerator = ({ campPoints }) => {
  const [selectedCheckpointIndex, setSelectedCheckpointIndex] = useState(0);

  const checkpoints = (campPoints || []).map((camp) => ({
    name: camp.properties.name || "Unknown Location",
    coord: camp.geometry.coordinates
      ? `${camp.geometry.coordinates[1].toFixed(4)}, ${camp.geometry.coordinates[0].toFixed(4)}`
      : "Unknown",
  }));

  const handleCopyStatus = () => {
    const cp = checkpoints[selectedCheckpointIndex];
    if (!cp) return;
    const statusText = `DDG Status: Safe at ${cp.name}. Coord: [${cp.coord}]. Satellite check-in sent. All well.`;
    navigator.clipboard
      .writeText(statusText)
      .then(() => alert("Status copied to clipboard!"))
      .catch((err) => {
        console.error("Failed to copy", err);
        alert("Failed to copy to clipboard.");
      });
  };

  return (
    <section className="sidebar-card sidebar-card--full">
      <div className="section-header">
        <h2>Satellite Status SMS Generator</h2>
        <span className="section-subtitle">
          Quick-copy status templates
        </span>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <select
          value={selectedCheckpointIndex}
          onChange={(e) => setSelectedCheckpointIndex(Number(e.target.value))}
          className="rpg-select"
          style={{ flex: 1 }}
        >
          {checkpoints.map((cp, idx) => (
            <option key={idx} value={idx}>
              {cp.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleCopyStatus}
          className="rpg-btn-add"
          style={{ padding: "0.5rem 1rem" }}
        >
          Copy
        </button>
      </div>
      <p
        style={{
          margin: 0,
          padding: "0.5rem",
          background: "var(--sand-100)",
          borderRadius: "4px",
          fontSize: "0.85rem",
          fontFamily: "monospace",
        }}
      >
        DDG Status: Safe at {checkpoints[selectedCheckpointIndex]?.name}. Coord:
        [{checkpoints[selectedCheckpointIndex]?.coord}]. Satellite check-in
        sent. All well.
      </p>
    </section>
  );
};

function Sidebar({
  style,
  syncStatus,
  teamRoster,
  hikingTrail,
  campPoints,
  waterSources,
  waterSourceMeta,
  resupplyPlan,
  permitChecklist,
  referenceLibrary,
  packPlanner,
  nextStepsChecklist,
  liveSatelliteData,
  liveSatelliteStatus,
  liveSatelliteError,
  trailConditions,
  trailConditionsLoading,
  trailConditionsError,
  onRefreshTrailConditions,
  computedStats,
  onSelectPoint,
  setPopupInfo,
  currentUserId,
  onUserChange,
  theme = "dark",
  onToggleTheme,
  activeTab,
  onTabChange,
}) {
  const tabsRef = useRef(null);
  const tabs = [
    { id: "mission", label: "Overview" },
    { id: "itinerary", label: "Route" },
    { id: "safety", label: "Field" },
    { id: "gear", label: "Gear" },
    { id: "logistics", label: "Logistics" },
    { id: "resources", label: "Library" },
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

  const activeUser = useMemo(() => {
    return ddgTeam.find((member) => member.id === currentUserId) || ddgTeam[2];
  }, [currentUserId]);
  const activeUserName = activeUser?.name || "Gunnar";
  const stats = computedStats ?? tripStats;
  const blackoutMiles =
    stats?.connectivityBlackoutMiles ?? tripStats.connectivityBlackoutMiles;
  const basePlanMiles = tripFacts.route.displayMiles;
  const timelineRangeMiles =
    stats?.connectivityRangeMiles || tripFacts.route.officialMiles;

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
      ({ key }) => liveSatelliteData?.[key],
    );

    return (
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Live Apple satellite availability</h2>
          <span className="section-subtitle">
            Reference data; device and regional eligibility still apply
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
              },
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

  const renderFieldBrief = () => {
    const sourcesByID = new Map(
      fieldBrief.sources.map((source) => [source.id, source]),
    );
    const criticalGates = fieldBrief.operations.gates.filter(
      (gate) => gate.priority === "critical" && gate.state !== "confirmed",
    );
    const dayThree = fieldBrief.daily.find((day) => day.day === 3);

    return (
      <>
        <section className="sidebar-card sidebar-card--full">
          <div className="section-header">
            <h2>Offline Field Brief</h2>
            <span className="section-subtitle">
              Same generated terrain contract as iOS
            </span>
          </div>
          <p className="lede">{fieldBrief.scope}</p>
          <div className="fact-grid">
            <div className="fact-item">
              <span className="fact-label">PCTA route</span>
              <span className="fact-value">
                {fieldBrief.route.officialPctaMiles.toFixed(3)} mi
              </span>
            </div>
            <div className="fact-item">
              <span className="fact-label">Up / down</span>
              <span className="fact-value">
                +{fieldBrief.route.totalGainFeet.toLocaleString()} / −
                {fieldBrief.route.totalLossFeet.toLocaleString()} ft
              </span>
            </div>
            <div className="fact-item">
              <span className="fact-label">Finish</span>
              <span className="fact-value">Ash Camp</span>
            </div>
          </div>
          <p className="note">
            Terrain {fieldBrief.terrainContractVersion} · SHA{" "}
            <code>{fieldBrief.terrainContractSha256.slice(0, 12)}…</code>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <a
              className="rpg-btn-add"
              href={import.meta.env.BASE_URL + "data/DDG-Field-Brief-2026.md"}
              download="DDG-Field-Brief-2026.md"
            >
              Download offline brief
            </a>
            <a
              className="rpg-btn-add"
              href={import.meta.env.BASE_URL + "data/hike_data.json"}
              download="DDG-PCT-Route-2026.json"
            >
              Download route bundle
            </a>
          </div>
        </section>

        <section className="sidebar-card sidebar-card--full">
          <div className="section-header">
            <h2>Open gates — do not self-clear</h2>
            <span className="section-subtitle">
              Confirm from evidence, then log it for the team
            </span>
          </div>
          <div className="alerts-list">
            {criticalGates.map((gate) => (
              <div className="alert-item alert-warning" key={gate.id}>
                <span className="alert-icon">!</span>
                <div className="alert-content">
                  <span className="alert-title">{gate.title}</span>
                  <span className="alert-desc">
                    Owner: {gate.owner} · due {gate.due} · blocks: {gate.blocks}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {dayThree && (
          <section className="sidebar-card sidebar-card--full">
            <div className="section-header">
              <h2>Day 3: supported traverse</h2>
              <span className="section-subtitle">Not a campsite</span>
            </div>
            <p className="lede">
              {dayThree.distanceMiles.toFixed(3)} mi · +
              {dayThree.gainFeet.toLocaleString()} / −
              {dayThree.lossFeet.toLocaleString()} ft · day packs only
            </p>
            <p className="note">{dayThree.detail}</p>
            <p className="note">
              Exact trail boundary: route mi {fieldBrief.operations.dayThreeSupport.routeMile.toFixed(3)}
              {" · "}PCT {fieldBrief.operations.dayThreeSupport.pctMile.toFixed(3)}
              {" · "}{fieldBrief.operations.dayThreeSupport.fieldToTrailOffsetFeet.toFixed(0)}
              ft to the field pin.
            </p>
            <p className="error-text">
              No-show rule: {fieldBrief.operations.dayThreeSupport.noShowRule}
            </p>
          </section>
        )}

        <section className="sidebar-card sidebar-card--full">
          <div className="section-header">
            <h2>Emergency coordination</h2>
            <span className="section-subtitle">Fastest channel first</span>
          </div>
          <p className="note">{fieldBrief.emergency.disclaimer}</p>
          <ol className="bullet-list">
            {fieldBrief.emergency.actions.map((action) => (
              <li key={action.id}>
                <strong>{action.title}:</strong> {action.detail}
              </li>
            ))}
          </ol>
          <div className="quick-ref-grid">
            {fieldBrief.emergency.contacts.map((contact) => (
              <div className="quick-ref-item" key={contact.id}>
                <span className="ref-icon">☎</span>
                <div className="ref-content">
                  <span className="ref-label">{contact.title}</span>
                  <a
                    href={"tel:" + contact.value.replace(/[^+\d]/g, "")}
                    className="ref-value ref-phone"
                  >
                    {contact.value}
                  </a>
                  <span className="note">{contact.when}</span>
                  <span className="source-chips">
                    {contact.sourceIds.map((sourceID) => {
                      const source = sourcesByID.get(sourceID);
                      return source?.url ? (
                        <a
                          key={sourceID}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="source-chip"
                        >
                          Source ↗
                        </a>
                      ) : null;
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  };

  const renderSafety = () => (
    <>
      {renderFieldBrief()}
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

      <WildfireMonitor
        conditions={trailConditions}
        loading={trailConditionsLoading}
        error={trailConditionsError}
        onRefresh={onRefreshTrailConditions}
      />

      {/* Terrain Analysis - Slope-angle breakdown */}
      <TerrainAnalysis />
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
          {tripStats.hikingDays} days of hiking. Plan conservatively for
          approximately {blackoutMiles}+ miles where satellite may be the only
          dependable communication path.
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
              <span className="fact-value">Verify local</span>
            </div>
          </div>
        </div>
        <p className="note">
          Distance confidence: PCTA 2026 mile markers control the{" "}
          {tripFacts.route.officialMiles.toFixed(3)}-mi itinerary. The checked-in
          centerline measures {tripFacts.route.centerlineGeometryMiles.toFixed(3)} mi
          by spherical coordinate length; USGS 3DEP supplies the elevation profile.
          Garmin exports are comparison evidence only, not the active route source.
        </p>
      </section>

      <section className="sidebar-card sidebar-card--full alerts-card">
        <div className="section-header">
          <h2>Decisions still open</h2>
          <span className="section-subtitle">
            These are intentionally not presented as settled facts
          </span>
        </div>
        <div className="alerts-list">
          {tripFacts.unresolved.map((item) => (
            <div className="alert-item alert-warning" key={item.id}>
              <span className="alert-icon">?</span>
              <div className="alert-content">
                <span className="alert-title">{item.label}</span>
                <span className="alert-desc">{item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Operational anchors are generated from the shared field brief. */}
      <section className="sidebar-card sidebar-card--full quick-ref-card">
        <div className="section-header">
          <h2>🧭 Operational anchors</h2>
          <span className="section-subtitle">
            What has to work for this exact route
          </span>
        </div>
        <div className="quick-ref-grid">
          <div className="quick-ref-item">
            <span className="ref-icon">🚗</span>
            <div className="ref-content">
              <span className="ref-label">Burney start</span>
              <span className="ref-value">Saturday entry + exact PCT connector</span>
            </div>
          </div>
          <div className="quick-ref-item">
            <span className="ref-icon">🔁</span>
            <div className="ref-content">
              <span className="ref-label">Day 3</span>
              <span className="ref-value">Named support pickup + exact re-entry</span>
            </div>
          </div>
          <div className="quick-ref-item">
            <span className="ref-icon">🏁</span>
            <div className="ref-content">
              <span className="ref-label">Finish</span>
              <span className="ref-value">Ash Camp / FS 38N11 road check</span>
            </div>
          </div>
          <div className="quick-ref-item">
            <span className="ref-icon">📡</span>
            <div className="ref-content">
              <span className="ref-label">Communications</span>
              <span className="ref-value">Tested two-way satellite check-in plan</span>
            </div>
          </div>
        </div>
        <p className="note">
          Emergency actions, official contacts, and the {fieldBrief.operations.gates.filter((gate) => gate.state !== "confirmed").length} remaining gates live in the Field Brief—so this screen does not duplicate stale numbers or unconfirmed vendors.
        </p>
        <div className="quick-ref-dates">
          <span className="date-badge">
            📅{" "}
            {formatTripDate(tripFacts.dates.hikingStart)} – {formatTripDate(tripFacts.dates.hikingFinish)}, 2026 · {formatTripDate(tripFacts.dates.contingency)} contingency
          </span>
          <span className="date-note">
            8 hiking days + 1 contingency day
          </span>
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
              <span className="highlight-title">GPS Route High Point</span>
              <span className="highlight-desc">
                {tripFacts.route.highPointFeet.toLocaleString()}' near the Day 4/5 high saddle
              </span>
            </div>
          </div>
          <div className="highlight-item">
            <span className="highlight-icon">🏔️</span>
            <div className="highlight-content">
              <span className="highlight-title">McCloud River Corridor</span>
              <span className="highlight-desc">
                Trip low point and major descent/climb transition - Days 6–7
              </span>
            </div>
          </div>
          <div className="highlight-item">
            <span className="highlight-icon">🪨</span>
            <div className="highlight-content">
              <span className="highlight-title">Ash Camp Finish</span>
              <span className="highlight-desc">
                Route mile 51.844 · PCTA 1472.497 · pickup Day 8
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
                Treat {blackoutMiles}+ miles as a conservative no-cell planning
                zone until carrier coverage is field-tested. Satellite required.
              </span>
            </div>
          </div>
          <div className="alert-item alert-info">
            <span className="alert-icon">⛰️</span>
            <div className="alert-content">
              <span className="alert-title">Elevation Notice</span>
              <span className="alert-desc">
                USGS 3DEP terrain model peaks at approximately {tripFacts.route.highPointFeet.toLocaleString()}ft near the Day 4/5 high saddle.
                Pace accordingly and hydrate.
              </span>
            </div>
          </div>
          <div className="alert-item alert-info">
            <span className="alert-icon">🔥</span>
            <div className="alert-content">
              <span className="alert-title">Fire &amp; ignition restrictions</span>
              <span className="alert-desc">
                Carry a current California Campfire Permit for permitted public-land stove use, but it does not authorize a stove, fire, or ignition source where current restrictions or private-land rules prohibit it. Recheck before departure.
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
                Burney Falls → Ash Camp · {basePlanMiles} miles
              </span>
            </div>
          </div>
        </div>

        <div className="trip-stats-grid">
          <div className="trip-stat">
            <span className="stat-value">
              {campPoints.length > 0
                ? campPoints[campPoints.length - 1].properties.day
                : 0}
            </span>
            <span className="stat-label">Days Hiking</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">{basePlanMiles}</span>
            <span className="stat-label">Total Miles</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">
              {(
                (basePlanMiles || tripStats.totalMiles) /
                (campPoints.length > 0
                  ? campPoints[campPoints.length - 1].properties.day
                  : 1)
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
            Plan for {blackoutMiles}+ miles without dependable cell service —
            a tested satellite check-in plan is required
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
          <button type="button" className="day-card day-card--detailed" style={{ borderLeftColor: 'var(--orange-500)' }}>
            <div className="day-card__header">
              <div className="day-card__day-info">
                <span className="day-pill" style={{ backgroundColor: 'var(--orange-500)' }}>Aug 28</span>
              </div>
            </div>
            <h3 className="day-card__route">Arrival & Assembly</h3>
            <p className="day-card__terrain">
              ✈️ {tripOperations.workingFlights.inbound.flightNumber} is team-confirmed for {tripOperations.workingFlights.inbound.scheduledDepartureLocal} → {tripOperations.workingFlights.inbound.scheduledArrivalLocal}.<br />
              🚙 {tripOperations.arrivalPlan.instruction}<br />
              ⚠️ {tripOperations.workingFlights.disclaimer}
            </p>
          </button>
          
          {campPoints.slice(1).map((camp, idx) => {
            const day = camp.properties.day;
            const prevCamp = campPoints[idx];
            const leg = primaryItinerary.find((item) => item.day === day);
            const dist =
              leg?.distance ?? camp.properties.mile - prevCamp.properties.mile;
            const elevation = leg?.elevation;
            const terrainLoad = leg?.terrainLoad;
            return (
              <button
                type="button"
                key={day}
                className="day-card day-card--detailed"
                onClick={() => onSelectPoint(day)}
              >
                <div className="day-card__header">
                  <div className="day-card__day-info">
                    <span
                      className="day-pill"
                      style={{
                        backgroundColor: getGradientColor(
                          dist > 12 ? "hard" : "moderate",
                        ),
                      }}
                    >
                      {formatTripDate(
                        leg?.date ??
                          `2026-${day <= 3 ? `08-${28 + day}` : `09-0${day - 3}`}`,
                      )} · Day {day}
                    </span>
                  </div>
                  <div className="day-card__distance">
                    <span className="distance-value">{dist.toFixed(1)}</span>
                    <span className="distance-unit">mi</span>
                  </div>
                </div>
                <h3 className="day-card__route">
                  {leg?.from ?? prevCamp.properties.name} →{" "}
                  {leg?.to ?? camp.properties.name}
                </h3>
                <p className="day-card__terrain">
                  {elevation
                    ? `↑ ${elevation.gain.toLocaleString()} ft · ↓ ${elevation.loss.toLocaleString()} ft · net ${terrainLoad.netFeet >= 0 ? "+" : ""}${terrainLoad.netFeet.toLocaleString()} ft`
                    : "GPS-balanced PCT leg"}
                </p>
                <div className="day-card__indicators">
                  {terrainLoad && (
                    <>
                      <span className="indicator-chip">
                        Effort #{terrainLoad.effortRank} · {terrainLoad.effortMiles} effort-mi
                      </span>
                      <span
                        className={`indicator-chip knee-load knee-load--${terrainLoad.kneeLoad}`}
                      >
                        Knees: {terrainLoad.kneeLoad.replace("-", " ")} · ↓{" "}
                        {terrainLoad.descentPerMile} ft/mi
                      </span>
                    </>
                  )}
                  <span
                    className="indicator-chip indicator-water"
                    title="Water sources"
                  >
                    💧 Check water map
                  </span>
                </div>
                <p className="day-card__notes">
                  {day === 3 && leg &&
                    `Longest day: ${leg.distance.toFixed(3)} miles with day packs, continuous private-land travel, and timed Bartle Gap extraction. `}
                  {day === 2 && elevation &&
                    `Largest climb: ${elevation.gain.toLocaleString()} feet, ending at the screened dry camp. `}
                  {day === 7 && elevation &&
                    `Hardest knee day: sustained ${elevation.loss.toLocaleString()}-foot descent. `}
                  {day === 4 &&
                    "Short mileage hides a steep climb and dry-camp carry. "}
                  {day === 8 &&
                    "Short but descent-heavy; protect pickup timing and avoid rushing. "}
                  {leg?.stopType === "support-transfer"
                    ? " This is a transfer point, not an overnight campsite."
                    : " Overnight waypoint still requires current field verification."}
                </p>
              </button>
            );
          })}
          
          <button type="button" className="day-card day-card--detailed" style={{ borderLeftColor: 'var(--orange-500)' }}>
            <div className="day-card__header">
              <div className="day-card__day-info">
                <span className="day-pill" style={{ backgroundColor: 'var(--orange-500)' }}>Sept 7</span>
              </div>
            </div>
            <h3 className="day-card__route">Departure</h3>
            <p className="day-card__terrain">
              ✈️ {tripOperations.workingFlights.outbound.flightNumber} is team-confirmed for
              <strong> {tripOperations.workingFlights.outbound.scheduledDepartureLocal}</strong> from SJC,
              arriving {tripOperations.workingFlights.outbound.scheduledArrivalLocal}.
              Open United Flight Status on travel day for the gate and delay check.
            </p>
          </button>
        </div>
      </section>

      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>What hikers actually did here</h2>
          <span className="section-subtitle">
            Context, not a pace target
          </span>
        </div>
        <p className="lede">
          Published accounts confirm that this terrain can support much longer
          days, but those hikers had day packs, car staging, or thru-hiker
          conditioning. Your current 5.61 / 8.68 / 12.59 / 5.37 / 3.79 /
          6.35 / 5.60 / 3.85 miles are intentionally uneven. Day 3 is the
          supported day-pack traverse; the shorter days protect loaded-pack
          knee recovery.
        </p>
        <div className="evidence-list">
          {comparableHikerEvidence.map((item) => (
            <a href={item.source} target="_blank" rel="noreferrer" key={item.label}>
              <strong>{item.label}: {item.route}</strong>
              <span>
                {item.dailyMiles
                  ? `${item.dailyMiles.join(" / ")} miles on successive days`
                  : `${item.distanceMiles} mi · +${item.gainFeet.toLocaleString()} ft${item.lossFeet ? ` / -${item.lossFeet.toLocaleString()} ft` : ""} · ${item.elapsed}`}
              </span>
              <small>{item.context}</small>
            </a>
          ))}
        </div>
        <p className="note">
          “Effort miles” is a transparent planning estimate: actual miles +
          ascent/2,000 + descent/4,000. It is for comparing your eight days, not
          predicting finish time or medical strain.
        </p>
      </section>

      {/* Water Sources - tap to show on map */}
      <section className="sidebar-card sidebar-card--full">
          <div className="section-header">
          <h2>💧 Mapped water locations</h2>
          <span className="section-subtitle">
            {waterSourceMeta.count} offline map points ·{" "}
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
              <p className="note">Last stored note: {source.report}</p>
            </button>
          ))}
        </div>
        <p className="note water-source-note">
          These are offline locations projected to the canonical PCTA route.
          Stored reports are not current flow status. Check Field → Daily
          Conditions and the current PCT Water report before moving; tap a
          source to drop the 💧 marker on the map.
        </p>
      </section>
    </>
  );

  const renderGear = () => {
    const totalGearItems = (packPlanner.modules ?? []).reduce(
      (total, module) => total + (module.items?.length ?? 0),
      0,
    );

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
            <span className="gear-stat-value">{totalGearItems}</span>
            <span className="gear-stat-label">assignable items</span>
          </div>
          <div className="gear-stat">
            <span className="gear-stat-value">
              {packPlanner.modules?.length || 8}
            </span>
            <span className="gear-stat-label">modules</span>
          </div>
        </section>

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
  const renderLogistics = () => {
    const handleExportGPX = () => {
      const gpxContent = generateGPX(hikingTrail, campPoints);
      const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pct_section_o.gpx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    return (
      <>
        {/* Transit & Access Panel */}
        <TransitPanel />

        <section className="sidebar-card">
          <h2>GPS Export</h2>
          <p className="note">
            Download waypoints and trail geometry to load into Garmin, FarOut,
            or CalTopo before losing service.
          </p>
          <button
            onClick={handleExportGPX}
            className="rpg-btn-add"
            style={{
              width: "100%",
              marginTop: "0.5rem",
              cursor: "pointer",
              padding: "0.75rem",
              background: "var(--pine-500)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontWeight: "bold",
            }}
          >
            Export GPX to Garmin/FarOut
          </button>
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
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTIVITY TAB - OpsLog + satellite/cell coverage
  // ═══════════════════════════════════════════════════════════════════════════
  const renderConnectivity = () => {
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
            <h2>Connectivity planning assumptions</h2>
            <span className="section-subtitle">
              No field survey—test every actual carrier before relying on it
            </span>
          </div>
          <div className="connectivity-timeline">
            <div className="timeline-track">
              {connectivityZones.map((zone, i) => {
                const nextZone = connectivityZones[i + 1];
                const hasSignal = Object.values(zone.cellCoverage).some((coverage) =>
                  ["good", "fair", "spotty"].includes(coverage),
                );
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
                        hasSignal
                          ? "possible carrier coverage (planning assumption)"
                          : "satellite-primary planning assumption"
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
                <span className="legend-dot signal-on" /> Possible carrier coverage
              </span>
              <span className="legend-item">
                <span className="legend-dot signal-off" /> Satellite-primary plan
              </span>
            </div>
          </div>
          <p className="note">
            📱 Treat roughly {blackoutMiles} miles as no-dependable-cell planning territory until your carriers are field-tested. A tested two-way satellite communicator is the group coordination plan.
          </p>
        </section>

        {/* Cell Coverage Map */}
        <section className="sidebar-card sidebar-card--full">
          <div className="section-header">
            <h2>Carrier planning checkpoints</h2>
            <span className="section-subtitle">
              {connectivityZones.length} conservative checkpoints along the active route
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
                      zone.cellCoverage.verizon,
                    )}`}
                  >
                    {getSignalEmoji(zone.cellCoverage.verizon)} Verizon:{" "}
                    {zone.cellCoverage.verizon}
                  </span>
                  <span
                    className={`signal-badge ${getSignalBadgeClass(
                      zone.cellCoverage.att,
                    )}`}
                  >
                    {getSignalEmoji(zone.cellCoverage.att)} AT&T:{" "}
                    {zone.cellCoverage.att}
                  </span>
                  <span
                    className={`signal-badge ${getSignalBadgeClass(
                      zone.cellCoverage.tmobile,
                    )}`}
                  >
                    {getSignalEmoji(zone.cellCoverage.tmobile)} T-Mobile:{" "}
                    {zone.cellCoverage.tmobile}
                  </span>
                </div>
                {zone.satelliteCompatible && (
                  <p className="satellite-note">
                    📡 Open-sky satellite check-in may be possible; test the actual device
                  </p>
                )}
                <p className="note">{zone.notes}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="sidebar-card sidebar-card--full">
          <h2>Comms readiness</h2>
          <p className="lede">
            Treat approximately {blackoutMiles} miles as a conservative
            no-dependable-cell planning zone until field-tested. Do not treat
            phone-only satellite features as the group communication plan.
          </p>
          <ul className="bullet-list">
            <li>Assign one tested, subscribed two-way satellite communicator and a backup owner.</li>
            <li>Send and acknowledge a real check-in before the trip; save the contact protocol and itinerary offline on every phone.</li>
            <li>Use the Field Brief for emergency actions and the Gear tab to assign the actual equipment—do not rely on stale product prices or model-specific promises here.</li>
          </ul>
        </section>
      </>
    );
  };

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
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label="Toggle visual theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {presenceRow}

      <div className="itinerary-toggle-container" style={{ margin: "0 16px 16px 16px" }}>
        <div className="itinerary-toggle-btn is-active">
          🏕️ Active · 51.844 mi / 8 hiking days
        </div>
      </div>

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
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="sidebar__sections">
        {activeTab === "mission" && (
          <>
            {renderMission()}
            {renderPrep()}
          </>
        )}
        {activeTab === "itinerary" && renderItinerary()}
        {activeTab === "safety" && (
          <>
            {renderSafety()}
            {renderConnectivity()}
          </>
        )}
        {activeTab === "gear" && renderGear()}
        {activeTab === "logistics" && renderLogistics()}
        {activeTab === "resources" && renderResources()}
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  theme: PropTypes.string,
  onToggleTheme: PropTypes.func.isRequired,
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
    }),
  ),
  hikingTrail: PropTypes.array,
  campPoints: PropTypes.array,
  waterSources: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      mile: PropTypes.number.isRequired,
      report: PropTypes.string.isRequired,
      waypoint: PropTypes.string,
    }),
  ).isRequired,
  waterSourceMeta: PropTypes.shape({
    count: PropTypes.number.isRequired,
    mileRange: PropTypes.string.isRequired,
    sourceLabel: PropTypes.string.isRequired,
    lastSynced: PropTypes.string.isRequired,
  }).isRequired,
  trailConditions: PropTypes.object,
  trailConditionsLoading: PropTypes.bool,
  trailConditionsError: PropTypes.string,
  onRefreshTrailConditions: PropTypes.func,
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
          }),
        ).isRequired,
      }),
    ).isRequired,
    stashZones: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        focus: PropTypes.string.isRequired,
        suggestions: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
    ).isRequired,
    resourceLinks: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        href: PropTypes.string.isRequired,
      }),
    ).isRequired,
  }).isRequired,
  nextStepsChecklist: PropTypes.arrayOf(
    PropTypes.shape({
      task: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
    }),
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
