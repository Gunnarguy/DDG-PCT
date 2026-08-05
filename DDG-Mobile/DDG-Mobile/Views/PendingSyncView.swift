import SwiftUI
import SwiftData

/// Lists every record still held only on this device, and lets the user push
/// them on demand.
///
/// The status bar previously showed a bare count — "(3 unsynced edits)" — with
/// no way to see what was pending or to do anything about it. On trail that is
/// backwards: if an ops-log entry does not reach the server, you need to know
/// which one and be able to retry it the moment a bar of signal appears, not
/// learn that some unnamed edit is outstanding somewhere.
struct PendingSyncView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query private var opsEntries: [OpsLogEntry]
    @Query private var loadouts: [GearLoadout]
    @Query private var customItems: [CustomItem]

    @State private var isRetrying = false
    @State private var retryResult: String?

    private var pendingOps: [OpsLogEntry] {
        opsEntries.filter { $0.syncStatus == .local || $0.syncStatus == .conflicted }
            .sorted { $0.createdAt > $1.createdAt }
    }

    private var pendingLoadouts: [GearLoadout] {
        loadouts.filter { $0.syncStatus == .local || $0.syncStatus == .conflicted }
            .sorted { $0.updatedAt > $1.updatedAt }
    }

    private var pendingItems: [CustomItem] {
        customItems.filter { $0.syncStatus == .local || $0.syncStatus == .conflicted }
            .sorted { $0.createdAt > $1.createdAt }
    }

    private var totalPending: Int {
        pendingOps.count + pendingLoadouts.count + pendingItems.count
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text(totalPending == 0
                         ? "Everything on this device has reached the server."
                         : "These \(totalPending) record\(totalPending == 1 ? " is" : "s are") saved on this phone but have not reached the server yet. Nothing is lost — they stay on the device and will upload on the next successful sync.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if !pendingOps.isEmpty {
                    Section("Ops log (\(pendingOps.count))") {
                        ForEach(pendingOps) { entry in
                            row(
                                title: entry.content,
                                subtitle: "\(entry.type.rawValue) · \(entry.userName) · \(entry.contextId)",
                                date: entry.createdAt,
                                lastAttempt: entry.lastSyncAttempt,
                                conflicted: entry.syncStatus == .conflicted
                            )
                        }
                    }
                }

                if !pendingLoadouts.isEmpty {
                    Section("Gear loadouts (\(pendingLoadouts.count))") {
                        ForEach(pendingLoadouts) { loadout in
                            row(
                                title: "Loadout for \(loadout.hikerId)",
                                subtitle: "\(loadout.itemIds.count) item\(loadout.itemIds.count == 1 ? "" : "s")",
                                date: loadout.updatedAt,
                                lastAttempt: nil,
                                conflicted: loadout.syncStatus == .conflicted
                            )
                        }
                    }
                }

                if !pendingItems.isEmpty {
                    Section("Custom gear items (\(pendingItems.count))") {
                        ForEach(pendingItems) { item in
                            row(
                                title: item.name,
                                subtitle: [item.category, item.detail]
                                    .compactMap { $0 }
                                    .filter { !$0.isEmpty }
                                    .joined(separator: " · "),
                                date: item.createdAt,
                                lastAttempt: nil,
                                conflicted: item.syncStatus == .conflicted
                            )
                        }
                    }
                }

                if let retryResult {
                    Section {
                        Text(retryResult)
                            .font(.footnote)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                Section {
                    Text("A failed sync is not data loss. Records stay on the device until the server confirms them, so retrying later is always safe.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .navigationTitle("Unsynced edits")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        Task { await retry() }
                    } label: {
                        if isRetrying {
                            ProgressView()
                        } else {
                            Text("Retry")
                        }
                    }
                    .disabled(isRetrying || totalPending == 0)
                }
            }
        }
    }

    @ViewBuilder
    private func row(
        title: String,
        subtitle: String,
        date: Date,
        lastAttempt: Date?,
        conflicted: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            // Full text, no line limit: an ops-log note that is clipped is a
            // note you cannot verify made it.
            Text(title)
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)
            if !subtitle.isEmpty {
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            HStack(spacing: 6) {
                Text(date.formatted(.relative(presentation: .named)))
                if let lastAttempt {
                    Text("· last tried \(lastAttempt.formatted(.relative(presentation: .named)))")
                }
                if conflicted {
                    Text("· server has a different version")
                        .foregroundStyle(.orange)
                }
            }
            .font(.caption2)
            .foregroundStyle(conflicted ? .orange : .secondary)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 2)
    }

    private func retry() async {
        isRetrying = true
        retryResult = nil
        let before = totalPending
        await SyncEngine.shared.syncPendingChanges(modelContext: modelContext)
        let after = totalPending
        isRetrying = false

        if after == 0 {
            retryResult = "All \(before) record\(before == 1 ? "" : "s") uploaded."
        } else if after < before {
            retryResult = "Uploaded \(before - after) of \(before). \(after) still pending — retry when you have a better connection."
        } else {
            retryResult = "Nothing uploaded. The records are still safe on this device. This usually means no usable connection, or that sign-in has expired."
        }
    }
}
