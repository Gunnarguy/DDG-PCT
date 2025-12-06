import { createClient } from '@supabase/supabase-js';

// Centralized Supabase client for mission control state.
// Keep the keys in environment variables; never hardcode secrets.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseReady) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Live sync features will be disabled.');
}

const buildStub = () => {
  const stubResponse = { data: [], error: new Error('Supabase not configured') };
  const stubQuery = {
    select: () => stubQuery,
    insert: () => stubQuery,
    upsert: () => stubQuery,
    update: () => stubQuery,
    order: () => stubQuery,
    eq: () => stubQuery,
    then: (resolve) => Promise.resolve(resolve(stubResponse)),
    catch: () => Promise.resolve(stubResponse)
  };

  const stubChannel = {
    on: () => stubChannel,
    subscribe: () => stubChannel
  };

  return {
    from: () => stubQuery,
    channel: () => stubChannel,
    removeChannel: () => {}
  };
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : buildStub();

export default supabase;
