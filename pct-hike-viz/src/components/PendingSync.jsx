import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { OUTBOX_KIND_LABELS } from "../lib/outbox";
import { describeSupabaseSession } from "../lib/outboxSenders";
import { supabaseReady } from "../lib/supabase";
import useOutbox from "../hooks/useOutbox";
import "./PendingSync.css";

/**
 * Lists every record still held only on this browser, and lets you push them on
 * demand.
 *
 * The web app previously had no way to see this at all — the sidebar showed a
 * sync dot and nothing else, so an entry that failed to upload was invisible.
 * This is the counterpart to the iOS PendingSyncView, and follows the same
 * order deliberately: the reason first, then the records, then the retry.
 * Burying the reason under the list is what makes a failed sync look
 * unexplained.
 */

const relativeTime = (isoString) => {
  if (!isoString) return null;
  const then = new Date(isoString).getTime();
  if (!Number.isFinite(then)) return null;
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};

function PendingSync({ userName }) {
  const { entries, count, isFlushing, flush } = useOutbox();
  const [sessionState, setSessionState] = useState(null);
  const [retryReport, setRetryReport] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Only ask the server who we are when the panel is actually open; polling the
  // session on every render of a collapsed row would be pure noise.
  useEffect(() => {
    if (!isExpanded) return undefined;
    let cancelled = false;
    describeSupabaseSession().then((state) => {
      if (!cancelled) setSessionState(state);
    });
    return () => {
      cancelled = true;
    };
  }, [isExpanded, count]);

  const grouped = useMemo(() => {
    const groups = new Map();
    for (const entry of entries) {
      if (!groups.has(entry.kind)) groups.set(entry.kind, []);
      groups.get(entry.kind).push(entry);
    }
    return [...groups.entries()];
  }, [entries]);

  const handleRetry = async () => {
    const before = count;
    const result = await flush();
    setRetryReport(buildRetryReport(before, result, sessionState, userName));
  };

  if (count === 0 && !retryReport) {
    return (
      <div className="pending-sync pending-sync--clear">
        <span className="pending-sync-dot pending-sync-dot--clear" />
        Everything on this device has reached the server.
      </div>
    );
  }

  return (
    <div className="pending-sync">
      <button
        type="button"
        className="pending-sync-summary"
        onClick={() => setIsExpanded((open) => !open)}
        aria-expanded={isExpanded}
      >
        <span className="pending-sync-dot" />
        {count === 0
          ? "Unsynced edits"
          : `${count} unsynced edit${count === 1 ? "" : "s"}`}
        <span className="pending-sync-chevron">{isExpanded ? "▾" : "▸"}</span>
      </button>

      {isExpanded && (
        <div className="pending-sync-body">
          {/* The reason, first. */}
          <section className="pending-sync-section">
            <h4>Why it is not uploading</h4>
            <p
              className={
                sessionState?.healthy
                  ? "pending-sync-note"
                  : "pending-sync-warning"
              }
            >
              {sessionState?.message ?? "Checking the Supabase session…"}
            </p>
            <p className="pending-sync-meta">
              Signed in to the app as: {userName || "nobody"}
            </p>
          </section>

          {retryReport && (
            <section className="pending-sync-section">
              <h4>Last attempt</h4>
              {retryReport.map((line) => (
                <p key={line} className="pending-sync-note">
                  {line}
                </p>
              ))}
            </section>
          )}

          <p className="pending-sync-note">
            {count === 0
              ? "Everything on this device has reached the server."
              : `${count} record${count === 1 ? " is" : "s are"} saved in this browser but ${count === 1 ? "has" : "have"} not reached the server yet. Nothing is lost — ${count === 1 ? "it stays" : "they stay"} here and upload${count === 1 ? "s" : ""} on the next successful sync.`}
          </p>

          {grouped.map(([kind, kindEntries]) => (
            <section key={kind} className="pending-sync-section">
              <h4>
                {OUTBOX_KIND_LABELS[kind] ?? kind} ({kindEntries.length})
              </h4>
              {kindEntries.map((entry) => (
                <div key={entry.id} className="pending-sync-row">
                  {/* No line clamp anywhere here: an ops-log note you cannot
                      read in full is a note you cannot confirm you wrote. */}
                  <p className="pending-sync-title">{entry.title}</p>
                  {entry.subtitle && (
                    <p className="pending-sync-meta">{entry.subtitle}</p>
                  )}
                  <p className="pending-sync-meta">
                    queued {relativeTime(entry.createdAt)}
                    {entry.attempts > 0 &&
                      ` · ${entry.attempts} attempt${entry.attempts === 1 ? "" : "s"}`}
                    {entry.lastAttemptAt &&
                      ` · last tried ${relativeTime(entry.lastAttemptAt)}`}
                  </p>
                  {entry.lastError && (
                    <p className="pending-sync-warning">
                      Server said: {entry.lastError}
                    </p>
                  )}
                </div>
              ))}
            </section>
          ))}

          <div className="pending-sync-actions">
            <button
              type="button"
              className="pending-sync-retry"
              onClick={handleRetry}
              disabled={isFlushing || count === 0}
            >
              {isFlushing ? "Retrying…" : "Retry now"}
            </button>
          </div>

          <p className="pending-sync-meta">
            A failed sync is not data loss. Records stay in this browser until
            the server confirms them, so retrying later is always safe.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Says what actually happened, and when nothing moved, why.
 *
 * "Nothing uploaded" on its own is the message that made this look like an
 * unexplained failure on iOS. The queue already captured the server's reason;
 * this just refuses to throw it away.
 */
const buildRetryReport = (before, result, sessionState, userName) => {
  if (result.sent === before && before > 0) {
    return [`All ${before} record${before === 1 ? "" : "s"} uploaded.`];
  }
  if (result.sent > 0) {
    return [
      `Uploaded ${result.sent} of ${before}. ${result.remaining} still pending.`,
    ];
  }

  const lines = ["Nothing uploaded. The records are still safe in this browser."];
  if (result.errors.length > 0) {
    lines.push(`Server said: ${result.errors[0].message}`);
  } else if (!supabaseReady) {
    lines.push(
      "Supabase is not configured in this build, so there is nowhere to upload to.",
    );
  } else if (sessionState && !sessionState.healthy) {
    lines.push(sessionState.message);
  } else {
    lines.push(
      "No error was reported, which usually means the request never left the browser — most likely no usable connection.",
    );
  }
  lines.push(`Signed in as: ${userName || "nobody"}.`);
  return lines;
};

PendingSync.propTypes = {
  userName: PropTypes.string,
};

export default PendingSync;
