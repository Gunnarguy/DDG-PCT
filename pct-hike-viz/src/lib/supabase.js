/**
 * Supabase Client Configuration
 *
 * Provides authenticated access to DDG-PCT backend services:
 * - Team authentication (Dan, Drew, Gunnar)
 * - Gear loadout sync
 * - AQI proxy (EPA key protected server-side)
 * - Ops logs and trip state
 */

import { createClient } from '@supabase/supabase-js';

// NOTE: Do not provide hardcoded fallbacks here.
// If these aren't present, we deliberately run in "offline" mode.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Whether Supabase is configured and ready */
export const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabaseConfigError = supabaseReady
  ? null
  : 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in pct-hike-viz/.env (copy from .env.example).';

const makeDisabledSupabaseClient = (reason) => {
  const error = new Error(reason);

  const makeThenableBuilder = () => {
    const response = Promise.resolve({ data: null, error });
    const builder = {
      select: () => builder,
      insert: () => builder,
      upsert: () => builder,
      update: () => builder,
      delete: () => builder,
      eq: () => builder,
      neq: () => builder,
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      single: () => builder,
      maybeSingle: () => builder,
      then: (onFulfilled, onRejected) => response.then(onFulfilled, onRejected),
      catch: (onRejected) => response.catch(onRejected),
      finally: (onFinally) => response.finally(onFinally),
    };
    return builder;
  };

  const makeChannel = () => {
    const channel = {
      on: () => channel,
      subscribe: () => channel,
      unsubscribe: async () => ({ error }),
    };
    return channel;
  };

  return {
    // Minimal surface area used across the app.
    auth: {
      getSession: async () => ({ data: { session: null }, error }),
      setSession: async () => ({ data: { session: null }, error }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
      signInWithOtp: async () => ({ data: null, error }),
      signInWithOAuth: async () => ({ data: null, error }),
      signOut: async () => ({ error }),
    },
    from: () => makeThenableBuilder(),
    channel: () => makeChannel(),
    removeChannel: async () => ({ error }),
  };
};

/**
 * Main Supabase client instance
 * Handles auth state automatically via localStorage
 */
export const supabase = supabaseReady
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : makeDisabledSupabaseClient(supabaseConfigError);

/**
 * Edge Function URLs for protected API proxies
 */
export const EDGE_FUNCTIONS = {
  aqiProxy: supabaseReady ? `${SUPABASE_URL}/functions/v1/aqi-proxy` : null,
};

/**
 * DDG Team member info for display
 */
export const DDG_TEAM = {
  dan: { name: 'Dan', emoji: '🧭', role: 'Architect' },
  drew: { name: 'Drew', emoji: '🏔️', role: 'Navigator' },
  gunnar: { name: 'Gunnar', emoji: '⚡', role: 'Pace Setter' },
};

/**
 * Whitelisted DDG team emails
 * Only these emails can access team features
 */
export const DDG_ALLOWED_EMAILS = [
  'smileyguy@aol.com',        // Dan (Dad)
  'andrew.d.hostetler@gmail.com', // Drew (Brother)
  'gunnarguy@me.com',         // Gunnar
  'gunnarguy@aol.com',        // Gunnar (alt)
];

/**
 * Check if an email is whitelisted
 */
export const isAllowedEmail = (email) => {
  if (!email) return false;
  return DDG_ALLOWED_EMAILS.includes(email.toLowerCase());
};

/**
 * Get hiker ID from email
 */
export const getHikerIdFromEmail = (email) => {
  if (!email) return null;
  const lower = email.toLowerCase();
  if (lower === 'smileyguy@aol.com') return 'dan';
  if (lower === 'andrew.d.hostetler@gmail.com') return 'drew';
  if (lower === 'gunnarguy@me.com' || lower === 'gunnarguy@aol.com') return 'gunnar';
  return null;
};

/**
 * Check if email is admin (Gunnar)
 */
export const isAdminEmail = (email) => {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower === 'gunnarguy@me.com' || lower === 'gunnarguy@aol.com';
};

/**
 * Helper to get current session
 */
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('Session fetch error:', error);
    return null;
  }
  return session;
};

/**
 * Helper to get current user profile from ddg_team_profiles
 */
export const getTeamProfile = async () => {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("ddg_team_profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.warn("Profile fetch error:", error);
    return null;
  }
  return data; // Returns null if no profile exists, which is fine
};

export default supabase;
