/**
 * Auth UI Component for DDG-PCT Mission Control
 * 
 * Provides login/logout UI for the DDG team.
 * Shows user status, team member badge, and auth controls.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';
import './AuthUI.css';

/**
 * User avatar badge showing current user or login prompt
 */
export function UserBadge({ compact = false }) {
  const { isAuthenticated, loading, getDisplayInfo } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <div className="user-badge loading">
        <span className="loading-spinner">⏳</span>
      </div>
    );
  }

  const displayInfo = getDisplayInfo();

  if (!isAuthenticated) {
    return (
      <>
        <button
          className="user-badge login-prompt"
          onClick={() => setShowModal(true)}
          title="Sign in to sync your data"
        >
          <span className="badge-emoji">🔐</span>
          {!compact && <span className="badge-text">Sign In</span>}
        </button>
        {showModal && <LoginModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        className={`user-badge authenticated ${displayInfo.isTeamMember ? 'team-member' : ''}`}
        onClick={() => setShowModal(true)}
        title={`${displayInfo.name} (${displayInfo.role})`}
      >
        <span className="badge-emoji">{displayInfo.emoji}</span>
        {!compact && (
          <span className="badge-text">{displayInfo.name}</span>
        )}
        {displayInfo.isTeamMember && (
          <span className="team-indicator" title="DDG Team">✓</span>
        )}
      </button>
      {showModal && <UserModal onClose={() => setShowModal(false)} displayInfo={displayInfo} />}
    </>
  );
}

UserBadge.propTypes = {
  compact: PropTypes.bool,
};

/**
 * Login modal with magic link and Google options
 */
function LoginModal({ onClose }) {
  const { signInWithEmail, devBypassLogin, error } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setStatus(null);

    const result = await signInWithEmail(email);
    setIsLoading(false);

    if (result.success) {
      setStatus({ type: 'success', message: result.message });
    } else {
      setStatus({ type: 'error', message: result.error });
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>🏔️ DDG Mission Control</h2>
          <p>Sign in to sync your gear, view live AQI, and coordinate with the team.</p>
        </div>

        <div className="auth-options">
          {/* Magic Link Email */}
          <form onSubmit={handleEmailSubmit}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="email-input"
            />
            <button
              type="submit"
              className="auth-btn email-btn"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? '⏳ Sending...' : '✉️ Send Magic Link'}
            </button>
          </form>
        </div>

        {/* Status messages */}
        {(status || error) && (
          <div className={`auth-status ${status?.type || 'error'}`}>
            {status?.message || error}
          </div>
        )}

        {import.meta.env.DEV && (
          <>
            <div className="auth-divider">
              <span>Or Bypass (Dev Mode)</span>
            </div>
            <div className="dev-bypass-options">
              <div className="dev-bypass-buttons-horizontal">
                <button type="button" onClick={() => { devBypassLogin('gunnar'); onClose(); }} className="auth-btn dev-bypass-btn gunnar-btn">
                  <span>⚡ Gunnar</span>
                </button>
                <button type="button" onClick={() => { devBypassLogin('dan'); onClose(); }} className="auth-btn dev-bypass-btn dan-btn">
                  <span>🧭 Dan</span>
                </button>
                <button type="button" onClick={() => { devBypassLogin('drew'); onClose(); }} className="auth-btn dev-bypass-btn drew-btn">
                  <span>🏔️ Drew</span>
                </button>
              </div>
            </div>
          </>
        )}

        <div className="modal-footer">
          <p>🔒 Only approved team members can access team features.</p>
        </div>
      </div>
    </div>
  );
}

LoginModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

/**
 * User modal showing profile and logout option
 */
function UserModal({ onClose, displayInfo }) {
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    onClose();
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal user-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="user-profile">
          <div className="profile-avatar">{displayInfo.emoji}</div>
          <h2>{displayInfo.name}</h2>
          <p className="profile-role">{displayInfo.role}</p>
          <p className="profile-email">{displayInfo.email}</p>
          
          {displayInfo.isTeamMember && (
            <div className="team-badge">
              <span>✓ DDG Team Member</span>
            </div>
          )}
        </div>

        <div className="user-actions">
          <button
            className="auth-btn signout-btn"
            onClick={handleSignOut}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Signing out...' : '🚪 Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}

UserModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  displayInfo: PropTypes.shape({
    name: PropTypes.string.isRequired,
    emoji: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    email: PropTypes.string,
    isTeamMember: PropTypes.bool,
  }).isRequired,
};

/**
 * Full-page login screen for gated access
 */
export function LoginScreen() {
  const { signInWithEmail, devBypassLogin, error } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setStatus(null);

    const result = await signInWithEmail(email);
    setIsLoading(false);

    if (result.success) {
      setStatus({ type: 'success', message: result.message });
    } else {
      setStatus({ type: 'error', message: result.error });
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>🏔️ DDG Mission Control</h1>
          <p className="subtitle">Burney Falls → Castle Crags PCT Section Hike</p>
        </div>

        <div className="login-card">
          <h2>Sign In Required</h2>
          <p>Enter your email to receive a magic link.</p>

          <form onSubmit={handleEmailSubmit} className="login-form">
            <input
              type="email"
              placeholder="dan@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="email-input"
              autoFocus
            />
            <button
              type="submit"
              className="auth-btn email-btn"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? '⏳ Sending...' : '✉️ Send Magic Link'}
            </button>
          </form>

          {(status || error) && (
            <div className={`auth-status ${status?.type || 'error'}`}>
              {status?.message || error}
            </div>
          )}

          {import.meta.env.DEV && (
            <>
              <div className="auth-divider">
                <span>Or Bypass (Dev Mode)</span>
              </div>
              <div className="dev-bypass-options">
                <p className="dev-bypass-title">Select a team profile to mock login:</p>
                <div className="dev-bypass-buttons">
                  <button type="button" onClick={() => devBypassLogin('gunnar')} className="auth-btn dev-bypass-btn gunnar-btn">
                    <span>⚡ Gunnar (Pace Setter)</span>
                  </button>
                  <button type="button" onClick={() => devBypassLogin('dan')} className="auth-btn dev-bypass-btn dan-btn">
                    <span>🧭 Dan (Architect)</span>
                  </button>
                  <button type="button" onClick={() => devBypassLogin('drew')} className="auth-btn dev-bypass-btn drew-btn">
                    <span>🏔️ Drew (Navigator)</span>
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="login-footer">
            <p>🔒 Only approved team members have access.</p>
          </div>
        </div>

        <div className="login-bg-art">
          <span className="mountain">⛰️</span>
          <span className="tree">🌲</span>
          <span className="tree">🌲</span>
          <span className="tent">⛺</span>
        </div>
      </div>
    </div>
  );
}

export default UserBadge;
