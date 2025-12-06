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
  const { signInWithEmail, signInWithGoogle, error } = useAuth();
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signInWithGoogle();
    // Will redirect, so no need to handle success
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
          {/* Google Sign In */}
          <button
            className="auth-btn google-btn"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" className="google-icon">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          {/* Magic Link */}
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

        <div className="modal-footer">
          <p>🔒 Only Dan, Drew, and Gunnar can access team features.</p>
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

export default UserBadge;
