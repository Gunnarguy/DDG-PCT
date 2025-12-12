import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { resourcesById } from '../data/resourcesIndex';
import { ddgTeam } from '../data/planContent';
import supabase, { supabaseReady, getHikerIdFromEmail } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Weight helpers
// - Built-in gear data is currently expressed as strings (e.g. "0.3 lb").
// - To support more granular specs over time (oz/g) and reduce UI clunk,
//   we parse + format weights consistently here.
const parseWeightToLbs = (raw) => {
  if (raw == null) return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;

  const text = String(raw).trim().toLowerCase();
  if (!text) return 0;

  // Accept: "0.3", "0.3lb", "0.3 lb", "4 oz", "120g", "120 g"
  const match = text.match(/([0-9]*\.?[0-9]+)\s*(lb|lbs|pound|pounds|oz|ounce|ounces|g|gram|grams)?/);
  if (!match) return 0;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;
  const unit = match[2];

  if (!unit || unit === 'lb' || unit === 'lbs' || unit === 'pound' || unit === 'pounds') return value;
  if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') return value / 16;
  if (unit === 'g' || unit === 'gram' || unit === 'grams') return value / 453.59237;
  return value;
};

const formatWeightLabel = (lbs) => {
  const safe = Number.isFinite(lbs) ? lbs : 0;
  if (safe <= 0) return '0';
  // Show ounces for tiny items; pounds for everything else.
  if (safe < 0.1) return `${(safe * 16).toFixed(1)} oz`;
  return `${safe.toFixed(1)} lb`;
};

const getItemWeightMeta = (item) => {
  // Optional fields for more granular lists:
  // - qty: number
  // - weightEachLbs: number (preferred), or weightEach (string) as fallback
  const qty = Number(item?.qty ?? 1) || 1;
  const eachLbs =
    Number.isFinite(item?.weightEachLbs)
      ? item.weightEachLbs
      : parseWeightToLbs(item?.weightEach);

  if (eachLbs > 0) {
    const total = eachLbs * qty;
    return {
      qty,
      totalLbs: total,
      label: qty > 1 ? `${formatWeightLabel(eachLbs)} × ${qty} = ${formatWeightLabel(total)}` : formatWeightLabel(total)
    };
  }

  const total = parseWeightToLbs(item?.weight);
  return {
    qty,
    totalLbs: total,
    label: item?.weight || formatWeightLabel(total)
  };
};

// Weight accounting buckets (for more realistic base-weight comparisons).
// - carried: counts against base-weight goal
// - worn: shown separately (still "equipped", but not carried weight)
// - consumable: shown separately (fuel/food/etc)
const getWeightBucket = (item) => {
  const explicit = item?.weightBucket;
  if (explicit === 'carried' || explicit === 'worn' || explicit === 'consumable') return explicit;

  // Heuristic fallback for legacy data: treat "Consumable" spec as consumable weight.
  const specs = Array.isArray(item?.specs) ? item.specs : [];
  const hasConsumableSpec = specs.some((s) => String(s).toLowerCase().includes('consumable'));
  if (hasConsumableSpec) return 'consumable';

  return 'carried';
};

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
  weightLabel: row.weight_label || undefined,
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
        // Compute weight metadata once so we can display consistently.
        // (This also supports optional qty/weightEachLbs fields.)
        ...(() => {
          const meta = getItemWeightMeta(item);
          return {
            weightVal: meta.totalLbs,
            weightLabel: meta.label
          };
        })(),
        ...item,
        category: module.label,
        moduleId: module.id,
        isCustom: false
      }))
    );
  }, [data]);

  const [inventory, setInventory] = useState(initialInventory);
  const defaultLoadouts = useMemo(() => ({
    dan: new Set(),
    drew: new Set(),
    gunnar: new Set()
  }), []);

  // 2. State for each hiker's loadout (live synced)
  const [loadouts, setLoadouts] = useState(defaultLoadouts);
  const [syncError, setSyncError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-detect hiker from auth
  const { user } = useAuth();
  const detectedHikerId = user?.email ? getHikerIdFromEmail(user.email) : null;
  const effectiveCurrentUser = detectedHikerId || currentUser || 'gunnar';

  // If a user clicks another hiker tab, we keep that selection until they
  // click back. Otherwise, follow the signed-in user's identity automatically.
  const [manualHikerId, setManualHikerId] = useState(null);
  const activeHikerId = manualHikerId || effectiveCurrentUser;
  const activeHiker = HIKERS.find(h => h.id === activeHikerId);

  // Custom item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemWeight, setNewItemWeight] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Custom');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [expandedDetails, setExpandedDetails] = useState(() => new Set());

  // Sync loadouts from Supabase and listen for realtime updates.
  useEffect(() => {
    let channel;
    let isMounted = true;

    if (!supabaseReady) {
      return undefined;
    }

    const inflateLoadouts = (rows = []) => {
      const next = { dan: new Set(), drew: new Set(), gunnar: new Set() };
      const seen = new Set();
      rows.forEach((row) => {
        if (next[row.hiker_id]) {
          next[row.hiker_id] = new Set(row.item_ids || []);
          seen.add(row.hiker_id);
        }
      });
      // Preserve defaults only when there is no remote row for that hiker.
      // IMPORTANT: an intentionally empty pack ([]) must stay empty after refresh.
      return {
        dan: seen.has('dan') ? next.dan : new Set(defaultLoadouts.dan),
        drew: seen.has('drew') ? next.drew : new Set(defaultLoadouts.drew),
        gunnar: seen.has('gunnar') ? next.gunnar : new Set(defaultLoadouts.gunnar)
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
        const eventType = payload?.eventType || payload?.type;
        if (eventType === 'DELETE') return;
        const nextRow = payload?.new;
        if (!nextRow?.hiker_id) return;

        setLoadouts((prev) => ({
          ...prev,
          [nextRow.hiker_id]: new Set(nextRow.item_ids || [])
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
      item_ids: Array.from(nextSet),
      updated_at: new Date().toISOString()
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

    const rawWeight = String(newItemWeight).trim();
    const hasUnit = /[a-z]/i.test(rawWeight);
    const weightLabel = hasUnit ? rawWeight : `${rawWeight} lb`;
    const weightVal = parseWeightToLbs(weightLabel);
    const baseItem = {
      name: newItemName,
      detail: 'Custom added item',
      weight: weightLabel,
      weightVal,
      weightLabel,
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
  const baseWeightGoal = Number(activeHiker.baseWeightGoal || data?.baseWeightGoalLbs || 0);

  const weights = equippedItems.reduce(
    (acc, item) => {
      const bucket = getWeightBucket(item);
      const w = Number(item.weightVal) || 0;
      acc[bucket] += w;
      return acc;
    },
    { carried: 0, worn: 0, consumable: 0 }
  );

  const carriedWeight = weights.carried;
  const wornWeight = weights.worn;
  const consumableWeight = weights.consumable;
  const totalEquippedWeight = carriedWeight + wornWeight + consumableWeight;

  const weightStatus = baseWeightGoal > 0 && carriedWeight > baseWeightGoal ? 'warn' : 'good';
  const isSelf = activeHikerId === effectiveCurrentUser;

  const categories = useMemo(() => ['All', ...Object.keys(SLOT_METADATA)], []);

  const matchesFilters = (item) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesTerm = !term || item.name.toLowerCase().includes(term) || item.detail?.toLowerCase?.().includes(term);
    const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesTerm && matchesCat;
  };

  const isDetailExpanded = (itemId) => expandedDetails.has(itemId);
  const toggleDetailExpanded = (itemId) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const renderSpecChips = (specs = []) => {
    if (!Array.isArray(specs) || specs.length === 0) return null;
    return (
      <div className="gear-specs" aria-label="Gear specs">
        {specs.filter(Boolean).map((spec) => (
          <span key={spec} className="gear-spec-chip">{spec}</span>
        ))}
      </div>
    );
  };

  const getDisplaySpecs = (item) => {
    const base = Array.isArray(item?.specs) ? item.specs.filter(Boolean) : [];
    const bucket = getWeightBucket(item);
    if (bucket === 'worn' && !base.some((s) => String(s).toLowerCase().includes('worn'))) return ['Worn', ...base];
    if (bucket === 'consumable' && !base.some((s) => String(s).toLowerCase().includes('consumable'))) return ['Consumable', ...base];
    return base;
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
      {/* Loadout Viewer - View any team member's gear */}
      <div className="loadout-viewer-header">
        <span className="loadout-viewer-label">View loadout:</span>
        <div className="hiker-switcher ddg-hiker-switcher">
          {HIKERS.map((hiker) => {
          const loadout = loadouts[hiker.id];
          const loadoutWeight = inventory
            .filter(i => loadout.has(i.id))
            .reduce((sum, i) => sum + (getWeightBucket(i) === 'carried' ? i.weightVal : 0), 0);
          const isActive = activeHikerId === hiker.id;
          
          return (
            <button
              key={hiker.id}
              type="button"
              className={`hiker-tab ddg-hiker-tab ${isActive ? 'is-active' : ''}`}
              style={{ '--hiker-color': hiker.color }}
              onClick={() => {
                setManualHikerId(hiker.id);
              }}
            >
              <span className="hiker-emoji">{hiker.emoji}</span>
              <div className="hiker-info">
                <span className="hiker-name">{hiker.name}</span>
                <span className="hiker-role">{hiker.role}</span>
              </div>
              <div className="hiker-weight-badge">
                <span className={baseWeightGoal > 0 && loadoutWeight > baseWeightGoal ? 'weight-warn' : 'weight-good'}>
                  {loadoutWeight.toFixed(1)} lb
                </span>
              </div>
            </button>
          );
        })}
        </div>
      </div>

      {/* Loadout Summary */}
      <div className="gear-summary-grid">
        <div className="summary-card">
          <div className="summary-label">Base Weight (carried)</div>
          <div className={`summary-value status-${weightStatus}`}>{carriedWeight.toFixed(1)} lb</div>
          <div className="summary-sub">Goal {baseWeightGoal || '—'} lb</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Items Equipped</div>
          <div className="summary-value">{equippedItems.length}</div>
          <div className="summary-sub">Worn {wornWeight.toFixed(1)} lb • Consumables {consumableWeight.toFixed(1)} lb</div>
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
              const w = inventory
                .filter(i => loadout.has(i.id))
                .reduce((s, i) => s + (getWeightBucket(i) === 'carried' ? i.weightVal : 0), 0);
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
          <div className="summary-sub">Total equipped {totalEquippedWeight.toFixed(1)} lb</div>
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
                {carriedWeight.toFixed(1)} lb base / {baseWeightGoal || '—'} lb Goal
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
            const w = inventory
              .filter(i => loadout.has(i.id))
              .reduce((s, i) => s + (getWeightBucket(i) === 'carried' ? i.weightVal : 0), 0);
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
                      aria-label={`Equip ${item.name}, ${item.weightLabel || item.weight}`}
                    >
                      <span className="item-icon">{SLOT_METADATA[category]?.icon || '📦'}</span>
                      <div className="item-info">
                        <span className="item-name">
                          {item.name}
                          {Number(item.qty) > 1 ? <span className="item-qty">×{Number(item.qty)}</span> : null}
                        </span>
                        <span className="item-weight">{item.weightLabel || item.weight}</span>
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
              const categoryWeight = equippedInCat.reduce((sum, i) => sum + (i.weightVal || 0), 0);
              
              return (
                <div key={category} className="loadout-slot">
                  <div className="slot-header">
                    <span className="slot-icon">{meta.icon}</span>
                    <span className="slot-name">{category}</span>
                    <span className="slot-weight">{formatWeightLabel(categoryWeight)}</span>
                  </div>
                  <div className="slot-items">
                    {equippedInCat.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="rpg-item-card"
                        onClick={() => toggleItem(item.id)}
                        title={`Click to unequip ${item.name}`}
                        aria-label={`Unequip ${item.name}, ${item.weightLabel || item.weight}`}
                      >
                        <div className="card-top">
                          <span className="item-name">
                            {item.name}
                            {Number(item.qty) > 1 ? <span className="item-qty">×{Number(item.qty)}</span> : null}
                          </span>
                          <span className="item-weight">{item.weightLabel || item.weight}</span>
                        </div>
                        {renderSpecChips(getDisplaySpecs(item))}
                        <span className={`item-detail ${isDetailExpanded(item.id) ? 'item-detail--expanded' : 'item-detail--clamped'}`}>
                          {item.detail}
                        </span>
                        {item.detail && item.detail.length > 120 && (
                          <button
                            type="button"
                            className="item-detail-toggle"
                            onClick={(e) => {
                              // Don't unequip when expanding/collapsing text.
                              e.stopPropagation();
                              toggleDetailExpanded(item.id);
                            }}
                          >
                            {isDetailExpanded(item.id) ? 'Less' : 'More'}
                          </button>
                        )}
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
