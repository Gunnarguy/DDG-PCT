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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tnqvxjtqvmmacrfqpelj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRucXZ4anRxdm1tYWNyZnFwZWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4OTk5ODQsImV4cCI6MjA4MDQ3NTk4NH0.zikr2QDr5OdLrZTkNZv-rF9rPCh2DlY_XCW2pZDnCD4';

/** Whether Supabase is configured and ready */
export const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Main Supabase client instance
 * Handles auth state automatically via localStorage
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Edge Function URLs for protected API proxies
 */
export const EDGE_FUNCTIONS = {
  aqiProxy: `${SUPABASE_URL}/functions/v1/aqi-proxy`,
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
    .from('ddg_team_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.warn('Profile fetch error:', error);
    return null;
  }
  return data;
};

export default supabase;
