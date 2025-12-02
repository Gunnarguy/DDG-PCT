// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE CHIPS COMPONENT
// Reusable citation display for any component referencing resourcesIndex sources
// ═══════════════════════════════════════════════════════════════════════════════
import PropTypes from 'prop-types';
import { resourcesById } from '../data/resourcesIndex';

/**
 * Resolve source IDs to full resource objects
 * @param {string[]} ids - Array of source IDs from resourcesIndex
 * @returns {object[]} Array of resolved resource objects
 */
const getSourcesFromIds = (ids = []) => ids
  .map((id) => resourcesById[id])
  .filter(Boolean);

/**
 * Get the appropriate icon for a source based on its category
 * @param {object} source - Resource object from resourcesIndex
 * @returns {string} Emoji icon
 */
const getSourceIcon = (source) => {
  if (source.icon) return source.icon;
  
  const categoryIcons = {
    'reddit': '💬',
    'official': '🏛️',
    'trip-report': '📖',
    'guide': '🗺️',
    'transport': '🚐',
    'permits': '📋',
    'gear': '🎒',
    'resupply': '📦',
    'navigation': '📍',
    'video': '🎬',
    'travel': '✈️',
    'planning': '📅',
    'experience': '🧘',
    'water': '💧',
    'logistics': '🚐'
  };
  
  if (source.type === 'internal') return '📋';
  return categoryIcons[source.category] || '🔗';
};

/**
 * SourceChips - Renders clickable source citation chips
 * 
 * @param {string[]} sourceIds - Array of source IDs to display
 * @param {string} size - 'small' | 'medium' (default: 'small')
 * @param {number} maxShow - Maximum chips to show before truncating (default: 5)
 * @param {boolean} showIcons - Whether to show category icons (default: true)
 */
function SourceChips({ sourceIds = [], size = 'small', maxShow = 5, showIcons = true }) {
  const sources = getSourcesFromIds(sourceIds);
  if (!sources.length) return null;

  const visibleSources = sources.slice(0, maxShow);
  const hiddenCount = sources.length - maxShow;

  return (
    <div 
      className={`source-chips source-chips--${size}`}
      aria-label="Source references" 
      role="list"
    >
      {visibleSources.map((source) => {
        const icon = showIcons ? getSourceIcon(source) : null;
        const label = source.title || source.id;
        
        // Build rich tooltip with excerpt if available
        const tooltip = source.excerpt 
          ? `${source.title}\n\n"${source.excerpt}"`
          : source.source || label;
        
        // External sources get links, internal docs just display
        return source.url ? (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className={`source-chip source-chip--${source.category || source.type}`}
            title={tooltip}
            role="listitem"
          >
            {icon && <span className="source-chip__icon">{icon}</span>}
            <span className="source-chip__label">{label}</span>
          </a>
        ) : (
          <span 
            key={source.id} 
            className="source-chip source-chip--internal"
            title={tooltip} 
            role="listitem"
          >
            {icon && <span className="source-chip__icon">{icon}</span>}
            <span className="source-chip__label">{label}</span>
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <span className="source-chip source-chip--more" title={`${hiddenCount} more sources`}>
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

SourceChips.propTypes = {
  sourceIds: PropTypes.arrayOf(PropTypes.string),
  size: PropTypes.oneOf(['small', 'medium']),
  maxShow: PropTypes.number,
  showIcons: PropTypes.bool
};

export default SourceChips;
