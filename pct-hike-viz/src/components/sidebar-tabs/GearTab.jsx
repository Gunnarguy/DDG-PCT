import PropTypes from 'prop-types';
import GearPlanner from "../GearPlanner";

function GearTab({
  currentUserId,
  gearBlueprint,
  packPlanner,
}) {
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
}

GearTab.propTypes = {
  currentUserId: PropTypes.string.isRequired,
  gearBlueprint: PropTypes.object.isRequired,
  packPlanner: PropTypes.object.isRequired,
};

export default GearTab;
