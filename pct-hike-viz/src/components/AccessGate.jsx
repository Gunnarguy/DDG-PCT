/**
 * Access Gate Component
 * 
 * Shows different UI based on authentication and authorization status:
 * - Not signed in: Show login prompt
 * - Signed in but not whitelisted: Show "Access Pending" message
 * - Signed in and whitelisted: Show children (the app)
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';
import { UserBadge } from './AuthUI';
import './AccessGate.css';

export function AccessGate({ children, requireAuth = false }) {
  const { isAuthenticated, isTeamMember, loading, user, signOut } = useAuth();

  // Still loading auth state
  if (loading) {
    return (
      <div className="access-gate loading">
        <div className="gate-content">
          <span className="loading-icon">🏔️</span>
          <h2>Loading Mission Control...</h2>
        </div>
      </div>
    );
  }

  // If auth not required, just show the app
  // But if user is signed in and NOT whitelisted, still show access denied
  if (!requireAuth && !isAuthenticated) {
    return children;
  }

  // Signed in but not on the whitelist
  if (isAuthenticated && !isTeamMember) {
    return (
      <div className="access-gate denied">
        <div className="gate-content">
          <span className="gate-icon">🚫</span>
          <h2>Access Pending</h2>
          <p className="gate-email">{user?.email}</p>
          <p className="gate-message">
            This app is private to the DDG hiking team.<br />
            Your access request has been logged.
          </p>
          <p className="gate-note">
            If you're Dan, Drew, or Gunnar, make sure you're using the correct email:
          </p>
          <ul className="allowed-emails">
            <li>🧭 Dan: smileyguy@aol.com</li>
            <li>🏔️ Drew: andrew.d.hostetler@gmail.com</li>
            <li>⚡ Gunnar: gunnarguy@me.com or gunnarguy@aol.com</li>
          </ul>
          <button className="gate-signout" onClick={signOut}>
            Sign out and try a different email
          </button>
        </div>
      </div>
    );
  }

  // Not signed in and auth is required
  if (!isAuthenticated && requireAuth) {
    return (
      <div className="access-gate login-required">
        <div className="gate-content">
          <span className="gate-icon">🔐</span>
          <h2>DDG Mission Control</h2>
          <p className="gate-message">
            Sign in to access team features like gear sync.
          </p>
          <UserBadge />
        </div>
      </div>
    );
  }

  // Authenticated and whitelisted - show the app
  return children;
}

AccessGate.propTypes = {
  children: PropTypes.node.isRequired,
  requireAuth: PropTypes.bool,
};

/**
 * Admin Panel for managing access requests
 * Only visible to Gunnar
 */
export function AdminAccessPanel() {
  const { isAdmin, supabase } = useAuth();
  const [requests, setRequests] = React.useState([]);

  React.useEffect(() => {
    if (!isAdmin) return;

    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
    };

    fetchRequests();

    // Subscribe to new requests
    const channel = supabase
      .channel('access_requests_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, supabase]);

  if (!isAdmin) return null;

  const pendingRequests = requests.filter(r => r.status === 'pending');

  if (pendingRequests.length === 0) return null;

  return (
    <div className="admin-access-panel">
      <h3>🔔 Access Requests ({pendingRequests.length})</h3>
      <ul>
        {pendingRequests.map(req => (
          <li key={req.id}>
            <span className="req-email">{req.email}</span>
            <span className="req-date">{new Date(req.requested_at).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
      <p className="admin-note">
        To approve, add email to allowed_emails table in Supabase.
      </p>
    </div>
  );
}

export default AccessGate;
