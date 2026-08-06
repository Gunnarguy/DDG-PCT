import PropTypes from "prop-types";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import supabase, { supabaseReady } from "../lib/supabase";
import {
  OUTBOX_KINDS,
  enqueueOutbox,
  getOutboxSnapshot,
  subscribeToOutbox,
} from "../lib/outbox";
import "./OpsLog.css";

const normalizeEntry = (entry) => ({
  ...entry,
  type: entry.type || "NOTE",
  status: entry.status || (entry.type === "TASK" ? "OPEN" : null),
});

// Lightweight, realtime operations log for mission coordination.
// Pulls history on mount and streams inserts via Supabase Realtime.
function OpsLog({ contextId = "general", userName }) {
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logError, setLogError] = useState(null);
  const endRef = useRef(null);

  const sortedLogs = useMemo(
    () =>
      [...logs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [logs]
  );

  // Notes that have not reached the server yet. Shown in the stream rather than
  // reduced to a count: a log entry you cannot see is one you cannot verify you
  // wrote, and re-typing it because you were not sure is the failure this is
  // meant to prevent.
  const outboxEntries = useSyncExternalStore(
    subscribeToOutbox,
    getOutboxSnapshot,
    getOutboxSnapshot
  );

  const pendingEntries = useMemo(
    () =>
      outboxEntries.filter(
        (entry) =>
          entry.kind === OUTBOX_KINDS.opsLog &&
          entry.payload?.context_id === contextId
      ),
    [outboxEntries, contextId]
  );

  const classifyEntry = (value) => {
    const lowered = value.toLowerCase();
    if (lowered.includes("/task") || lowered.includes("taking care of"))
      return { type: "TASK", status: "OPEN" };
    if (lowered.includes("warning") || lowered.includes("alert"))
      return { type: "ALERT", status: null };
    return { type: "NOTE", status: null };
  };

  useEffect(() => {
    let channel;
    const fetchLogs = async () => {
      if (!supabaseReady) {
        setLogError(new Error("Supabase not configured; live comms offline."));
        return;
      }
      setIsLoading(true);

      // Add timeout protection to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Loading history timed out after 10 seconds")),
          10000
        );
      });

      try {
        const { data, error } = await Promise.race([
          supabase
            .from("ops_logs")
            .select("*")
            .eq("context_id", contextId)
            .order("created_at", { ascending: true }),
          timeoutPromise,
        ]);

        if (error) {
          setLogError(error);
        } else if (data) {
          setLogs(data.map(normalizeEntry));
          setLogError(null);
        }
      } catch (err) {
        console.error("OpsLog fetch error:", err);
        setLogError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();

    if (supabaseReady) {
      channel = supabase
        .channel(`ops_logs_${contextId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ops_logs",
            filter: `context_id=eq.${contextId}`,
          },
          (payload) =>
            setLogs((prev) => {
              const incoming = normalizeEntry(payload.new);
              return prev.some((row) => row.id === incoming.id)
                ? prev
                : [...prev, incoming];
            })
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "ops_logs",
            filter: `context_id=eq.${contextId}`,
          },
          (payload) =>
            setLogs((prev) => {
              const incoming = normalizeEntry(payload.new);
              const exists = prev.some((row) => row.id === incoming.id);
              return exists
                ? prev.map((row) =>
                    row.id === incoming.id ? { ...row, ...incoming } : row
                  )
                : [...prev, incoming];
            })
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [contextId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedLogs, pendingEntries]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const classification = classifyEntry(trimmed);
    const row = {
      context_id: contextId,
      user_name: userName,
      content: trimmed,
      type: classification.type,
      status: classification.status,
    };

    // Hold the note on this device rather than losing it. Everything below is
    // an attempt to send; if any of it fails the entry is already safe.
    const queueLocally = (reason) => {
      enqueueOutbox({
        kind: OUTBOX_KINDS.opsLog,
        payload: row,
        title: trimmed,
        subtitle: `${classification.type} · ${userName} · ${contextId}`,
      });
      setInput("");
      setLogError(
        new Error(
          `${reason} The note is saved on this device and will upload on the next successful sync.`,
        ),
      );
    };

    if (!supabaseReady) {
      queueLocally("Supabase is not configured in this build.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Add timeout protection to prevent infinite "Sending…" state
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Message send timed out after 10 seconds")),
          10000
        );
      });

      const { data, error } = await Promise.race([
        supabase.from("ops_logs").insert([row]).select().single(),
        timeoutPromise,
      ]);

      if (error) {
        console.error("OpsLog insert error:", error);
        // Deliberately not "the server rejected this": supabase-js reports a
        // dead network as an error object too, and blaming the server for a
        // dropped connection sends you looking in the wrong place.
        queueLocally(`The write did not go through: ${error.message}.`);
      } else if (data) {
        const normalized = normalizeEntry(data);
        setLogs((prev) =>
          prev.some((existing) => existing.id === normalized.id)
            ? prev
            : [...prev, normalized]
        );
        setInput("");
        setLogError(null);
      }
    } catch (err) {
      // A timeout or a dead network lands here. This is the dead-zone case the
      // queue exists for, so the note goes to the device, not to the floor.
      console.error("OpsLog submit exception:", err);
      queueLocally(`Could not reach the server: ${err.message}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cycleStatus = (entry) => {
    if (!supabaseReady || entry.type !== "TASK") return;
    const order = ["OPEN", "IN_PROGRESS", "DONE"];
    const currentIdx = order.indexOf(entry.status || "OPEN");
    const nextStatus = order[(currentIdx + 1) % order.length];

    setLogs((prev) =>
      prev.map((row) =>
        row.id === entry.id ? { ...row, status: nextStatus } : row
      )
    );

    supabase
      .from("ops_logs")
      .update({ status: nextStatus })
      .eq("id", entry.id)
      .then(({ error }) => {
        if (error) {
          setLogError(error);
          // rollback
          setLogs((prev) =>
            prev.map((row) =>
              row.id === entry.id ? { ...row, status: entry.status } : row
            )
          );
        }
      });
  };

  const renderEntry = (entry) => (
    <div
      key={entry.id}
      className={`ops-entry type-${entry.type?.toLowerCase?.() ?? "note"} ${
        entry.user_name === userName ? "own" : ""
      }`}
    >
      <div className="ops-meta">
        <span className="ops-user">{entry.user_name}</span>
        <span className="ops-time">
          {new Date(entry.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div className="ops-content">{entry.content}</div>
      {entry.type === "TASK" && (
        <div className="ops-task-row">
          <span
            className={`task-pill status-${(
              entry.status || "OPEN"
            ).toLowerCase()}`}
          >
            {entry.status || "OPEN"}
          </span>
          <button
            type="button"
            className="task-advance"
            onClick={() => cycleStatus(entry)}
            disabled={!supabaseReady}
          >
            Advance
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="ops-panel">
      <div className="ops-header">
        <span className="blink-status" aria-hidden="true">
          ●
        </span>
        Live Comms · {contextId.toUpperCase()}
      </div>
      {(!supabaseReady || logError) && (
        <div className="ops-offline">
          {logError
            ? logError.message
            : "Supabase not configured; realtime is offline."}
        </div>
      )}
      {isLoading && <div className="ops-loading">Loading history…</div>}
      <div className="ops-stream" role="log" aria-live="polite">
        {sortedLogs.map(renderEntry)}
        {pendingEntries.map((entry) => (
          <div key={entry.id} className="ops-entry ops-entry--pending own">
            <div className="ops-meta">
              <span className="ops-user">{entry.payload.user_name}</span>
              <span className="ops-time">
                {new Date(entry.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="ops-content">{entry.payload.content}</div>
            <div className="ops-pending-note">
              On this device only — not yet uploaded
              {entry.lastError ? ` · ${entry.lastError}` : ""}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {/* No longer disabled when Supabase is unreachable. Writing the note is
          the point; whether it uploads now or at the next bar of signal is the
          queue's problem, not the user's. */}
      <form className="ops-input-deck" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Transmit log or /task..."
          aria-label="Transmit operational log entry"
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : supabaseReady ? "Send" : "Save offline"}
        </button>
      </form>
    </div>
  );
}

OpsLog.propTypes = {
  contextId: PropTypes.string,
  userName: PropTypes.string.isRequired,
};

export default OpsLog;
