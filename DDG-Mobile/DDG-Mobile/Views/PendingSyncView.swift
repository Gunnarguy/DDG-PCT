import SwiftUI
import SwiftData
import Supabase

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
    @State private var sessionState: String = "checking…"

    /// Reads the live Supabase session rather than the app's own sign-in flag.
    /// Those are different things, and this project has a history of the app
    /// believing it is signed in while the Supabase session is absent — which
    /// is exactly what row-level security rejects a write for.
    private func refreshSessionState() async {
        guard SupabaseManager.shared.isConfigured else {
            sessionState = "Supabase is not configured in this build"
            return
        }
        do {
            let session = try await SupabaseManager.shared.client.auth.session
            let expiry = Date(timeIntervalSince1970: session.expiresAt)
            sessionState = expiry > .now
                ? "Supabase session active for \(session.user.email ?? session.user.id.uuidString)"
                : "Supabase session EXPIRED at \(expiry.formatted(date: .abbreviated, time: .shortened)) — writes will be rejected"
        } catch {
            sessionState = "NO Supabase session. The app may show you as signed in, but writes are unauthenticated and row-level security will reject them. Sign out and back in."
        }
    }

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
                // Diagnosis first. Burying the reason under the record list is
                // what made this look like an unexplained failure.
                if let retryResult {
                    Section("Last attempt") {
                        Text(retryResult)
                            .font(.footnote)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                Section("Why it is not uploading") {
                    Text(sessionState)
                        .font(.footnote)
                        .fixedSize(horizontal: false, vertical: true)
                        .foregroundStyle(sessionState.contains("active") ? Color.primary : Color.orange)
                    Text("Signed in to the app as: \(AuthManager.shared.currentUser?.name ?? "nobody")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

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

                Section {
                    Text("A failed sync is not data loss. Records stay on the device until the server confirms them, so retrying later is always safe.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .task { await refreshSessionState() }
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
            return
        }
        if after < before {
            retryResult = "Uploaded \(before - after) of \(before). \(after) still pending."
            return
        }

        // Nothing moved. Report the actual reason rather than guessing at it —
        // the engine already captured the error, it just was not being shown,
        // which is what made this look like an unexplained failure.
        var lines = ["Nothing uploaded. The records are still safe on this device."]
        if let error = SyncEngine.shared.lastError {
            lines.append("Server said: \(error)")
        } else if !SupabaseManager.shared.isConfigured {
            lines.append("Supabase is not configured in this build, so there is nowhere to upload to.")
        } else if AuthManager.shared.currentUser == nil {
            lines.append("No signed-in team member. Row-level security rejects writes without an authenticated session, so sign in and retry.")
        } else {
            lines.append("No error was reported, which usually means the request never left the device — most likely no usable connection.")
        }
        lines.append("Signed in as: \(AuthManager.shared.currentUser?.name ?? "nobody").")
        retryResult = lines.joined(separator: "\n\n")
    }
}
