import Foundation
import BackgroundTasks
import SwiftData

/// Manages background app refresh tasks for periodic sync and keep-alive pings.
///
/// Two registered tasks:
/// 1. `com.ddg.mobile.sync` — Push/pull pending changes (every 30min when possible)
/// 2. `com.ddg.mobile.keepalive` — Ping Supabase to prevent free-tier sleep (every 6 days)
@MainActor
final class BackgroundTaskManager {
    static let shared = BackgroundTaskManager()

    static let syncTaskID = "com.ddg.mobile.sync"
    static let keepAliveTaskID = "com.ddg.mobile.keepalive"

    private var modelContainer: ModelContainer?

    private init() {}

    /// Call from app init to register task handlers
    func register(modelContainer: ModelContainer) {
        self.modelContainer = modelContainer

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.syncTaskID,
            using: nil
        ) { task in
            Task { @MainActor in
                await self.handleSyncTask(task as! BGAppRefreshTask)
            }
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.keepAliveTaskID,
            using: nil
        ) { task in
            Task { @MainActor in
                await self.handleKeepAliveTask(task as! BGAppRefreshTask)
            }
        }
    }

    /// Schedule the next background sync
    func scheduleSyncTask() {
        let request = BGAppRefreshTaskRequest(identifier: Self.syncTaskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 30 * 60) // 30 minutes
        try? BGTaskScheduler.shared.submit(request)
    }

    /// Schedule the next keep-alive ping
    func scheduleKeepAliveTask() {
        let request = BGAppRefreshTaskRequest(identifier: Self.keepAliveTaskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 6 * 24 * 60 * 60) // 6 days
        try? BGTaskScheduler.shared.submit(request)
    }

    // MARK: - Task Handlers

    private func handleSyncTask(_ task: BGAppRefreshTask) async {
        // Schedule the next sync before doing work
        scheduleSyncTask()

        guard let container = modelContainer else {
            task.setTaskCompleted(success: false)
            return
        }

        let context = container.mainContext

        // Set up expiration handler
        let syncTask = Task {
            await SyncEngine.shared.syncPendingChanges(modelContext: context)
            await SyncEngine.shared.pullRemoteChanges(modelContext: context)
        }

        task.expirationHandler = {
            syncTask.cancel()
        }

        await syncTask.value
        task.setTaskCompleted(success: true)
    }

    private func handleKeepAliveTask(_ task: BGAppRefreshTask) async {
        // Schedule the next keep-alive
        scheduleKeepAliveTask()

        let pingTask = Task {
            await SyncEngine.shared.keepAlivePing()
        }

        task.expirationHandler = {
            pingTask.cancel()
        }

        await pingTask.value
        task.setTaskCompleted(success: true)
    }
}
