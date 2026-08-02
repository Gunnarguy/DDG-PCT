import PropTypes from "prop-types";
import { ddgTeam } from "../data/planContent";

// DDG Team pack configurations - built from ddgTeam data
const HIKERS = [
  {
    id: ddgTeam[0].id, // dan
    name: ddgTeam[0].name, // Dan
    emoji: ddgTeam[0].emoji, // 🧔
    role: ddgTeam[0].role, // Trail Boss
    color: ddgTeam[0].color, // #2E7D32
    pack: "Pack TBD",
    capacity: 60,
    baseWeightGoal: 0,
    packNotes:
      "Comfort-focused hauler for group gear. Carries shared shelter if needed.",
  },
  {
    id: ddgTeam[1].id, // drew
    name: ddgTeam[1].name, // Drew
    emoji: ddgTeam[1].emoji, // 🏔️
    role: ddgTeam[1].role, // Navigator
    color: ddgTeam[1].color, // #1565C0
    pack: "Pack TBD",
    capacity: 50,
    baseWeightGoal: 0,
    packNotes:
      "Battle-tested from April detox trip. Carries nav gear + weather kit.",
  },
  {
    id: ddgTeam[2].id, // gunnar
    name: ddgTeam[2].name, // Gunnar
    emoji: ddgTeam[2].emoji, // ⚡
    role: ddgTeam[2].role, // Pace Setter
    color: ddgTeam[2].color, // #F57C00
    pack: "Pack TBD",
    capacity: 50,
    baseWeightGoal: 0,
    packNotes: "Ultralight-ish build. Carries tech + comms + first aid.",
  },
];

const getWeightBucket = (item) => {
  const explicit = item?.weightBucket;
  if (
    explicit === "carried" ||
    explicit === "worn" ||
    explicit === "consumable"
  )
    return explicit;

  // Heuristic fallback for legacy data: treat "Consumable" spec as consumable weight.
  const specs = Array.isArray(item?.specs) ? item.specs : [];
  const hasConsumableSpec = specs.some((s) =>
    String(s).toLowerCase().includes("consumable")
  );
  if (hasConsumableSpec) return "consumable";

  return "carried";
};

export default function GearHeader({
  activeHikerId,
  activeHiker,
  loadouts,
  inventoryMap,
  totalEquippedWeight,
  carriedWeight,
  weightStatus,
  baseWeightGoal,
  supabaseReady,
  syncError,
}) {
  return (
    <>
      {/* HUD (Top Navigation / Tabs) */}
      <div className="gear-rpg-hud">
        <div className="party-roster">
          <div className="party-label">Party</div>
          <div className="party-members" role="tablist">
            {HIKERS.map((h) => {
              const isSelected = h.id === activeHikerId;
              // Add callback via props later if manual switching is needed here.
              return (
                <button
                  key={h.id}
                  role="tab"
                  aria-selected={isSelected}
                  className={`hiker-tab ${isSelected ? "active" : ""}`}
                  style={{ "--hiker-color": h.color }}
                  onClick={() => {}} // Stub - pass down callback if necessary
                >
                  <span className="hiker-emoji">{h.emoji}</span>
                  <span className="hiker-name">{h.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Sync</div>
          <div className="summary-value">
            {supabaseReady ? "Online" : "Offline"}
          </div>
          <div className="summary-sub">
            {syncError ? syncError.message : "Supabase"}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Team Snapshot</div>
          <div className="summary-tags">
            {HIKERS.map((h) => {
              const loadout = loadouts[h.id] || new Set();
              let w = 0;
              loadout.forEach((id) => {
                const i = inventoryMap.get(id);
                if (i && getWeightBucket(i) === "carried") {
                  w += i.weightVal || 0;
                }
              });
              return (
                <span
                  key={h.id}
                  className={`team-weight-chip ${
                    h.id === activeHikerId ? "active" : ""
                  }`}
                  style={{ "--chip-color": h.color }}
                >
                  {h.emoji} {w.toFixed(1)}lb
                </span>
              );
            })}
          </div>
          <div className="summary-sub">
            Total equipped {totalEquippedWeight.toFixed(1)} lb
          </div>
        </div>
      </div>

      {/* Active Hiker Stats Header - DDG Enhanced */}
      <header className="gear-rpg-header ddg-gear-header">
        <div
          className="gear-avatar-card"
          style={{ "--hiker-color": activeHiker.color }}
        >
          <div className="gear-avatar-crest">{activeHiker.emoji}</div>
          <div className="gear-avatar-content">
            <p className="eyebrow">{activeHiker.role}</p>
            <h3>{activeHiker.name}'s Loadout</h3>
            <div className="gear-avatar-meta">
              <span className={`status-${weightStatus}`}>
                {carriedWeight.toFixed(1)} lb base / {baseWeightGoal || "—"} lb Goal
              </span>
              <span className="pack-info">{activeHiker.pack}</span>
            </div>
            {activeHiker.packNotes && (
              <p className="pack-notes">{activeHiker.packNotes}</p>
            )}
          </div>
        </div>

        {/* Team Weight Comparison */}
        <div className="ddg-team-weights">
          <span className="team-weights-label">Team Weights:</span>
          {HIKERS.map((h) => {
            const loadout = loadouts[h.id] || new Set();
            let w = 0;
            loadout.forEach((id) => {
              const i = inventoryMap.get(id);
              if (i && getWeightBucket(i) === "carried") {
                w += i.weightVal || 0;
              }
            });
            return (
              <span
                key={h.id}
                className={`team-weight-chip ${
                  h.id === activeHikerId ? "active" : ""
                }`}
                style={{ "--chip-color": h.color }}
              >
                {h.emoji} {w.toFixed(1)}lb
              </span>
            );
          })}
        </div>
      </header>
    </>
  );
}

GearHeader.propTypes = {
  activeHikerId: PropTypes.string.isRequired,
  activeHiker: PropTypes.object.isRequired,
  loadouts: PropTypes.object.isRequired,
  inventoryMap: PropTypes.object.isRequired,
  totalEquippedWeight: PropTypes.number.isRequired,
  carriedWeight: PropTypes.number.isRequired,
  weightStatus: PropTypes.string.isRequired,
  baseWeightGoal: PropTypes.number,
  supabaseReady: PropTypes.bool.isRequired,
  syncError: PropTypes.object,
};
