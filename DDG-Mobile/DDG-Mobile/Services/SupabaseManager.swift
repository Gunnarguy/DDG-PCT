import Foundation

// MARK: - Supabase Configuration
//
// To connect to Supabase, add the supabase-swift SPM package in Xcode:
//   File → Add Package Dependencies → https://github.com/supabase/supabase-swift.git
//   Version: from "2.0.0"
//
// Then uncomment the Supabase import and client initialization below.

import Supabase
import Auth

/// Manages the Supabase client connection and provides typed access to tables.
@MainActor
final class SupabaseManager {
    static let shared = SupabaseManager()

    // MARK: - Configuration

    /// Set these from environment or a config file before first use.
    /// DO NOT commit real keys to source control.
    struct Config {
        var url: String = ""        // e.g., "https://your-project.supabase.co"
        var anonKey: String = ""    // Public anon key
        var epaApiKey: String = ""  // EPA AirNow API key
    }

    var config = Config()

    lazy var client: SupabaseClient = {
        guard !config.url.isEmpty, !config.anonKey.isEmpty else {
            fatalError("SupabaseManager.config must be set before accessing client")
        }
        return SupabaseClient(
            supabaseURL: URL(string: config.url)!,
            supabaseKey: config.anonKey,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
    }()

    /// Whether the Supabase client is configured (URL + key set)
    var isConfigured: Bool {
        !config.url.isEmpty && !config.anonKey.isEmpty
    }

    // MARK: - Edge Functions

    /// AQI proxy edge function URL
    var aqiProxyURL: URL? {
        guard !config.url.isEmpty else { return nil }
        return URL(string: "\(config.url)/functions/v1/aqi-proxy")
    }

    var trailConditionsURL: URL? {
        guard !config.url.isEmpty else { return nil }
        return URL(string: "\(config.url)/functions/v1/trail-conditions")
    }

    // MARK: - Table Names (match combined.sql)

    enum Table {
        static let opsLogs = "ops_logs"
        static let gearLoadouts = "gear_loadouts"
        static let customItems = "custom_items"
        static let allowedEmails = "allowed_emails"
        static let accessRequests = "access_requests"
        static let teamProfiles = "ddg_team_profiles"
        static let trailConditionSnapshots = "trail_condition_snapshots"
    }

    // MARK: - Encodable Row Structs (for insert/upsert)

    struct OpsLogRow: Codable, Sendable {
        let context_id: String
        let user_name: String
        let content: String
        let type: String
        let status: String?
        let created_at: String
    }

    struct GearLoadoutRow: Codable, Sendable {
        let hiker_id: String
        let item_ids: [String]
        let updated_at: String
    }

    struct CustomItemRow: Codable, Sendable {
        let name: String
        let detail: String?
        let weight_val: Double?
        let weight_label: String?
        let category: String
        let module_id: String
        let source_ids: [String]
        let created_by: String?
        let created_at: String
    }

    // MARK: - Date Formatting

    static let iso8601: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private init() {}
}
