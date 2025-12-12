/**
 * Auth Context Provider for DDG-PCT Mission Control
 * 
 * Provides authentication state and methods to all components.
 * Supports magic link (email) and Google OAuth for the DDG team.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  supabase,
  supabaseReady,
  supabaseConfigError,
  getTeamProfile,
  DDG_TEAM,
  isAllowedEmail,
  getHikerIdFromEmail,
  isAdminEmail,
} from '../lib/supabase';

const AuthContext = createContext(null);

/**
 * Hook to access auth context
 */
// eslint-disable-next-line react-refresh/only-export-components
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
    let timeoutId;

    const initAuth = async () => {
      try {
        if (!supabaseReady) {
          if (mounted) {
            setError(supabaseConfigError);
            setLoading(false);
          }
          return;
        }

        // Set a timeout to prevent infinite spinning
        timeoutId = setTimeout(() => {
          if (mounted && loading) {
            console.warn('Auth init timed out, setting loading to false');
            setLoading(false);
          }
        }, 5000);

        // Check if we have auth tokens in the URL hash (from magic link redirect)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // Manually set the session from URL params
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session from URL:', error);
          } else if (data.session) {
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            if (mounted) {
              setUser(data.session.user);
              await fetchProfile(data.session.user);
              setLoading(false);
            }
            return;
          }
        }

        // Clear hash if present but empty/incomplete
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }
        
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

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // Intentionally run only on mount - init effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    let mounted = true;

    if (!supabaseReady) {
      return () => {
        mounted = false;
      };
    }
    
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
    // IMPORTANT: On GitHub Pages the app lives under /DDG-PCT/ (Vite base).
    // Using only window.location.origin would drop the base path and break auth redirects.
    const redirectUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString();
    
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
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
        // Match Pages deploy base path in production.
        redirectTo: new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString(),
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

    const email = user.email;
    const isAllowed = isAllowedEmail(email);
    const hikerId = getHikerIdFromEmail(email);
    const isAdmin = isAdminEmail(email);

    // Check if they're a whitelisted DDG team member
    if (isAllowed && hikerId && DDG_TEAM[hikerId]) {
      const teamInfo = DDG_TEAM[hikerId];
      return {
        name: teamInfo.name,
        emoji: teamInfo.emoji,
        role: teamInfo.role,
        email: email,
        hikerId: hikerId,
        isTeamMember: true,
        isAdmin: isAdmin,
        accessStatus: 'approved',
      };
    }

    // Check if they have a team profile (from database)
    if (profile?.hiker_id && DDG_TEAM[profile.hiker_id]) {
      const teamInfo = DDG_TEAM[profile.hiker_id];
      return {
        name: profile.name || teamInfo.name,
        emoji: teamInfo.emoji,
        role: teamInfo.role,
        email: email,
        hikerId: profile.hiker_id,
        isTeamMember: true,
        isAdmin: profile.role === 'admin',
        accessStatus: 'approved',
      };
    }

    // Not whitelisted - access pending/denied
    return {
      name: email?.split('@')[0] || 'Visitor',
      emoji: '🚫',
      role: 'Access Pending',
      email: email,
      hikerId: null,
      isTeamMember: false,
      isAdmin: false,
      accessStatus: 'pending',
    };
  }, [user, profile]);

  const value = {
    // State
    user,
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    isTeamMember: !!user && isAllowedEmail(user?.email),
    isAdmin: !!user && isAdminEmail(user?.email),

    // Methods
    signInWithEmail,
    signInWithGoogle,
    signOut,
    getDisplayInfo,

    // Utilities
    supabase,
    isAllowedEmail,
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
