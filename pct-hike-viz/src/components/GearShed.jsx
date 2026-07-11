import PropTypes from "prop-types";
import { SLOT_METADATA } from "../utils/gearUtils";

export default function GearShed({
  isSelf,
  activeHiker,
  searchTerm,
  setSearchTerm,
  categories,
  categoryFilter,
  setCategoryFilter,
  itemsByCategory,
  currentLoadoutIds,
  matchesFilters,
  toggleItem,
  inventory,
  handleAddItem,
  newItemName,
  setNewItemName,
  newItemWeight,
  setNewItemWeight,
  newItemCategory,
  setNewItemCategory,
  isGroupGear,
  setIsGroupGear,
  groupAssignee,
  setGroupAssignee,
  HIKERS,
}) {
  return (
    <div className="gear-panel gear-inventory">
      <div className="panel-header">
        <h4>🏚️ Gear Shed</h4>
        <span className="panel-subtitle">
          {isSelf ? "Click to equip →" : `Editing ${activeHiker.name}'s pack`}
        </span>
      </div>
      <div className="gear-filters">
        <input
          type="search"
          className="rpg-input"
          placeholder="Search gear..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="filter-pills" role="list">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="listitem"
              className={`pill ${categoryFilter === cat ? "active" : ""}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="inventory-list">
        {Object.entries(itemsByCategory).map(([category, items]) => {
          const availableItems = items
            .filter((i) => !currentLoadoutIds.has(i.id))
            .filter(matchesFilters);
          if (availableItems.length === 0) return null;

          return (
            <div key={category} className="inventory-group">
              <h5 className="group-header">{category}</h5>
              {availableItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="rpg-item-row rpg-item-row--add"
                  onClick={() => toggleItem(item.id)}
                  title={`Click to equip ${item.name} to ${activeHiker.name}'s pack`}
                  aria-label={`Equip ${item.name}, ${
                    item.weightLabel || item.weight
                  }`}
                >
                  <span className="item-icon">
                    {SLOT_METADATA[category]?.icon || "📦"}
                  </span>
                  <div className="item-info">
                    <span className="item-name">
                      {item.name}
                      {Number(item.qty) > 1 ? (
                        <span className="item-qty">×{Number(item.qty)}</span>
                      ) : null}
                    </span>
                    <span className="item-weight">
                      {item.weightLabel || item.weight}
                    </span>
                  </div>
                  <span className="item-action item-action--add">+ Equip</span>
                </button>
              ))}
            </div>
          );
        })}
        {inventory.every((i) => currentLoadoutIds.has(i.id)) && (
          <p className="empty-state">All items equipped!</p>
        )}
      </div>

      <form className="add-item-form" onSubmit={handleAddItem}>
        <h5>+ Create New Item</h5>
        <div className="form-row">
          <input
            type="text"
            placeholder="Item Name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="rpg-input"
          />
          <input
            type="text"
            placeholder="Weight (e.g., 0.5 lb, 8 oz, 120 g)"
            value={newItemWeight}
            onChange={(e) => setNewItemWeight(e.target.value)}
            className="rpg-input weight-input"
          />
        </div>
        <div className="form-row">
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            className="rpg-select"
          >
            {Object.keys(SLOT_METADATA).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button type="submit" className="rpg-btn-add">
            Create & Equip
          </button>
        </div>
        <div
          className="form-row group-gear-row"
          style={{
            marginTop: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <label
            style={{
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={isGroupGear}
              onChange={(e) => setIsGroupGear(e.target.checked)}
            />
            Group Gear
          </label>
          {isGroupGear && (
            <select
              value={groupAssignee}
              onChange={(e) => setGroupAssignee(e.target.value)}
              className="rpg-select"
              style={{ width: "auto", flex: 1 }}
            >
              {HIKERS.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </form>
    </div>
  );
}

GearShed.propTypes = {
  isSelf: PropTypes.bool.isRequired,
  activeHiker: PropTypes.object.isRequired,
  searchTerm: PropTypes.string.isRequired,
  setSearchTerm: PropTypes.func.isRequired,
  categories: PropTypes.array.isRequired,
  categoryFilter: PropTypes.string.isRequired,
  setCategoryFilter: PropTypes.func.isRequired,
  itemsByCategory: PropTypes.object.isRequired,
  currentLoadoutIds: PropTypes.object.isRequired,
  matchesFilters: PropTypes.func.isRequired,
  toggleItem: PropTypes.func.isRequired,
  inventory: PropTypes.array.isRequired,
  handleAddItem: PropTypes.func.isRequired,
  newItemName: PropTypes.string.isRequired,
  setNewItemName: PropTypes.func.isRequired,
  newItemWeight: PropTypes.string.isRequired,
  setNewItemWeight: PropTypes.func.isRequired,
  newItemCategory: PropTypes.string.isRequired,
  setNewItemCategory: PropTypes.func.isRequired,
  isGroupGear: PropTypes.bool.isRequired,
  setIsGroupGear: PropTypes.func.isRequired,
  groupAssignee: PropTypes.string.isRequired,
  setGroupAssignee: PropTypes.func.isRequired,
  HIKERS: PropTypes.array.isRequired,
};
