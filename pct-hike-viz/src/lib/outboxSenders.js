import supabase, { supabaseReady, supabaseConfigError } from "./supabase";
import { OUTBOX_KINDS } from "./outbox";

/**
 * The Supabase half of the outbox: one sender per kind of queued write, each
 * throwing the server's own words on failure so the inspector can repeat them
 * verbatim instead of guessing.
 *
 * Kept apart from outbox.js so the queue itself stays a plain data structure
 * with no network in it.
 */

const assertConfigured = () => {
  if (!supabaseReady) throw new Error(supabaseConfigError);
};

const throwOnError = (error, fallback) => {
  if (!error) return;
  throw new Error(error.message || fallback);
};

export const outboxSenders = {
  [OUTBOX_KINDS.opsLog]: async (payload) => {
    assertConfigured();
    const { error } = await supabase.from("ops_logs").insert([payload]);
    throwOnError(error, "The ops log entry was rejected by the server.");
  },

  [OUTBOX_KINDS.gearLoadout]: async (payload) => {
    assertConfigured();
    const { error } = await supabase.from("gear_loadouts").upsert({
      ...payload,
      // Stamped at send time, not queue time: this row records when the server
      // learned the pack contents, and a week-old timestamp would lose a race
      // against a teammate's newer edit.
      updated_at: new Date().toISOString(),
    });
    throwOnError(error, "The gear loadout was rejected by the server.");
  },

  // Returns the inserted row so the queue can swap the placeholder id this
  // item was given offline for the one the server assigned.
  [OUTBOX_KINDS.customItem]: async (payload) => {
    assertConfigured();
    const { data, error } = await supabase
      .from("custom_items")
      .insert([payload])
      .select()
      .single();
    throwOnError(error, "The custom gear item was rejected by the server.");
    return data;
  },
};

/**
 * The live Supabase session, not the app's own sign-in flag.
 *
 * These are different things, and the iOS app has a history of believing it was
 * signed in while the Supabase session was absent — which is exactly what
 * row-level security rejects a write for. The web app can land in the same
 * state, so the inspector asks the same question and reports the answer first.
 */
export const describeSupabaseSession = async () => {
  if (!supabaseReady) {
    return {
      healthy: false,
      message:
        "Supabase is not configured in this build, so there is nowhere to upload to. Queued edits stay on this device.",
    };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return {
        healthy: false,
        message: `Could not read the Supabase session: ${error.message}. Writes will be rejected until you sign in again.`,
      };
    }

    const session = data?.session;
    if (!session) {
      return {
        healthy: false,
        message:
          "No Supabase session. The app may show you as signed in, but writes are unauthenticated and row-level security will reject them. Sign out and back in.",
      };
    }

    const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
    if (expiresAt && expiresAt <= Date.now()) {
      return {
        healthy: false,
        message: `Supabase session EXPIRED at ${new Date(expiresAt).toLocaleString()} — writes will be rejected until you sign in again.`,
      };
    }

    const who = session.user?.email ?? session.user?.id ?? "unknown user";
    return {
      healthy: true,
      message: `Supabase session active for ${who}.`,
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Could not read the Supabase session: ${error?.message ?? String(error)}.`,
    };
  }
};

export default outboxSenders;
