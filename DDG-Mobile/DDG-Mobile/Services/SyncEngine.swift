import Foundation
import Supabase
import SwiftData

/// Offline-first sync engine that queues local writes and drains them when network is available.
///
/// Architecture:
/// 1. All writes go to SwiftData first (instant, offline-safe)
/// 2. Writes are marked with `syncStatus = .local`
/// 3. When network is available, the engine pushes pending changes to Supabase
/// 4. On success, marks items as `.synced`
/// 5. Pulls authenticated team changes back into SwiftData
///
/// Runs on MainActor because all SwiftData access requires it. URLSession async calls
/// suspend properly and do not block the main thread.
@MainActor
final class SyncEngine {
    static let shared = SyncEngine()

    private var isSyncing = false
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
            try await syncCustomItems(modelContext: modelContext)
            try await syncGearLoadouts(modelContext: modelContext)
            lastSyncDate = .now
        } catch {
            lastError = error.localizedDescription
        }
    }

    func pullRemoteChanges(modelContext: ModelContext) async {
        guard SupabaseManager.shared.isConfigured else { return }

        do {
            try await pullOpsLogs(modelContext: modelContext)
            try await pullCustomItems(modelContext: modelContext)
            try await pullGearLoadouts(modelContext: modelContext)
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

    // MARK: - Push (Local → Remote)

    private func syncOpsLogs(modelContext: ModelContext) async throws {
        guard SupabaseManager.shared.isConfigured else { return }

        let all = (try? modelContext.fetch(FetchDescriptor<OpsLogEntry>())) ?? []
        let pending = all.filter { $0.syncStatus == .local }
        guard !pending.isEmpty else { return }

        let client = SupabaseManager.shared.client

        for entry in pending {
            entry.syncStatus = .syncing
            entry.lastSyncAttempt = .now
            let row = SupabaseManager.OpsLogRow(
                context_id: entry.contextId,
                user_name: entry.userName,
                content: entry.content,
                type: entry.type.rawValue,
                status: entry.status?.rawValue,
                created_at: SupabaseManager.iso8601.string(from: entry.createdAt)
            )

            do {
                if let remoteId = entry.remoteId {
                    try await client
                        .from(SupabaseManager.Table.opsLogs)
                        .update(
                            SupabaseManager.OpsStatusRow(
                                status: entry.status?.rawValue
                            )
                        )
                        .eq("id", value: Int(remoteId))
                        .execute()
                } else {
                    let inserted: RemoteIdentifier = try await client
                        .from(SupabaseManager.Table.opsLogs)
                        .insert(row)
                        .select("id")
                        .single()
                        .execute()
                        .value
                    entry.remoteId = inserted.id
                }
                entry.syncStatus = .synced
            } catch {
                entry.syncStatus = .local
                throw error
            }
        }
        try? modelContext.save()
    }

    private func syncGearLoadouts(modelContext: ModelContext) async throws {
        guard SupabaseManager.shared.isConfigured else { return }

        let all = (try? modelContext.fetch(FetchDescriptor<GearLoadout>())) ?? []
        let pending = all.filter { $0.syncStatus == .local }
        guard !pending.isEmpty else { return }

        let client = SupabaseManager.shared.client

        for loadout in pending {
            loadout.syncStatus = .syncing
            let row = SupabaseManager.GearLoadoutRow(
                hiker_id: loadout.hikerId,
                item_ids: loadout.itemIds,
                updated_at: SupabaseManager.iso8601.string(from: loadout.updatedAt)
            )

            do {
                try await client
                    .from(SupabaseManager.Table.gearLoadouts)
                    .upsert(row, onConflict: "hiker_id")
                    .execute()
                loadout.syncStatus = .synced
            } catch {
                loadout.syncStatus = .local
                throw error
            }
        }
        try? modelContext.save()
    }

    private func syncCustomItems(modelContext: ModelContext) async throws {
        guard SupabaseManager.shared.isConfigured else { return }

        let all = (try? modelContext.fetch(FetchDescriptor<CustomItem>())) ?? []
        let pending = all.filter { $0.syncStatus == .local }
        guard !pending.isEmpty else { return }

        let client = SupabaseManager.shared.client

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
                if let remoteId = item.remoteId {
                    try await client
                        .from(SupabaseManager.Table.customItems)
                        .update(row)
                        .eq("id", value: Int(remoteId))
                        .execute()
                } else {
                    let oldStableId = item.stableId
                    let inserted: RemoteIdentifier = try await client
                        .from(SupabaseManager.Table.customItems)
                        .insert(row)
                        .select("id")
                        .single()
                        .execute()
                        .value
                    item.remoteId = inserted.id
                    item.stableId = "custom-\(inserted.id)"
                    replaceItemId(
                        oldStableId,
                        with: item.stableId,
                        modelContext: modelContext
                    )
                }
                item.syncStatus = .synced
            } catch {
                item.syncStatus = .local
                throw error
            }
        }
        try? modelContext.save()
    }

    // MARK: - Pull (Remote → Local)

    private nonisolated struct RemoteIdentifier: Decodable, Sendable {
        let id: Int64
    }

    private nonisolated struct RemoteOpsLog: Decodable, Sendable {
        let id: Int64
        let context_id: String
        let user_name: String
        let content: String
        let type: String
        let status: String?
        let created_at: String
    }

    private nonisolated struct RemoteGearLoadout: Decodable, Sendable {
        let hiker_id: String
        let item_ids: [String]
        let updated_at: String
    }

    private nonisolated struct RemoteCustomItem: Decodable, Sendable {
        let id: Int64
        let created_at: String
        let name: String
        let detail: String?
        let weight_val: Double?
        let weight_label: String?
        let category: String?
        let module_id: String?
        let source_ids: [String]?
        let created_by: String?
    }

    private func pullOpsLogs(modelContext: ModelContext) async throws {
        let remoteLogs: [RemoteOpsLog] = try await SupabaseManager.shared.client
            .from(SupabaseManager.Table.opsLogs)
            .select()
            .limit(100)
            .execute()
            .value
        let localLogs = (try? modelContext.fetch(FetchDescriptor<OpsLogEntry>())) ?? []
        let localByRemoteId = Dictionary(
            uniqueKeysWithValues: localLogs.compactMap { entry in
                entry.remoteId.map { ($0, entry) }
            }
        )

        for remote in remoteLogs {
            if let existing = localByRemoteId[remote.id] {
                guard existing.syncStatus != .local else { continue }
                existing.contextId = remote.context_id
                existing.userName = remote.user_name
                existing.content = remote.content
                existing.type = LogType(rawValue: remote.type) ?? .note
                existing.status = remote.status.flatMap { LogStatus(rawValue: $0) }
                existing.createdAt = parseDate(remote.created_at)
                existing.syncStatus = .synced
                continue
            }

            let entry = OpsLogEntry(
                remoteId: remote.id,
                contextId: remote.context_id,
                userName: remote.user_name,
                content: remote.content,
                type: LogType(rawValue: remote.type) ?? .note,
                status: remote.status.flatMap { LogStatus(rawValue: $0) },
                createdAt: parseDate(remote.created_at),
                syncStatus: .synced
            )
            modelContext.insert(entry)
        }
        try? modelContext.save()
    }

    private func pullCustomItems(modelContext: ModelContext) async throws {
        let remoteItems: [RemoteCustomItem] = try await SupabaseManager.shared.client
            .from(SupabaseManager.Table.customItems)
            .select()
            .execute()
            .value
        let localItems = (try? modelContext.fetch(FetchDescriptor<CustomItem>())) ?? []
        let localByRemoteId = Dictionary(
            uniqueKeysWithValues: localItems.compactMap { item in
                item.remoteId.map { ($0, item) }
            }
        )

        for remote in remoteItems {
            if let existing = localByRemoteId[remote.id] {
                guard existing.syncStatus != .local else { continue }
                existing.stableId = "custom-\(remote.id)"
                existing.name = remote.name
                existing.detail = remote.detail
                existing.weightVal = remote.weight_val
                existing.weightLabel = remote.weight_label
                existing.category = remote.category ?? "Custom"
                existing.moduleId = remote.module_id ?? "custom"
                existing.sourceIds = remote.source_ids ?? []
                existing.createdBy = remote.created_by
                existing.createdAt = parseDate(remote.created_at)
                existing.syncStatus = .synced
                continue
            }

            modelContext.insert(
                CustomItem(
                    remoteId: remote.id,
                    stableId: "custom-\(remote.id)",
                    name: remote.name,
                    detail: remote.detail,
                    weightVal: remote.weight_val,
                    weightLabel: remote.weight_label,
                    category: remote.category ?? "Custom",
                    moduleId: remote.module_id ?? "custom",
                    sourceIds: remote.source_ids ?? [],
                    createdBy: remote.created_by,
                    createdAt: parseDate(remote.created_at),
                    syncStatus: .synced
                )
            )
        }
        try? modelContext.save()
    }

    private func pullGearLoadouts(modelContext: ModelContext) async throws {
        let remoteLoadouts: [RemoteGearLoadout] = try await SupabaseManager.shared.client
            .from(SupabaseManager.Table.gearLoadouts)
            .select()
            .execute()
            .value
        let localLoadouts = (try? modelContext.fetch(FetchDescriptor<GearLoadout>())) ?? []
        let localByHikerId = Dictionary(
            uniqueKeysWithValues: localLoadouts.map { ($0.hikerId, $0) }
        )

        for remote in remoteLoadouts {
            let remoteDate = parseDate(remote.updated_at)
            if let existing = localByHikerId[remote.hiker_id] {
                guard
                    existing.syncStatus != .local,
                    remoteDate >= existing.updatedAt
                else { continue }
                existing.itemIds = remote.item_ids
                existing.updatedAt = remoteDate
                existing.syncStatus = .synced
                continue
            }

            modelContext.insert(
                GearLoadout(
                    hikerId: remote.hiker_id,
                    itemIds: remote.item_ids,
                    updatedAt: remoteDate,
                    syncStatus: .synced
                )
            )
        }
        try? modelContext.save()
    }

    private func replaceItemId(
        _ oldId: String,
        with newId: String,
        modelContext: ModelContext
    ) {
        let loadouts = (try? modelContext.fetch(FetchDescriptor<GearLoadout>())) ?? []
        for loadout in loadouts where loadout.itemIds.contains(oldId) {
            loadout.itemIds = loadout.itemIds.map { $0 == oldId ? newId : $0 }
            loadout.updatedAt = .now
            loadout.syncStatus = .local
        }
    }

    private func parseDate(_ value: String) -> Date {
        SupabaseManager.iso8601.date(from: value)
            ?? ISO8601DateFormatter().date(from: value)
            ?? .now
    }
}
