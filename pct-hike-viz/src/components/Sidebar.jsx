import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ddgTeam,
  sectionOMeta,
  tripStats,
} from "../data/planContent";

import MissionTab from "./sidebar-tabs/MissionTab";
import PrepTab from "./sidebar-tabs/PrepTab";
import ItineraryTab from "./sidebar-tabs/ItineraryTab";
import SafetyTab from "./sidebar-tabs/SafetyTab";
import GearTab from "./sidebar-tabs/GearTab";
import ConnectivityTab from "./sidebar-tabs/ConnectivityTab";
import LogisticsTab from "./sidebar-tabs/LogisticsTab";
import ResourcesTab from "./sidebar-tabs/ResourcesTab";

function Sidebar({
  style,
  syncStatus,
  teamRoster,
  hikingTrail,
  campPoints,
  waterSources,
  waterSourceMeta,
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
  theme = "dark",
  onToggleTheme,
  selectedItinerary,
  onItineraryChange,
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

      <div className="global-itinerary-toggle" style={{ margin: '0 16px 16px 16px', display: 'flex', gap: '8px', background: 'var(--dash-panel)', padding: '4px', borderRadius: '8px', border: '1px solid var(--dash-border)' }}>
        <button
          type="button"
          onClick={() => onItineraryChange("express")}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', background: selectedItinerary === "express" ? 'var(--pine-500)' : 'transparent', color: selectedItinerary === "express" ? '#ffffff' : 'var(--dash-text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
        >
          ⚡ 9-Day Express
        </button>
        <button
          type="button"
          onClick={() => onItineraryChange("relaxed")}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', background: selectedItinerary === "relaxed" ? 'var(--pine-500)' : 'transparent', color: selectedItinerary === "relaxed" ? '#ffffff' : 'var(--dash-text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
        >
          🏕️ 16-Day Relaxed
        </button>
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
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="sidebar__sections">
{activeTab === "mission" && <MissionTab basePlanMiles={basePlanMiles} blackoutMiles={blackoutMiles} ddgTeam={ddgTeam} fullSectionMiles={fullSectionMiles} sectionOMeta={sectionOMeta} selectedItinerary={selectedItinerary} stats={stats} tripStats={tripStats} />}
        {activeTab === "prep" && <PrepTab nextStepsChecklist={nextStepsChecklist} packPlanner={packPlanner} permitChecklist={permitChecklist} />}
        {activeTab === "itinerary" && <ItineraryTab basePlanMiles={basePlanMiles} blackoutMiles={blackoutMiles} campPoints={campPoints} ddgTeam={ddgTeam} onSelectPoint={onSelectPoint} setPopupInfo={setPopupInfo} stats={stats} tripStats={tripStats} waterSourceMeta={waterSourceMeta} waterSources={waterSources} />}
        {activeTab === "safety" && <SafetyTab riskPlaybook={riskPlaybook} />}
        {activeTab === "gear" && <GearTab currentUserId={currentUserId} gearBlueprint={gearBlueprint} packPlanner={packPlanner} />}
        {activeTab === "connectivity" && <ConnectivityTab activeUserName={activeUserName} blackoutMiles={blackoutMiles} campPoints={campPoints} liveSatelliteData={liveSatelliteData} liveSatelliteError={liveSatelliteError} liveSatelliteStatus={liveSatelliteStatus} setPopupInfo={setPopupInfo} timelineRangeMiles={timelineRangeMiles} />}
        {activeTab === "logistics" && <LogisticsTab campPoints={campPoints} hikingTrail={hikingTrail} resupplyPlan={resupplyPlan} travelPlan={travelPlan} />}
        {activeTab === "resources" && <ResourcesTab referenceLibrary={referenceLibrary} />}
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
    })
  ),
  hikingTrail: PropTypes.array,
  campPoints: PropTypes.array,
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
    driver: PropTypes.string,
    inbound: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          step: PropTypes.string.isRequired,
          sourceIds: PropTypes.arrayOf(PropTypes.string),
        }),
      ])
    ).isRequired,
    exit: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          step: PropTypes.string.isRequired,
          sourceIds: PropTypes.arrayOf(PropTypes.string),
        }),
      ])
    ).isRequired,
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
