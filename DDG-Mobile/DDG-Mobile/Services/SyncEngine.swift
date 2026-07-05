import Foundation
import SwiftData

/// Offline-first sync engine that queues local writes and drains them when network is available.
///
/// Architecture:
/// 1. All writes go to SwiftData first (instant, offline-safe)
/// 2. Writes are marked with `syncStatus = .local`
/// 3. When network is available, the engine pushes pending changes to Supabase
/// 4. On success, marks items as `.synced`
/// 5. On 503 (Supabase waking from sleep), retries with exponential backoff
///
/// Runs on MainActor because all SwiftData access requires it. URLSession async calls
/// suspend properly and do not block the main thread.
@MainActor
final class SyncEngine {
    static let shared = SyncEngine()

    private var isSyncing = false
    private var retryDelay: TimeInterval = 1.0
    private let maxRetryDelay: TimeInterval = 300.0
    private(set) var lastSyncDate: Date?
    private(set) var lastError: String?

    // MARK: - Public API

    func syncPendingChanges(modelContext: ModelContext) async {
        guard !isSyncing else { return }
        isSyncing = true
        defer { isSyncing = false }

        lastError = nil

        do {
            try await syncOpsLogs(modelContext: modelContext)
            try await syncGearLoadouts(modelContext: modelContext)
            try await syncCustomItems(modelContext: modelContext)
            lastSyncDate = .now
            retryDelay = 1.0
        } catch let error as SyncError where error == .supabaseSleeping {
            lastError = "Supabase waking up, retrying..."
            await backoff()
            await syncPendingChanges(modelContext: modelContext)
        } catch {
            lastError = error.localizedDescription
        }
    }

    func pullRemoteChanges(modelContext: ModelContext) async {
        guard SupabaseManager.shared.isConfigured else { return }

        do {
            try await pullOpsLogs(modelContext: modelContext)
            lastSyncDate = .now
        } catch {
            lastError = error.localizedDescription
        }
    }

    // MARK: - Keep-Alive

    func keepAlivePing() async {
        guard SupabaseManager.shared.isConfigured else { return }
        let config = SupabaseManager.shared.config

        guard let url = URL(string: config.url + "/rest/v1/") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "HEAD"
        request.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        _ = try? await URLSession.shared.data(for: request)
    }

    func pendingCount(modelContext: ModelContext) -> Int {
        let allOps = (try? modelContext.fetch(FetchDescriptor<OpsLogEntry>())) ?? []
        let allGear = (try? modelContext.fetch(FetchDescriptor<GearLoadout>())) ?? []
        let allItems = (try? modelContext.fetch(FetchDescriptor<CustomItem>())) ?? []
        return allOps.filter { $0.syncStatus == .local }.count
            + allGear.filter { $0.syncStatus == .local }.count
            + allItems.filter { $0.syncStatus == .local }.count
    }

    // MARK: - Errors

    enum SyncError: Error, Equatable {
        case notConfigured
        case supabaseSleeping
        case httpError(Int)
        case encodingFailed
    }

    // MARK: - Push (Local → Remote)

    private func syncOpsLogs(modelContext: ModelContext) async throws {
        guard SupabaseManager.shared.isConfigured else { return }

        let all = (try? modelContext.fetch(FetchDescriptor<OpsLogEntry>())) ?? []
        let pending = all.filter { $0.syncStatus == .local }
        guard !pending.isEmpty else { return }

        let config = SupabaseManager.shared.config

        for entry in pending {
            entry.syncStatus = .syncing
            let row = SupabaseManager.OpsLogRow(
                context_id: entry.contextId,
                user_name: entry.userName,
                content: entry.content,
                type: entry.type.rawValue,
                status: entry.status?.rawValue,
                created_at: SupabaseManager.iso8601.string(from: entry.createdAt)
            )

            do {
                try await postToSupabase(
                    baseURL: config.url, anonKey: config.anonKey,
                    table: SupabaseManager.Table.opsLogs, body: row
                )
                entry.syncStatus = .synced
            } catch SyncError.supabaseSleeping {
                entry.syncStatus = .local
                throw SyncError.supabaseSleeping
            } catch {
                entry.syncStatus = .local
            }
        }
        try? modelContext.save()
    }

    private func syncGearLoadouts(modelContext: ModelContext) async throws {
        guard SupabaseManager.shared.isConfigured else { return }

        let all = (try? modelContext.fetch(FetchDescriptor<GearLoadout>())) ?? []
        let pending = all.filter { $0.syncStatus == .local }
        guard !pending.isEmpty else { return }

        let config = SupabaseManager.shared.config

        for loadout in pending {
            loadout.syncStatus = .syncing
            let row = SupabaseManager.GearLoadoutRow(
                hiker_id: loadout.hikerId,
                item_ids: loadout.itemIds,
                updated_at: SupabaseManager.iso8601.string(from: loadout.updatedAt)
            )

            do {
                try await postToSupabase(
                    baseURL: config.url, anonKey: config.anonKey,
                    table: SupabaseManager.Table.gearLoadouts, body: row
                )
                loadout.syncStatus = .synced
            } catch SyncError.supabaseSleeping {
                loadout.syncStatus = .local
                throw SyncError.supabaseSleeping
            } catch {
                loadout.syncStatus = .local
            }
        }
        try? modelContext.save()
    }

    private func syncCustomItems(modelContext: ModelContext) async throws {
        guard SupabaseManager.shared.isConfigured else { return }

        let all = (try? modelContext.fetch(FetchDescriptor<CustomItem>())) ?? []
        let pending = all.filter { $0.syncStatus == .local }
        guard !pending.isEmpty else { return }

        let config = SupabaseManager.shared.config

        for item in pending {
            item.syncStatus = .syncing
            let row = SupabaseManager.CustomItemRow(
                name: item.name,
                detail: item.detail,
                weight_val: item.weightVal,
                weight_label: item.weightLabel,
                category: item.category,
                module_id: item.moduleId,
                source_ids: item.sourceIds,
                created_by: item.createdBy,
                created_at: SupabaseManager.iso8601.string(from: item.createdAt)
            )

            do {
                try await postToSupabase(
                    baseURL: config.url, anonKey: config.anonKey,
                    table: SupabaseManager.Table.customItems, body: row
                )
                item.syncStatus = .synced
            } catch SyncError.supabaseSleeping {
                item.syncStatus = .local
                throw SyncError.supabaseSleeping
            } catch {
                item.syncStatus = .local
            }
        }
        try? modelContext.save()
    }

    // MARK: - Pull (Remote → Local)

    private struct RemoteOpsLog: Decodable, Sendable {
        let id: Int64
        let context_id: String
        let user_name: String
        let content: String
        let type: String
        let status: String?
        let created_at: String
    }

    private func pullOpsLogs(modelContext: ModelContext) async throws {
        let config = SupabaseManager.shared.config

        guard let url = URL(string: "\(config.url)/rest/v1/\(SupabaseManager.Table.opsLogs)?select=*&order=created_at.desc&limit=100") else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")

        let (data, response) = try await URLSession.shared.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 503 {
            throw SyncError.supabaseSleeping
        }

        let remoteLogs = try JSONDecoder().decode([RemoteOpsLog].self, from: data)

        for remote in remoteLogs {
            let remoteId = remote.id
            let all = (try? modelContext.fetch(FetchDescriptor<OpsLogEntry>())) ?? []
            if all.contains(where: { $0.remoteId == remoteId }) {
                continue
            }

            let entry = OpsLogEntry(
                remoteId: remote.id,
                contextId: remote.context_id,
                userName: remote.user_name,
                content: remote.content,
                type: LogType(rawValue: remote.type) ?? .note,
                status: remote.status.flatMap { LogStatus(rawValue: $0) },
                createdAt: SupabaseManager.iso8601.date(from: remote.created_at) ?? .now,
                syncStatus: .synced
            )
            modelContext.insert(entry)
        }
        try? modelContext.save()
    }

    // MARK: - HTTP Helper

    private func postToSupabase<T: Encodable>(
        baseURL: String, anonKey: String, table: String, body: T
    ) async throws {
        guard let url = URL(string: "\(baseURL)/rest/v1/\(table)") else {
            throw SyncError.notConfigured
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try JSONEncoder().encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { return }

        if httpResponse.statusCode == 503 {
            throw SyncError.supabaseSleeping
        }
        if httpResponse.statusCode >= 400 {
            throw SyncError.httpError(httpResponse.statusCode)
        }
    }

    // MARK: - Retry

    private func backoff() async {
        try? await Task.sleep(for: .seconds(retryDelay))
        retryDelay = min(retryDelay * 2, maxRetryDelay)
    }
}
