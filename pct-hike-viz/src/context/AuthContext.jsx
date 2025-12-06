/**
 * Auth Context Provider for DDG-PCT Mission Control
 * 
 * Provides authentication state and methods to all components.
 * Supports magic link (email) and Google OAuth for the DDG team.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { supabase, getTeamProfile, DDG_TEAM } from '../lib/supabase';

const AuthContext = createContext(null);

/**
 * Hook to access auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Auth Provider Component
 * Wraps the app and provides auth state + methods
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch team profile when user changes
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return;
    }

    try {
      const teamProfile = await getTeamProfile();
      setProfile(teamProfile);
    } catch (err) {
      console.warn('Failed to fetch team profile:', err);
      setProfile(null);
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user);
          } else {
            setProfile(null);
          }

          // Update last_seen timestamp
          if (event === 'SIGNED_IN' && session?.user) {
            supabase
              .from('ddg_team_profiles')
              .update({ last_seen: new Date().toISOString() })
              .eq('id', session.user.id)
              .then(() => {});
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /**
   * Sign in with magic link (email)
   */
  const signInWithEmail = async (email) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (signInError) {
      setError(signInError.message);
      return { success: false, error: signInError.message };
    }

    return { success: true, message: 'Check your email for the magic link!' };
  };

  /**
   * Sign in with Google OAuth
   */
  const signInWithGoogle = async () => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (signInError) {
      setError(signInError.message);
      return { success: false, error: signInError.message };
    }

    return { success: true };
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      setError(signOutError.message);
      return { success: false, error: signOutError.message };
    }

    setUser(null);
    setProfile(null);
    return { success: true };
  };

  /**
   * Get display info for current user
   */
  const getDisplayInfo = useCallback(() => {
    if (!user) return null;

    // Check if they have a team profile
    if (profile?.hiker_name && DDG_TEAM[profile.hiker_name]) {
      const teamInfo = DDG_TEAM[profile.hiker_name];
      return {
        name: profile.display_name || teamInfo.name,
        emoji: profile.avatar_emoji || teamInfo.emoji,
        role: teamInfo.role,
        email: user.email,
        isTeamMember: true,
      };
    }

    // Fallback for authenticated but not yet profiled users
    return {
      name: user.email?.split('@')[0] || 'Hiker',
      emoji: '🥾',
      role: 'Guest',
      email: user.email,
      isTeamMember: false,
    };
  }, [user, profile]);

  const value = {
    // State
    user,
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    isTeamMember: !!profile,

    // Methods
    signInWithEmail,
    signInWithGoogle,
    signOut,
    getDisplayInfo,

    // Utilities
    supabase,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
