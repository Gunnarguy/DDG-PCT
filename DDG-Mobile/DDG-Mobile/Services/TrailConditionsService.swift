import Foundation
import Observation
import Supabase

nonisolated enum TrailConditionDataOrigin: String, Sendable {
    case live = "Live refresh"
    case database = "Daily Supabase snapshot"
    case deviceCache = "Offline device cache"
}

nonisolated struct TrailConditionLoadResult: Sendable {
    let snapshot: TrailConditionsSnapshot
    let origin: TrailConditionDataOrigin
    let warning: String?
}

private struct TrailConditionSnapshotRow: Decodable, Sendable {
    let payload: TrailConditionsSnapshot
    let sourceStatus: [String: TrailConditionSourceState]

    enum CodingKeys: String, CodingKey {
        case payload
        case sourceStatus = "source_status"
    }
}

@MainActor
final class TrailConditionsService {
    static let shared = TrailConditionsService()

    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let clientCacheDuration: TimeInterval = 4 * 60 * 60

    private var cacheURL: URL? {
        guard let directory = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first else {
            return nil
        }
        return directory
            .appendingPathComponent("DDG-Trail-Conditions", isDirectory: true)
            .appendingPathComponent("latest.json")
    }

    func fetch(force: Bool = false) async throws -> TrailConditionLoadResult {
        let cached = readCache()
        if !force,
           let cached,
           let age = cached.age,
           age < clientCacheDuration {
            return TrailConditionLoadResult(
                snapshot: cached,
                origin: .deviceCache,
                warning: nil
            )
        }

        guard SupabaseManager.shared.isConfigured else {
            if let cached {
                return TrailConditionLoadResult(
                    snapshot: cached,
                    origin: .deviceCache,
                    warning: "Supabase is not configured. Showing the last device snapshot."
                )
            }
            throw TrailConditionsError.notConfigured
        }

        do {
            let snapshot: TrailConditionsSnapshot = try await SupabaseManager.shared.client
                .functions
                .invoke(
                    "trail-conditions",
                    options: FunctionInvokeOptions(body: ["force": force])
                )
            try saveCache(snapshot)
            return TrailConditionLoadResult(
                snapshot: snapshot,
                origin: .live,
                warning: snapshot.isDailySnapshotStale
                    ? "The server responded, but its observation time is older than 26 hours."
                    : nil
            )
        } catch {
            if let databaseSnapshot = try? await fetchLatestDatabaseSnapshot() {
                try? saveCache(databaseSnapshot)
                return TrailConditionLoadResult(
                    snapshot: databaseSnapshot,
                    origin: .database,
                    warning: "Live refresh failed. Showing the latest protected Supabase snapshot."
                )
            }

            if let cached {
                return TrailConditionLoadResult(
                    snapshot: cached,
                    origin: .deviceCache,
                    warning: "Network refresh failed. Showing cached data from this iPhone."
                )
            }
            throw error
        }
    }

    @discardableResult
    func refreshForBackgroundTask() async -> Bool {
        do {
            _ = try await fetch(force: false)
            return true
        } catch {
            return false
        }
    }

    private func fetchLatestDatabaseSnapshot() async throws -> TrailConditionsSnapshot {
        let rows: [TrailConditionSnapshotRow] = try await SupabaseManager.shared.client
            .from(SupabaseManager.Table.trailConditionSnapshots)
            .select("payload,source_status")
            .order("fetched_at", ascending: false)
            .limit(1)
            .execute()
            .value

        guard let row = rows.first else {
            throw TrailConditionsError.noSnapshot
        }
        return row.payload.merging(sourceStatus: row.sourceStatus)
    }

    private func readCache() -> TrailConditionsSnapshot? {
        guard let cacheURL,
              let data = try? Data(contentsOf: cacheURL) else {
            return nil
        }
        return try? decoder.decode(TrailConditionsSnapshot.self, from: data)
    }

    private func saveCache(_ snapshot: TrailConditionsSnapshot) throws {
        guard let cacheURL else { return }
        let directory = cacheURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )
        try encoder.encode(snapshot).write(to: cacheURL, options: .atomic)
    }
}

nonisolated enum TrailConditionsError: LocalizedError {
    case notConfigured
    case noSnapshot

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            "Supabase is not configured on this iPhone."
        case .noSnapshot:
            "No daily trail-condition snapshot is available."
        }
    }
}

@Observable
@MainActor
final class TrailConditionsStore {
    private(set) var snapshot: TrailConditionsSnapshot?
    private(set) var origin: TrailConditionDataOrigin?
    private(set) var warning: String?
    private(set) var errorMessage: String?
    private(set) var isLoading = false

    func refresh(force: Bool = false) async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let result = try await TrailConditionsService.shared.fetch(force: force)
            snapshot = result.snapshot
            origin = result.origin
            warning = result.warning
        } catch is CancellationError {
            return
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
