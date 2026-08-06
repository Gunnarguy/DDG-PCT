/**
 * A durable queue for writes that could not reach Supabase.
 *
 * Until now the web app had nowhere to put a failed write. An ops-log entry
 * typed in a dead zone produced an error banner and nothing else; a gear toggle
 * that failed was rolled back, so the checkbox silently flipped itself back
 * after the ten-second timeout. On a route with documented no-signal stretches
 * that is data loss dressed up as a UI glitch — and the iOS app has never
 * behaved that way, because SwiftData holds the record until the server
 * confirms it.
 *
 * This is the web equivalent: entries live in localStorage, survive a reload
 * and a closed tab, and are only removed once the server has taken them.
 *
 * The queue mechanics here are deliberately free of any Supabase import so they
 * can be reasoned about — and tested — on their own. See outboxSenders.js for
 * the code that actually talks to the server.
 */

export const OUTBOX_STORAGE_KEY = "pct-hike-viz::outbox";

export const OUTBOX_KINDS = {
  opsLog: "ops-log",
  gearLoadout: "gear-loadout",
  customItem: "custom-item",
};

/** Human labels for the inspector, so it never shows a raw kind string. */
export const OUTBOX_KIND_LABELS = {
  [OUTBOX_KINDS.opsLog]: "Ops log",
  [OUTBOX_KINDS.gearLoadout]: "Gear loadouts",
  [OUTBOX_KINDS.customItem]: "Custom gear items",
};

const memoryStore = new Map();

/**
 * localStorage when there is one, an in-memory stand-in otherwise. Tests and
 * server-side rendering get a working queue instead of a crash, and a browser
 * with storage disabled degrades to "queued until you close the tab" rather
 * than losing the write outright.
 */
const resolveStorage = (storage) => {
  if (storage) return storage;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Safari in private mode throws on access rather than returning null.
  }
  return {
    getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
    setItem: (key, value) => memoryStore.set(key, value),
    removeItem: (key) => memoryStore.delete(key),
  };
};

const listeners = new Set();

/**
 * Cached snapshot for useSyncExternalStore, which demands a referentially
 * stable value — handing it a freshly built array on every call would spin
 * React forever. Invalidated on every mutation, including ones made in another
 * tab.
 */
let snapshotCache = null;

const invalidateSnapshot = () => {
  snapshotCache = null;
};

const notify = () => {
  invalidateSnapshot();
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A broken subscriber must not stop the others from hearing about it.
    }
  }
};

const readRaw = (storage) => {
  try {
    const raw = resolveStorage(storage).getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt JSON should not brick the app. Losing an unreadable queue is
    // unavoidable; losing the ability to queue anything else is not.
    return [];
  }
};

const writeRaw = (entries, storage) => {
  try {
    resolveStorage(storage).setItem(
      OUTBOX_STORAGE_KEY,
      JSON.stringify(entries),
    );
    return true;
  } catch {
    return false;
  }
};

const makeId = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the counter below.
  }
  return `outbox-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
};

/** Oldest first: the queue drains in the order things actually happened. */
export const listOutbox = (storage) =>
  readRaw(storage).sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );

export const countOutbox = (storage) => readRaw(storage).length;

/**
 * The same list, but the identical array between mutations, so React
 * components can subscribe to it with useSyncExternalStore.
 */
export const getOutboxSnapshot = () => {
  if (!snapshotCache) snapshotCache = listOutbox();
  return snapshotCache;
};

/**
 * Adds a write to the queue.
 *
 * `dedupeKey` collapses repeats that represent the same end state. A gear
 * loadout is the clear case: toggling nine items offline is one final pack
 * contents, not nine uploads, and replaying the intermediate states would be
 * both wasteful and briefly wrong. Ops-log entries pass no dedupe key — each
 * note is its own fact and every one must survive.
 */
export const enqueueOutbox = (
  { kind, payload, title, subtitle = "", dedupeKey = null, meta = null },
  storage,
) => {
  const entries = readRaw(storage);
  const existingIndex = dedupeKey
    ? entries.findIndex((entry) => entry.dedupeKey === dedupeKey)
    : -1;

  const entry = {
    id: existingIndex >= 0 ? entries[existingIndex].id : makeId(),
    kind,
    dedupeKey,
    payload,
    // Bookkeeping the server never sees — currently the placeholder id a
    // custom item was given while offline, so the real id can replace it once
    // the insert goes through.
    meta,
    title,
    subtitle,
    // Keep the original queue time on a replacement so the inspector shows how
    // long this pack change has actually been waiting.
    createdAt:
      existingIndex >= 0
        ? entries[existingIndex].createdAt
        : new Date().toISOString(),
    lastAttemptAt: null,
    lastError: null,
    attempts: 0,
  };

  if (existingIndex >= 0) entries[existingIndex] = entry;
  else entries.push(entry);

  writeRaw(entries, storage);
  notify();
  return entry;
};

export const removeFromOutbox = (id, storage) => {
  const entries = readRaw(storage);
  const remaining = entries.filter((entry) => entry.id !== id);
  if (remaining.length === entries.length) return false;
  writeRaw(remaining, storage);
  notify();
  return true;
};

/** Records a failed send so the inspector can show why, not just that. */
export const recordOutboxAttempt = (id, errorMessage, storage) => {
  const entries = readRaw(storage);
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) return false;
  entry.attempts = (entry.attempts ?? 0) + 1;
  entry.lastAttemptAt = new Date().toISOString();
  entry.lastError = errorMessage ?? null;
  writeRaw(entries, storage);
  notify();
  return true;
};

/**
 * Swaps a placeholder id for the one the server actually assigned.
 *
 * A custom gear item created in a dead zone gets a local id so it can be put
 * into a pack straight away. The server hands out its own id on insert, which
 * would leave every queued pack referring to an item that does not exist.
 * Called once the insert succeeds, before those packs are sent.
 */
export const remapQueuedItemId = (localId, serverId, storage) => {
  if (!localId || serverId == null) return false;
  const entries = readRaw(storage);
  let changed = false;

  for (const entry of entries) {
    if (entry.kind !== OUTBOX_KINDS.gearLoadout) continue;
    const itemIds = entry.payload?.item_ids;
    if (!Array.isArray(itemIds) || !itemIds.includes(localId)) continue;
    entry.payload = {
      ...entry.payload,
      item_ids: itemIds.map((id) => (id === localId ? serverId : id)),
    };
    changed = true;
  }

  if (changed) {
    writeRaw(entries, storage);
    notify();
  }
  return changed;
};

export const clearOutbox = (storage) => {
  resolveStorage(storage).removeItem(OUTBOX_STORAGE_KEY);
  notify();
};

/**
 * Subscribes to queue changes, including changes made in another tab — two
 * windows open on the same trip should not disagree about what is pending.
 */
export const subscribeToOutbox = (listener) => {
  listeners.add(listener);

  const handleStorage = (event) => {
    if (!event || event.key === null || event.key === OUTBOX_STORAGE_KEY) {
      invalidateSnapshot();
      listener();
    }
  };
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined" && window.removeEventListener) {
      window.removeEventListener("storage", handleStorage);
    }
  };
};

/**
 * Tries to send everything queued.
 *
 * `senders` maps a kind to an async function that throws on failure. A kind
 * with no sender is left in the queue untouched rather than dropped — an
 * unknown record is still someone's data.
 *
 * Stops at the first failure of a given kind. If the reason is "no signal" or
 * "not signed in", every later entry of that kind would fail the same way, and
 * hammering the network with the rest of the queue only drains the battery.
 */
export const flushOutbox = async (senders = {}, storage) => {
  // Custom items go first so a pack that contains one is sent after its
  // placeholder id has been replaced with the server's.
  const kindOrder = {
    [OUTBOX_KINDS.customItem]: 0,
    [OUTBOX_KINDS.opsLog]: 1,
    [OUTBOX_KINDS.gearLoadout]: 2,
  };
  const entries = listOutbox(storage).sort(
    (a, b) => (kindOrder[a.kind] ?? 1) - (kindOrder[b.kind] ?? 1),
  );

  const result = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    remapped: [],
  };
  const blockedKinds = new Set();

  for (const entry of entries) {
    const send = senders[entry.kind];
    if (!send || blockedKinds.has(entry.kind)) {
      result.skipped += 1;
      continue;
    }

    // Re-read rather than trusting the snapshot taken at the top of the loop:
    // an earlier send in this same pass may have rewritten this payload (a
    // custom item's placeholder id), and another tab may have removed it
    // outright.
    const fresh = readRaw(storage).find(
      (candidate) => candidate.id === entry.id,
    );
    if (!fresh) {
      result.skipped += 1;
      continue;
    }

    result.attempted += 1;
    try {
      const sendResult = await send(fresh.payload, fresh);
      const localId = fresh.meta?.localId;
      const serverId = sendResult?.id;
      if (localId && serverId != null) {
        remapQueuedItemId(localId, serverId, storage);
        result.remapped.push({ localId, serverId });
      }
      removeFromOutbox(entry.id, storage);
      result.sent += 1;
    } catch (error) {
      const message = error?.message ?? String(error);
      recordOutboxAttempt(entry.id, message, storage);
      result.failed += 1;
      result.errors.push({ id: entry.id, kind: entry.kind, message });
      blockedKinds.add(entry.kind);
    }
  }

  result.remaining = countOutbox(storage);
  return result;
};
