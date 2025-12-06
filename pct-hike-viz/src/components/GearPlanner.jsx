import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { resourcesById } from '../data/resourcesIndex';
import { ddgTeam } from '../data/planContent';
import supabase, { supabaseReady } from '../lib/supabase';

// Category metadata for RPG-style gear slots
// Maps module labels to icons and stat names for the loadout UI
const SLOT_METADATA = {
  'Shelter + Sleep': { icon: '🛖', stat: 'Fortitude', color: '#6B4423' },
  'Kitchen + Hydration': { icon: '🔥', stat: 'Sustenance', color: '#E65100' },
  'Navigation + Tech': { icon: '🧭', stat: 'Intel', color: '#1565C0' },
  'Layers + Fuel Buffer': { icon: '🧥', stat: 'Resilience', color: '#7B1FA2' },
  'Safety + Hygiene': { icon: '🩹', stat: 'Endurance', color: '#C62828' },
  'Custom': { icon: '✨', stat: 'Wildcard', color: '#F57C00' }
};

// DDG Team pack configurations - built from ddgTeam data
const HIKERS = [
  { 
    id: ddgTeam[0].id,           // dan
    name: ddgTeam[0].name,       // Dan  
    emoji: ddgTeam[0].emoji,     // 🧔
    role: ddgTeam[0].role,       // Trail Boss
    color: ddgTeam[0].color,     // #2E7D32
    pack: 'Pack TBD', 
    capacity: 60, 
    baseWeightGoal: 0,
    packNotes: 'Comfort-focused hauler for group gear. Carries shared shelter if needed.'
  },
  { 
    id: ddgTeam[1].id,           // drew
    name: ddgTeam[1].name,       // Drew
    emoji: ddgTeam[1].emoji,     // 🏔️
    role: ddgTeam[1].role,       // Navigator
    color: ddgTeam[1].color,     // #1565C0
    pack: 'Pack TBD', 
    capacity: 50, 
    baseWeightGoal: 0,
    packNotes: 'Battle-tested from April detox trip. Carries nav gear + weather kit.'
  },
  { 
    id: ddgTeam[2].id,           // gunnar
    name: ddgTeam[2].name,       // Gunnar
    emoji: ddgTeam[2].emoji,     // ⚡
    role: ddgTeam[2].role,       // Pace Setter
    color: ddgTeam[2].color,     // #F57C00
    pack: 'Pack TBD', 
    capacity: 50, 
    baseWeightGoal: 0,
    packNotes: 'Ultralight-ish build. Carries tech + comms + first aid.'
  }
];

const getSourcesFromIds = (ids = []) => ids
  .map((id) => resourcesById[id])
  .filter(Boolean);

// Render source citation chips with icons and links
// Shows the full breadth of sources from Original-DDG-PCT-PDF.txt
const renderSourceChips = (ids = []) => {
  const sources = getSourcesFromIds(ids);
  if (!sources.length) return null;

  return (
    <div className="gear-citations" aria-label="Source references" role="list">
      {sources.map((source) => {
        // Use icon if available, otherwise derive from category
        const icon = source.icon || (source.category === 'reddit' ? '💬' : 
                                     source.category === 'official' ? '🏛️' :
                                     source.type === 'internal' ? '📋' : '🔗');
        const label = source.title || source.id;
        // Build a rich tooltip with excerpt if available
        const tooltip = source.excerpt 
          ? `${source.title}\n\n${source.excerpt}`
          : source.source || label;
        
        // External sources get links, internal docs just display
        return source.url ? (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className={`gear-citation-chip gear-citation-chip--${source.category || source.type}`}
            title={tooltip}
            role="listitem"
          >
            <span className="citation-icon">{icon}</span>
            <span className="citation-label">{label}</span>
          </a>
        ) : (
          <span 
            key={source.id} 
            className={`gear-citation-chip gear-citation-chip--internal`}
            title={tooltip} 
            role="listitem"
          >
            <span className="citation-icon">{icon}</span>
            <span className="citation-label">{label}</span>
          </span>
        );
      })}
    </div>
  );
};

const normalizeCustomItem = (row) => ({
  id: `custom-${row.id ?? row.localId ?? Date.now()}`,
  name: row.name,
  detail: row.detail || 'Custom added item',
  weight: row.weight_label || (row.weight_val ? `${row.weight_val} lb` : '0 lb'),
  weightVal: Number(row.weight_val ?? row.weightVal ?? 0),
  category: row.category || 'Custom',
  moduleId: row.module_id || 'custom',
  isCustom: true,
  sourceIds: row.source_ids || []
});

function GearPlanner({ data, currentUser }) {
  // 1. Initialize Master Inventory from the provided data
  const initialInventory = useMemo(() => {
    return data.modules.flatMap((module) =>
      module.items.map((item) => ({
        ...item,
        category: module.label,
        moduleId: module.id,
        weightVal: parseFloat(item.weight) || 0,
        isCustom: false
      }))
    );
  }, [data]);

  const [inventory, setInventory] = useState(initialInventory);
  const defaultLoadouts = useMemo(() => ({
    dan: new Set(),
    drew: new Set(),
    gunnar: new Set(initialInventory.filter((i) => i.defaultPacked).map((i) => i.id))
  }), [initialInventory]);

  // 2. State for each hiker's loadout (live synced)
  const [loadouts, setLoadouts] = useState(defaultLoadouts);
  const [syncError, setSyncError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [activeHikerId, setActiveHikerId] = useState(currentUser || 'gunnar');
  const activeHiker = HIKERS.find(h => h.id === activeHikerId);

  // Custom item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemWeight, setNewItemWeight] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Custom');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Sync loadouts from Supabase and listen for realtime updates.
  useEffect(() => {
    let channel;
    let isMounted = true;

    if (!supabaseReady) {
      return undefined;
    }

    const inflateLoadouts = (rows = []) => {
      const next = { dan: new Set(), drew: new Set(), gunnar: new Set() };
      rows.forEach((row) => {
        if (next[row.hiker_id]) {
          next[row.hiker_id] = new Set(row.item_ids || []);
        }
      });
      // Preserve defaults if remote payload empty
      return {
        dan: next.dan.size ? next.dan : new Set(defaultLoadouts.dan),
        drew: next.drew.size ? next.drew : new Set(defaultLoadouts.drew),
        gunnar: next.gunnar.size ? next.gunnar : new Set(defaultLoadouts.gunnar)
      };
    };

    const hydrate = async () => {
      setIsSyncing(true);
      const { data: remote, error } = await supabase.from('gear_loadouts').select('*');
      if (!isMounted) return;
      if (!error && remote) {
        setLoadouts(inflateLoadouts(remote));
        setSyncError(null);
      } else if (error) {
        setSyncError(error);
      }
      setIsSyncing(false);
    };

    hydrate();

    channel = supabase
      .channel('gear_loadouts_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gear_loadouts' }, (payload) => {
        setLoadouts((prev) => ({
          ...prev,
          [payload.new.hiker_id]: new Set(payload.new.item_ids || [])
        }));
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [defaultLoadouts]);

  // Custom items: fetch and live-sync shared inventory
  useEffect(() => {
    if (!supabaseReady) return undefined;
    let channel;
    let isMounted = true;

    const upsertItem = (item) => {
      setInventory((prev) => {
        const filtered = prev.filter((i) => i.id !== item.id);
        return [...filtered, item];
      });
    };

    const removeItem = (id) => {
      setInventory((prev) => prev.filter((i) => i.id !== id));
    };

    const hydrateCustom = async () => {
      const { data, error } = await supabase.from('custom_items').select('*');
      if (!isMounted) return;
      if (!error && data) {
        data.map(normalizeCustomItem).forEach(upsertItem);
        setSyncError(null);
      } else if (error) {
        setSyncError(error);
      }
    };

    hydrateCustom();

    channel = supabase
      .channel('custom_items_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_items' }, (payload) => {
        const eventType = payload.eventType || payload.type;
        if (eventType === 'DELETE') {
          removeItem(`custom-${payload.old.id}`);
          return;
        }
        const item = normalizeCustomItem(payload.new);
        upsertItem(item);
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
  // Actions
  const persistLoadout = async (nextSet, hikerId, previousSet) => {
    if (!supabaseReady) {
      setSyncError(new Error('Supabase not configured; changes are local only.'));
      return;
    }

    const { error } = await supabase.from('gear_loadouts').upsert({
      hiker_id: hikerId,
      item_ids: Array.from(nextSet)
    });
    if (error) {
      setSyncError(error);
      // rollback
      setLoadouts((prev) => ({ ...prev, [hikerId]: new Set(previousSet) }));
    } else {
      setSyncError(null);
    }
  };

  const toggleItem = async (itemId) => {
    const previous = loadouts[activeHikerId] || new Set();
    const previousSnapshot = new Set(previous);
    const updatedSet = new Set(previous);
    if (updatedSet.has(itemId)) {
      updatedSet.delete(itemId);
    } else {
      updatedSet.add(itemId);
    }

    setLoadouts((prev) => ({ ...prev, [activeHikerId]: updatedSet }));
    await persistLoadout(updatedSet, activeHikerId, previousSnapshot);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemWeight) return;

    const weightVal = parseFloat(newItemWeight) || 0;
    const baseItem = {
      name: newItemName,
      detail: 'Custom added item',
      weight: `${weightVal} lb`,
      weightVal,
      category: newItemCategory,
      moduleId: 'custom',
      isCustom: true,
      sourceIds: []
    };

    if (!supabaseReady) {
      const localItem = { ...baseItem, id: `custom-local-${Date.now()}` };
      setInventory((prev) => [...prev, localItem]);
      setLoadouts((prev) => {
        const currentLoadout = new Set(prev[activeHikerId]);
        currentLoadout.add(localItem.id);
        return { ...prev, [activeHikerId]: currentLoadout };
      });
      setNewItemName('');
      setNewItemWeight('');
      return;
    }

    const { data, error } = await supabase
      .from('custom_items')
      .insert([
        {
          name: baseItem.name,
          detail: baseItem.detail,
          weight_val: weightVal,
          weight_label: baseItem.weight,
          category: baseItem.category,
          module_id: baseItem.moduleId,
          created_by: currentUser,
          source_ids: baseItem.sourceIds
        }
      ])
      .select()
      .single();

    if (error) {
      setSyncError(error);
      // fallback local
      const localItem = { ...baseItem, id: `custom-local-${Date.now()}` };
      setInventory((prev) => [...prev, localItem]);
      setLoadouts((prev) => {
        const currentLoadout = new Set(prev[activeHikerId]);
        currentLoadout.add(localItem.id);
        return { ...prev, [activeHikerId]: currentLoadout };
      });
    } else if (data) {
      const saved = normalizeCustomItem(data);
      setInventory((prev) => [...prev, saved]);
      setLoadouts((prev) => {
        const currentLoadout = new Set(prev[activeHikerId]);
        currentLoadout.add(saved.id);
        return { ...prev, [activeHikerId]: currentLoadout };
      });
      setSyncError(null);
    }

    setNewItemName('');
    setNewItemWeight('');
  };

  // Derived Data for Active Hiker
  const currentLoadoutIds = loadouts[activeHikerId] || new Set();
  const equippedItems = inventory.filter(item => currentLoadoutIds.has(item.id));
  const currentWeight = equippedItems.reduce((sum, item) => sum + item.weightVal, 0);
  const weightStatus = currentWeight <= activeHiker.baseWeightGoal ? 'good' : 'warn';
  const isSelf = activeHikerId === currentUser;

  const categories = useMemo(() => ['All', ...Object.keys(SLOT_METADATA)], []);

  const matchesFilters = (item) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesTerm = !term || item.name.toLowerCase().includes(term) || item.detail?.toLowerCase?.().includes(term);
    const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesTerm && matchesCat;
  };

  // Grouping for display
  const itemsByCategory = useMemo(() => {
    const groups = {};
    inventory.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [inventory]);

  return (
    <div className="gear-planner">
      {/* Hiker Switcher - DDG Team Style */}
      <div className="hiker-switcher ddg-hiker-switcher">
        {HIKERS.map((hiker) => {
          const loadout = loadouts[hiker.id];
          const loadoutWeight = inventory
            .filter(i => loadout.has(i.id))
            .reduce((sum, i) => sum + i.weightVal, 0);
          const isActive = activeHikerId === hiker.id;
          
          return (
            <button
              key={hiker.id}
              type="button"
              className={`hiker-tab ddg-hiker-tab ${isActive ? 'is-active' : ''}`}
              style={{ '--hiker-color': hiker.color }}
              onClick={() => setActiveHikerId(hiker.id)}
            >
              <span className="hiker-emoji">{hiker.emoji}</span>
              <div className="hiker-info">
                <span className="hiker-name">{hiker.name}</span>
                <span className="hiker-role">{hiker.role}</span>
              </div>
              <div className="hiker-weight-badge">
                <span className={loadoutWeight <= hiker.baseWeightGoal ? 'weight-good' : 'weight-warn'}>
                  {loadoutWeight.toFixed(1)} lb
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Loadout Summary */}
      <div className="gear-summary-grid">
        <div className="summary-card">
          <div className="summary-label">Current Weight</div>
          <div className={`summary-value status-${weightStatus}`}>{currentWeight.toFixed(1)} lb</div>
          <div className="summary-sub">Goal {activeHiker.baseWeightGoal} lb</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Items Equipped</div>
          <div className="summary-value">{equippedItems.length}</div>
          <div className="summary-sub">Live synced</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Sync</div>
          <div className="summary-value">{supabaseReady ? 'Online' : 'Offline'}</div>
          <div className="summary-sub">{syncError ? syncError.message : 'Supabase'}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Team Snapshot</div>
          <div className="summary-tags">
            {HIKERS.map((h) => {
              const loadout = loadouts[h.id] || new Set();
              const w = inventory.filter(i => loadout.has(i.id)).reduce((s, i) => s + i.weightVal, 0);
              return (
                <span
                  key={h.id}
                  className={`team-weight-chip ${h.id === activeHikerId ? 'active' : ''}`}
                  style={{ '--chip-color': h.color }}
                >
                  {h.emoji} {w.toFixed(1)}lb
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Hiker Stats Header - DDG Enhanced */}
      <header className="gear-rpg-header ddg-gear-header">
        <div className="gear-avatar-card" style={{ '--hiker-color': activeHiker.color }}>
          <div className="gear-avatar-crest">{activeHiker.emoji}</div>
          <div className="gear-avatar-content">
            <p className="eyebrow">{activeHiker.role}</p>
            <h3>{activeHiker.name}'s Loadout</h3>
            <div className="gear-avatar-meta">
              <span className={`status-${weightStatus}`}>
                {currentWeight.toFixed(1)} lb / {activeHiker.baseWeightGoal} lb Goal
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
          {HIKERS.map(h => {
            const loadout = loadouts[h.id] || new Set();
            const w = inventory.filter(i => loadout.has(i.id)).reduce((s, i) => s + i.weightVal, 0);
            return (
              <span 
                key={h.id} 
                className={`team-weight-chip ${h.id === activeHikerId ? 'active' : ''}`}
                style={{ '--chip-color': h.color }}
              >
                {h.emoji} {w.toFixed(1)}lb
              </span>
            );
          })}
        </div>
      </header>

      {isSyncing && (
        <p className="note" aria-live="polite">Syncing loadouts with mission control…</p>
      )}
      {syncError && (
        <p className="error-text">Live sync offline: {syncError.message}</p>
      )}

      <div className="gear-rpg-interface">
        {/* Left Column: The "Shed" (Available Gear) */}
        <div className="gear-panel gear-inventory">
          <div className="panel-header">
            <h4>🏚️ Gear Shed</h4>
            <span className="panel-subtitle">
              {isSelf ? 'Click to equip →' : `Editing ${activeHiker.name}'s pack`}
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
                  className={`pill ${categoryFilter === cat ? 'active' : ''}`}
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
                .filter(i => !currentLoadoutIds.has(i.id))
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
                      aria-label={`Equip ${item.name}, ${item.weight}`}
                    >
                      <span className="item-icon">{SLOT_METADATA[category]?.icon || '📦'}</span>
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-weight">{item.weight}</span>
                      </div>
                      <span className="item-action item-action--add">+ Equip</span>
                    </button>
                  ))}
                </div>
              );
            })}
            {inventory.every(i => currentLoadoutIds.has(i.id)) && (
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
                type="number"
                placeholder="Lbs"
                step="0.1"
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
                {Object.keys(SLOT_METADATA).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button type="submit" className="rpg-btn-add">Create & Equip</button>
            </div>
          </form>
        </div>

        {/* Right Column: Active Pack */}
        <div className="gear-panel gear-loadout">
          <div className="panel-header">
            <h4>🎒 {activeHiker.name}'s Pack {isSelf ? '' : '(Remote view)'}</h4>
            <span className="panel-subtitle">Live sync • {equippedItems.length} items</span>
          </div>

          <div className="loadout-grid">
            {Object.entries(itemsByCategory).map(([category, items]) => {
              const equippedInCat = items.filter(i => currentLoadoutIds.has(i.id));
              if (equippedInCat.length === 0) return null;
              
              const meta = SLOT_METADATA[category] || { icon: '📦', stat: 'Misc' };
              
              return (
                <div key={category} className="loadout-slot">
                  <div className="slot-header">
                    <span className="slot-icon">{meta.icon}</span>
                    <span className="slot-name">{category}</span>
                  </div>
                  <div className="slot-items">
                    {equippedInCat.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="rpg-item-card"
                        onClick={() => toggleItem(item.id)}
                        title={`Click to unequip ${item.name}`}
                        aria-label={`Unequip ${item.name}, ${item.weight}`}
                      >
                        <div className="card-top">
                          <span className="item-name">{item.name}</span>
                          <span className="item-weight">{item.weight}</span>
                        </div>
                        <span className="item-detail">{item.detail}</span>
                        {renderSourceChips(item.sourceIds)}
                        <span className="item-action item-action--remove">× Unequip</span>
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
                <p className="sub">Click <strong>+ Equip</strong> on items in the Gear Shed →</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

GearPlanner.propTypes = {
  data: PropTypes.object.isRequired,
  currentUser: PropTypes.string
};

GearPlanner.defaultProps = {
  currentUser: 'gunnar'
};

export default GearPlanner;
