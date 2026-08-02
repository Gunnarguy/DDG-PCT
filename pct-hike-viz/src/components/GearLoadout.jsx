import PropTypes from "prop-types";
import { SLOT_METADATA } from "../utils/gearUtils";

export default function GearLoadout({
  activeHiker,
  isSelf,
  equippedItems,
  itemsByCategory,
  currentLoadoutIds,
  formatWeightLabel,
  toggleItem,
  renderSpecChips,
  getDisplaySpecs,
  isDetailExpanded,
  toggleDetailExpanded,
  renderSourceChips,
}) {
  return (
    <div className="gear-panel gear-loadout">
      <div className="panel-header">
        <h4>
          🎒 {activeHiker.name}&apos;s Pack {isSelf ? "" : "(Remote view)"}
        </h4>
        <span className="panel-subtitle">
          Live sync • {equippedItems.length} items
        </span>
      </div>

      <div className="loadout-grid">
        {Object.entries(itemsByCategory).map(([category, items]) => {
          const equippedInCat = items.filter((i) =>
            currentLoadoutIds.has(i.id)
          );
          if (equippedInCat.length === 0) return null;

          const meta = SLOT_METADATA[category] || {
            icon: "📦",
            stat: "Misc",
          };
          const categoryWeight = equippedInCat.reduce(
            (sum, i) => sum + (i.weightVal || 0),
            0
          );

          return (
            <div key={category} className="loadout-slot">
              <div className="slot-header">
                <span className="slot-icon">{meta.icon}</span>
                <span className="slot-name">{category}</span>
                <span className="slot-weight">
                  {formatWeightLabel(categoryWeight)}
                </span>
              </div>
              <div className="slot-items">
                {equippedInCat.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rpg-item-card"
                    onClick={() => toggleItem(item.id)}
                    title={`Click to unequip ${item.name}`}
                    aria-label={`Unequip ${item.name}, ${
                      item.weightLabel || item.weight
                    }`}
                  >
                    <div className="card-top">
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
                    {renderSpecChips(getDisplaySpecs(item))}
                    <span
                      className={`item-detail ${
                        isDetailExpanded(item.id)
                          ? "item-detail--expanded"
                          : "item-detail--clamped"
                      }`}
                    >
                      {item.detail}
                    </span>
                    {item.detail && item.detail.length > 120 && (
                      <button
                        type="button"
                        className="item-detail-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDetailExpanded(item.id);
                        }}
                      >
                        {isDetailExpanded(item.id) ? "Less" : "More"}
                      </button>
                    )}
                    {renderSourceChips(item.sourceIds)}
                    <span className="item-action item-action--remove">
                      × Unequip
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {equippedItems.length === 0 && (
          <div className="empty-state-large">
            <span className="empty-icon">🎒</span>
            <p>Pack is empty</p>
            <p className="sub">
              Click <strong>+ Equip</strong> on items in the Gear Shed →
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

GearLoadout.propTypes = {
  activeHiker: PropTypes.object.isRequired,
  isSelf: PropTypes.bool.isRequired,
  equippedItems: PropTypes.array.isRequired,
  itemsByCategory: PropTypes.object.isRequired,
  currentLoadoutIds: PropTypes.object.isRequired,
  formatWeightLabel: PropTypes.func.isRequired,
  toggleItem: PropTypes.func.isRequired,
  renderSpecChips: PropTypes.func.isRequired,
  getDisplaySpecs: PropTypes.func.isRequired,
  isDetailExpanded: PropTypes.func.isRequired,
  toggleDetailExpanded: PropTypes.func.isRequired,
  renderSourceChips: PropTypes.func.isRequired,
};
