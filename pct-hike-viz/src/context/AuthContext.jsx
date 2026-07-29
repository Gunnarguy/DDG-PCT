/**
 * Auth Context Provider for DDG-PCT Mission Control
 *
 * Provides authentication state and methods to all components.
 * Supports magic link (email) and Google OAuth for the DDG team.
 */

import PropTypes from "prop-types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DDG_TEAM,
  getTeamProfile,
  supabase,
  supabaseConfigError,
  supabaseReady,
} from "../lib/supabase";

const AuthContext = createContext(null);
const PROFILE_TIMEOUT_MS = 8000;

const withTimeout = (promise, timeoutMs, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);

/**
 * Hook to access auth context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
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
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const [teamRoster, setTeamRoster] = useState([]);
  const [profileCheckedUserId, setProfileCheckedUserId] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Resolve authorization independently from session restoration. Supabase can
  // emit SIGNED_IN before the initial getSession() call releases its auth lock,
  // so the user and profile must not be treated as one atomic event.
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      setProfileCheckedUserId(null);
      setProfileError(null);
      return null;
    }

    setProfileCheckedUserId(null);
    setProfileError(null);

    try {
      const teamProfile = await withTimeout(
        getTeamProfile(authUser.id),
        PROFILE_TIMEOUT_MS,
        "Team access check timed out. Your sign-in is still saved.",
      );
      setProfile(teamProfile);
      setProfileCheckedUserId(authUser.id);
      return teamProfile;
    } catch (err) {
      console.error("Failed to fetch team profile:", err);
      setProfile(null);
      setProfileError(
        err?.message || "Mission Control could not verify team access.",
      );
      setProfileCheckedUserId(authUser.id);
      return null;
    }
  }, []);

  // Recovery path for magic-link/OAuth races: whenever a session user exists
  // without a completed profile check for that exact user ID, issue the check.
  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setProfileCheckedUserId(null);
      setProfileError(null);
      return;
    }

    if (profileCheckedUserId !== user.id) {
      const deferredCheck = window.setTimeout(() => {
        void fetchProfile(user);
      }, 0);
      return () => window.clearTimeout(deferredCheck);
    }
    return undefined;
  }, [fetchProfile, profileCheckedUserId, user]);

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;
    let timeoutId;
    let initSettled = false;

    const finishInitialization = () => {
      initSettled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (mounted) setLoading(false);
    };

    const initAuth = async () => {
      try {
        if (import.meta.env.DEV) {
          const savedMock = localStorage.getItem("pct-hike-viz::mock-user");
          if (savedMock) {
            try {
              const { user: mockUser, profile: mockProfile } = JSON.parse(savedMock);
              if (mounted) {
                setUser(mockUser);
                setProfile(mockProfile);
                finishInitialization();
              }
              return;
            } catch {
              localStorage.removeItem("pct-hike-viz::mock-user");
            }
          }
        }

        if (!supabaseReady) {
          if (mounted) {
            setError(supabaseConfigError);
            setAuthUnavailable(true);
            finishInitialization();
          }
          return;
        }

        // Set a timeout to prevent infinite spinning
        timeoutId = setTimeout(() => {
          if (mounted && !initSettled) {
            initSettled = true;
            console.warn("Auth init timed out, setting loading to false");
            setAuthUnavailable(true);
            setLoading(false);
          }
        }, 5000);

        // Check if we have auth tokens in the URL hash (from magic link redirect)
        // Supabase sends: #access_token=...&expires_at=...&expires_in=...&refresh_token=...&token_type=bearer&type=magiclink
        const hash = window.location.hash.substring(1);

        if (hash) {
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            // Manually set the session from URL params
            const { data, error: setSessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (setSessionError) {
              console.error(
                "[Auth] Error setting session from URL:",
                setSessionError,
              );
              setAuthUnavailable(true);
              setError(`Login failed: ${setSessionError.message}`);
            } else if (data.session) {
              // Clear the hash from URL - preserve full path including base
              const cleanUrl =
                window.location.pathname + window.location.search;
              window.history.replaceState(null, "", cleanUrl);
              if (mounted) {
                setUser(data.session.user);
                setError(null);
                setAuthUnavailable(false);
                await fetchProfile(data.session.user);
                finishInitialization();
              }
              return;
            }
          } else if (hashParams.get("error")) {
            // Supabase can send errors in the hash too
            const errorDesc =
              hashParams.get("error_description") || hashParams.get("error");
            console.error("[Auth] Error in URL hash:", errorDesc);
            setError(errorDesc);
          }

          // Clear hash regardless (don't leave tokens in URL)
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, "", cleanUrl);
        }

        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) => {
            setTimeout(() => resolve(null), 2000);
          }),
        ]);

        // Public route data should not be held hostage by a browser auth-lock
        // stall. The auth subscription can still restore the session later.
        if (!sessionResult) {
          if (mounted) {
            setUser(null);
            setProfile(null);
            setError(null);
            setAuthUnavailable(false);
            finishInitialization();
          }
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = sessionResult;

        if (sessionError) {
          console.error("Session error:", sessionError);
          if (mounted) {
            setError(sessionError.message);
            setAuthUnavailable(true);
            finishInitialization();
          }
          return;
        }

        if (mounted) {
          setUser(session?.user ?? null);
          setError(null);
          setAuthUnavailable(false);
          if (session?.user) {
            await fetchProfile(session.user);
          }
          finishInitialization();
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) {
          setError(err.message);
          setAuthUnavailable(true);
          finishInitialization();
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

  // Fetch team roster for presence display (team members only)
  const fetchTeamRoster = useCallback(async () => {
    if (!supabaseReady || !user) {
      setTeamRoster([]);
      return;
    }

    const { data, error: rosterError } = await supabase
      .from("ddg_team_profiles")
      .select("id, email, name, role, last_seen, hiker_id");

    if (rosterError) {
      console.warn("Failed to fetch team roster", rosterError);
      return;
    }

    setTeamRoster(data ?? []);
  }, [user]);

  // Listen for auth state changes
  useEffect(() => {
    let mounted = true;

    if (!supabaseReady) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        import.meta.env.DEV &&
        !session &&
        localStorage.getItem("pct-hike-viz::mock-user")
      ) {
        return;
      }

      if (mounted) {
        setUser(session?.user ?? null);
        setError(null);
        setAuthUnavailable(false);
        if (!session?.user) {
          setProfile(null);
        }

        // Update last_seen timestamp
        if (event === "SIGNED_IN" && session?.user) {
          setTimeout(() => {
            if (!mounted) return;
            supabase
              .from("ddg_team_profiles")
              .update({ last_seen: new Date().toISOString() })
              .eq("id", session.user.id)
              .then(() => {});
          }, 0);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Poll roster periodically while authenticated
  useEffect(() => {
    if (!user || !supabaseReady) return undefined;

    fetchTeamRoster();
    const id = setInterval(fetchTeamRoster, 60_000);
    return () => clearInterval(id);
  }, [user, fetchTeamRoster]);

  /**
   * Sign in with magic link (email)
   */
  const signInWithEmail = async (email) => {
    setError(null);
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter an email address.");
      return { success: false, error: "Please enter an email address." };
    }

    // IMPORTANT: On GitHub Pages the app lives under /DDG-PCT/ (Vite base).
    // Using only window.location.origin would drop the base path and break auth redirects.
    const redirectUrl = new URL(
      import.meta.env.BASE_URL || "/",
      window.location.origin,
    ).toString();

    // Add timeout protection to prevent infinite "Sending..." state
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Request timed out after 15 seconds")),
        15000,
      );
    });

    try {
      const { error: signInError } = await Promise.race([
        supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: redirectUrl,
            // New accounts are safe: the database trigger only creates a team
            // profile for an allowlisted email and records all others as pending.
            shouldCreateUser: true,
          },
        }),
        timeoutPromise,
      ]);

      if (signInError) {
        const raw = signInError.message || "Login failed.";
        setError(raw);
        return { success: false, error: raw };
      }

      return { success: true, message: "Check your email for the magic link!" };
    } catch (error) {
      const raw = error.message || "Connection failed. Please try again.";
      setError(raw);
      return { success: false, error: raw };
    }
  };

  /**
   * Sign in with Google OAuth
   */
  const signInWithGoogle = async () => {
    setError(null);

    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Request timed out after 15 seconds")),
        15000,
      );
    });

    try {
      const { error: signInError } = await Promise.race([
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            // Match Pages deploy base path in production.
            redirectTo: new URL(
              import.meta.env.BASE_URL || "/",
              window.location.origin,
            ).toString(),
          },
        }),
        timeoutPromise,
      ]);

      if (signInError) {
        setError(signInError.message);
        return { success: false, error: signInError.message };
      }

      return { success: true };
    } catch (error) {
      const raw = error.message || "Connection failed. Please try again.";
      setError(raw);
      return { success: false, error: raw };
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    setError(null);
    const isMock = user?.isMock;
    localStorage.removeItem("pct-hike-viz::mock-user");

    if (isMock) {
      setUser(null);
      setProfile(null);
      return { success: true };
    }

    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Sign out timed out")), 10000);
    });

    try {
      const { error: signOutError } = await Promise.race([
        supabase.auth.signOut(),
        timeoutPromise,
      ]);

      if (signOutError) {
        setError(signOutError.message);
        return { success: false, error: signOutError.message };
      }

      setUser(null);
      setProfile(null);
      return { success: true };
    } catch (error) {
      // Even if sign out fails server-side, clear local state
      setUser(null);
      setProfile(null);
      console.warn("Sign out timed out, cleared local state anyway:", error);
      return { success: true };
    }
  };

  /**
   * Dev bypass login for local development
   */
  const devBypassLogin = (hikerId) => {
    if (!import.meta.env.DEV) return;
    const nameMap = {
      gunnar: { name: 'Gunnar', email: 'gunnar@example.com', role: 'admin' },
      dan: { name: 'Dan', email: 'dan@example.com', role: 'architect' },
      drew: { name: 'Drew', email: 'drew@example.com', role: 'navigator' }
    };
    const hiker = nameMap[hikerId] || nameMap.gunnar;

    const mockUser = {
      id: `mock-id-${hikerId}`,
      email: hiker.email,
      user_metadata: { name: hiker.name },
      isMock: true
    };

    const mockProfile = {
      id: `mock-id-${hikerId}`,
      name: hiker.name,
      email: hiker.email,
      role: hiker.role,
      hiker_id: hikerId
    };

    localStorage.setItem("pct-hike-viz::mock-user", JSON.stringify({ user: mockUser, profile: mockProfile }));
    setUser(mockUser);
    setProfile(mockProfile);
    setError(null);
    setAuthUnavailable(false);
  };

  /**
   * Get display info for current user
   */
  const authorizationLoading = Boolean(
    user?.id && profileCheckedUserId !== user.id,
  );
  const combinedLoading = loading || authorizationLoading;

  const syncStatus = useMemo(() => {
    if (!supabaseReady) return "offline";
    if (combinedLoading) return "syncing";
    if (user) return "synced";
    if (error) return "error";
    return "unauthenticated";
  }, [combinedLoading, error, user]);

  const getDisplayInfo = useCallback(() => {
    if (!user) return null;

    const email = user.email;

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
        isAdmin: profile.role === "admin",
        accessStatus: "approved",
      };
    }

    // Not whitelisted - access pending/denied
    return {
      name: email?.split("@")[0] || "Visitor",
      emoji: "🚫",
      role: "Access Pending",
      email: email,
      hikerId: null,
      isTeamMember: false,
      isAdmin: false,
      accessStatus: "pending",
    };
  }, [user, profile]);

  const value = {
    // State
    user,
    profile,
    loading: combinedLoading,
    error,
    authorizationError: profileError,
    authUnavailable,
    isAuthenticated: !!user,
    isTeamMember: !!profile,
    isAdmin: profile?.role === "admin",
    syncStatus,
    teamRoster,

    // Methods
    signInWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile: () => fetchProfile(user),
    getDisplayInfo,
    devBypassLogin,

    // Utilities
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
