import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import supabase, { supabaseReady } from '../lib/supabase';
import './OpsLog.css';

const normalizeEntry = (entry) => ({
  ...entry,
  type: entry.type || 'NOTE',
  status: entry.status || (entry.type === 'TASK' ? 'OPEN' : null)
});

// Lightweight, realtime operations log for mission coordination.
// Pulls history on mount and streams inserts via Supabase Realtime.
function OpsLog({ contextId = 'general', userName }) {
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logError, setLogError] = useState(null);
  const endRef = useRef(null);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [logs]
  );

  const classifyEntry = (value) => {
    const lowered = value.toLowerCase();
    if (lowered.includes('/task') || lowered.includes('taking care of')) return { type: 'TASK', status: 'OPEN' };
    if (lowered.includes('warning') || lowered.includes('alert')) return { type: 'ALERT', status: null };
    return { type: 'NOTE', status: null };
  };

  useEffect(() => {
    let channel;
    const fetchLogs = async () => {
      if (!supabaseReady) {
        setLogError(new Error('Supabase not configured; live comms offline.'));
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ops_logs')
        .select('*')
        .eq('context_id', contextId)
        .order('created_at', { ascending: true });

      if (error) {
        setLogError(error);
      } else if (data) {
        setLogs(data.map(normalizeEntry));
        setLogError(null);
      }
      setIsLoading(false);
    };

    fetchLogs();

    if (supabaseReady) {
      channel = supabase
        .channel(`ops_logs_${contextId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ops_logs', filter: `context_id=eq.${contextId}` },
          (payload) =>
            setLogs((prev) => {
              const incoming = normalizeEntry(payload.new);
              return prev.some((row) => row.id === incoming.id) ? prev : [...prev, incoming];
            })
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'ops_logs', filter: `context_id=eq.${contextId}` },
          (payload) =>
            setLogs((prev) => {
              const incoming = normalizeEntry(payload.new);
              const exists = prev.some((row) => row.id === incoming.id);
              return exists
                ? prev.map((row) => (row.id === incoming.id ? { ...row, ...incoming } : row))
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
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedLogs]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!supabaseReady) {
      setLogError(new Error('Supabase not configured; cannot send.'));
      return;
    }

    const classification = classifyEntry(trimmed);

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('ops_logs')
      .insert([
        {
          context_id: contextId,
          user_name: userName,
          content: trimmed,
          type: classification.type,
          status: classification.status
        }
      ])
      .select()
      .single();

    if (error) {
      setLogError(error);
    } else if (data) {
      const normalized = normalizeEntry(data);
      setLogs((prev) => (prev.some((row) => row.id === normalized.id) ? prev : [...prev, normalized]));
      setInput('');
      setLogError(null);
    }
    setIsSubmitting(false);
  };

  const cycleStatus = (entry) => {
    if (!supabaseReady || entry.type !== 'TASK') return;
    const order = ['OPEN', 'IN_PROGRESS', 'DONE'];
    const currentIdx = order.indexOf(entry.status || 'OPEN');
    const nextStatus = order[(currentIdx + 1) % order.length];

    setLogs((prev) => prev.map((row) => (row.id === entry.id ? { ...row, status: nextStatus } : row)));

    supabase
      .from('ops_logs')
      .update({ status: nextStatus })
      .eq('id', entry.id)
      .then(({ error }) => {
        if (error) {
          setLogError(error);
          // rollback
          setLogs((prev) => prev.map((row) => (row.id === entry.id ? { ...row, status: entry.status } : row)));
        }
      });
  };

  const renderEntry = (entry) => (
    <div
      key={entry.id}
      className={`ops-entry type-${entry.type?.toLowerCase?.() ?? 'note'} ${entry.user_name === userName ? 'own' : ''}`}
    >
      <div className="ops-meta">
        <span className="ops-user">{entry.user_name}</span>
        <span className="ops-time">
          {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="ops-content">{entry.content}</div>
      {entry.type === 'TASK' && (
        <div className="ops-task-row">
          <span className={`task-pill status-${(entry.status || 'OPEN').toLowerCase()}`}>
            {entry.status || 'OPEN'}
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
        <span className="blink-status" aria-hidden="true">●</span>
        Live Comms · {contextId.toUpperCase()}
      </div>
      {(!supabaseReady || logError) && (
        <div className="ops-offline">
          {logError ? logError.message : 'Supabase not configured; realtime is offline.'}
        </div>
      )}
      {isLoading && <div className="ops-loading">Loading history…</div>}
      <div className="ops-stream" role="log" aria-live="polite">
        {sortedLogs.map(renderEntry)}
        <div ref={endRef} />
      </div>
      <form className="ops-input-deck" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Transmit log or /task..."
          aria-label="Transmit operational log entry"
          disabled={!supabaseReady}
        />
        <button type="submit" disabled={isSubmitting || !supabaseReady}>
          {isSubmitting ? 'Sending…' : supabaseReady ? 'Send' : 'Offline'}
        </button>
      </form>
    </div>
  );
}

OpsLog.propTypes = {
  contextId: PropTypes.string,
  userName: PropTypes.string.isRequired
};

export default OpsLog;
