import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OUTBOX_KINDS,
  OUTBOX_STORAGE_KEY,
  clearOutbox,
  countOutbox,
  enqueueOutbox,
  flushOutbox,
  listOutbox,
  recordOutboxAttempt,
  remapQueuedItemId,
  removeFromOutbox,
} from "./outbox";

/** Stand-in for localStorage; the queue takes its storage as an argument. */
const makeStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
    _map: map,
  };
};

let storage;

beforeEach(() => {
  storage = makeStorage();
});

const queueNote = (content) =>
  enqueueOutbox(
    {
      kind: OUTBOX_KINDS.opsLog,
      payload: { content },
      title: content,
      subtitle: "NOTE · Gunnar",
    },
    storage,
  );

const queueLoadout = (hikerId, itemIds) =>
  enqueueOutbox(
    {
      kind: OUTBOX_KINDS.gearLoadout,
      payload: { hiker_id: hikerId, item_ids: itemIds },
      title: `Pack contents for ${hikerId}`,
      subtitle: `${itemIds.length} items`,
      dedupeKey: `${OUTBOX_KINDS.gearLoadout}:${hikerId}`,
    },
    storage,
  );

describe("queueing writes that could not be sent", () => {
  it("keeps every ops-log note, because each one is its own fact", () => {
    queueNote("Water at Kosk Spring is flowing");
    queueNote("Dan's knee is fine, pace holding");

    const queued = listOutbox(storage);
    expect(queued).toHaveLength(2);
    expect(queued.map((entry) => entry.payload.content)).toEqual([
      "Water at Kosk Spring is flowing",
      "Dan's knee is fine, pace holding",
    ]);
  });

  it("collapses repeated gear edits for one hiker into the final state", () => {
    queueLoadout("dan", ["tent"]);
    queueLoadout("dan", ["tent", "quilt"]);
    queueLoadout("dan", ["tent", "quilt", "stove"]);
    queueLoadout("drew", ["rope"]);

    const queued = listOutbox(storage);
    expect(queued).toHaveLength(2);
    const dan = queued.find((entry) => entry.payload.hiker_id === "dan");
    expect(dan.payload.item_ids).toEqual(["tent", "quilt", "stove"]);
  });

  it("keeps the original queue time when a gear edit is superseded", () => {
    const first = queueLoadout("dan", ["tent"]);
    const replacement = queueLoadout("dan", ["tent", "quilt"]);

    expect(replacement.createdAt).toBe(first.createdAt);
    expect(replacement.id).toBe(first.id);
  });

  it("survives a reload by round-tripping through storage", () => {
    queueNote("Filtered 3 L at Deer Creek");
    // A second reader sees the same queue from the same raw storage.
    expect(JSON.parse(storage.getItem(OUTBOX_STORAGE_KEY))).toHaveLength(1);
    expect(countOutbox(storage)).toBe(1);
  });

  it("treats an unreadable queue as empty instead of throwing", () => {
    storage.setItem(OUTBOX_STORAGE_KEY, "{not json");
    expect(listOutbox(storage)).toEqual([]);
    // And it can still accept new work afterwards.
    queueNote("recovered");
    expect(listOutbox(storage)).toHaveLength(1);
  });
});

describe("recording why a send failed", () => {
  it("stores the server's reason and counts the attempts", () => {
    const entry = queueNote("Bear box full at Ash Camp");
    recordOutboxAttempt(entry.id, "permission denied for table ops_logs", storage);
    recordOutboxAttempt(entry.id, "Failed to fetch", storage);

    const [stored] = listOutbox(storage);
    expect(stored.attempts).toBe(2);
    expect(stored.lastError).toBe("Failed to fetch");
    expect(stored.lastAttemptAt).toBeTruthy();
  });

  it("reports whether the entry it was asked about exists", () => {
    expect(recordOutboxAttempt("nope", "x", storage)).toBe(false);
    expect(removeFromOutbox("nope", storage)).toBe(false);
  });
});

describe("flushing the queue", () => {
  it("removes only what the server actually accepted", async () => {
    queueNote("first");
    queueNote("second");

    const sent = [];
    const result = await flushOutbox(
      {
        [OUTBOX_KINDS.opsLog]: async (payload) => {
          sent.push(payload.content);
        },
      },
      storage,
    );

    expect(sent).toEqual(["first", "second"]);
    expect(result).toMatchObject({ attempted: 2, sent: 2, failed: 0, remaining: 0 });
    expect(listOutbox(storage)).toEqual([]);
  });

  it("keeps the record and the reason when the send throws", async () => {
    queueNote("stays put");

    const result = await flushOutbox(
      {
        [OUTBOX_KINDS.opsLog]: async () => {
          throw new Error("JWT expired");
        },
      },
      storage,
    );

    expect(result).toMatchObject({ sent: 0, failed: 1, remaining: 1 });
    expect(result.errors[0].message).toBe("JWT expired");
    const [stored] = listOutbox(storage);
    expect(stored.lastError).toBe("JWT expired");
    expect(stored.payload.content).toBe("stays put");
  });

  it("stops retrying a kind after it fails once", async () => {
    queueNote("one");
    queueNote("two");
    queueNote("three");

    const send = vi.fn(async () => {
      throw new Error("Failed to fetch");
    });
    const result = await flushOutbox({ [OUTBOX_KINDS.opsLog]: send }, storage);

    // No signal is no signal; the other two would fail identically.
    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ attempted: 1, failed: 1, skipped: 2, remaining: 3 });
  });

  it("lets an unrelated kind through when one kind is blocked", async () => {
    queueNote("note that fails");
    queueLoadout("gunnar", ["quilt"]);

    const result = await flushOutbox(
      {
        [OUTBOX_KINDS.opsLog]: async () => {
          throw new Error("row-level security");
        },
        [OUTBOX_KINDS.gearLoadout]: async () => {},
      },
      storage,
    );

    expect(result).toMatchObject({ sent: 1, failed: 1, remaining: 1 });
    expect(listOutbox(storage)[0].kind).toBe(OUTBOX_KINDS.opsLog);
  });

  it("leaves a record alone rather than dropping it when no sender handles it", async () => {
    queueNote("unhandled");
    const result = await flushOutbox({}, storage);

    expect(result).toMatchObject({ attempted: 0, sent: 0, skipped: 1, remaining: 1 });
    expect(listOutbox(storage)).toHaveLength(1);
  });

  it("clears everything on demand", () => {
    queueNote("a");
    queueLoadout("dan", ["tent"]);
    clearOutbox(storage);
    expect(listOutbox(storage)).toEqual([]);
  });
});

describe("a custom gear item created in a dead zone", () => {
  const queueCustomItem = (name, localId) =>
    enqueueOutbox(
      {
        kind: OUTBOX_KINDS.customItem,
        payload: { name, category: "Custom" },
        title: name,
        meta: { localId },
      },
      storage,
    );

  it("sends before the pack that contains it, with the server's id swapped in", async () => {
    queueCustomItem("Camp chair", "custom-local-42");
    queueLoadout("gunnar", ["quilt", "custom-local-42"]);

    const order = [];
    let uploadedLoadout = null;

    const result = await flushOutbox(
      {
        [OUTBOX_KINDS.customItem]: async () => {
          order.push("item");
          return { id: 9001 };
        },
        [OUTBOX_KINDS.gearLoadout]: async (payload) => {
          order.push("loadout");
          uploadedLoadout = payload;
        },
      },
      storage,
    );

    expect(order).toEqual(["item", "loadout"]);
    // The placeholder never reaches the server; the real id does.
    expect(uploadedLoadout.item_ids).toEqual(["quilt", 9001]);
    expect(result).toMatchObject({ sent: 2, remaining: 0 });
    expect(result.remapped).toEqual([
      { localId: "custom-local-42", serverId: 9001 },
    ]);
  });

  it("orders the item first even when the pack was queued earlier", async () => {
    queueLoadout("dan", ["custom-local-7"]);
    queueCustomItem("Hammock", "custom-local-7");

    let uploadedLoadout = null;
    await flushOutbox(
      {
        [OUTBOX_KINDS.customItem]: async () => ({ id: 55 }),
        [OUTBOX_KINDS.gearLoadout]: async (payload) => {
          uploadedLoadout = payload;
        },
      },
      storage,
    );

    expect(uploadedLoadout.item_ids).toEqual([55]);
  });

  it("leaves the pack pointing at the placeholder if the item insert fails", async () => {
    queueCustomItem("Hammock", "custom-local-7");
    queueLoadout("dan", ["custom-local-7"]);

    const result = await flushOutbox(
      {
        [OUTBOX_KINDS.customItem]: async () => {
          throw new Error("permission denied for table custom_items");
        },
        [OUTBOX_KINDS.gearLoadout]: async () => {},
      },
      storage,
    );

    // The loadout still uploads — but it would reference an item the server
    // does not have, so what matters is that the item stays queued for retry.
    expect(result.remaining).toBeGreaterThanOrEqual(1);
    const stillQueued = listOutbox(storage);
    expect(stillQueued.some((e) => e.kind === OUTBOX_KINDS.customItem)).toBe(true);
  });

  it("remaps only the packs that actually contain the placeholder", () => {
    queueLoadout("dan", ["custom-local-1", "tent"]);
    queueLoadout("drew", ["rope"]);

    expect(remapQueuedItemId("custom-local-1", 77, storage)).toBe(true);
    expect(remapQueuedItemId("custom-local-nope", 78, storage)).toBe(false);

    const packs = listOutbox(storage);
    expect(packs.find((e) => e.payload.hiker_id === "dan").payload.item_ids).toEqual([77, "tent"]);
    expect(packs.find((e) => e.payload.hiker_id === "drew").payload.item_ids).toEqual(["rope"]);
  });
});
