import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  flushOutbox,
  getOutboxSnapshot,
  subscribeToOutbox,
} from "../lib/outbox";
import { outboxSenders } from "../lib/outboxSenders";

/**
 * The queue of unsent writes, plus a retry that reports what actually happened.
 *
 * Flushes on its own when the browser says the connection is back and when the
 * tab is brought forward — coming out of a dead zone should not require anyone
 * to remember to press a button. Everything else is an explicit retry.
 */
export const useOutbox = () => {
  const entries = useSyncExternalStore(
    subscribeToOutbox,
    getOutboxSnapshot,
    getOutboxSnapshot,
  );

  const [isFlushing, setIsFlushing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const flush = useCallback(async () => {
    setIsFlushing(true);
    try {
      const result = await flushOutbox(outboxSenders);
      setLastResult(result);
      return result;
    } finally {
      setIsFlushing(false);
    }
  }, []);

  // Autoflush triggers. Both are external-system events, so the state they set
  // lands in a callback rather than synchronously during an effect.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const attempt = () => {
      if (navigator.onLine === false) return;
      void flush();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") attempt();
    };

    window.addEventListener("online", attempt);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", attempt);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [flush]);

  return { entries, count: entries.length, isFlushing, lastResult, flush };
};

export default useOutbox;
