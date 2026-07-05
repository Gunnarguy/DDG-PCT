import Foundation
import SwiftData

// MARK: - Enums

enum LogType: String, Codable, CaseIterable {
    case note = "NOTE"
    case task = "TASK"
    case alert = "ALERT"
}

enum LogStatus: String, Codable, CaseIterable {
    case open = "OPEN"
    case inProgress = "IN_PROGRESS"
    case done = "DONE"
}

enum SyncStatus: String, Codable {
    case local       // Created/modified locally, not yet synced
    case syncing     // Sync in progress
    case synced      // Confirmed synced to Supabase
    case conflicted  // Server has a different version
}

// MARK: - OpsLogEntry (mirrors ops_logs table)

@Model
final class OpsLogEntry {
    @Attribute(.unique) var remoteId: Int64?
    var contextId: String
    var userName: String
    var content: String
    var type: LogType
    var status: LogStatus?
    var createdAt: Date
    var syncStatus: SyncStatus
    var lastSyncAttempt: Date?

    init(
        remoteId: Int64? = nil,
        contextId: String,
        userName: String,
        content: String,
        type: LogType = .note,
        status: LogStatus? = nil,
        createdAt: Date = .now,
        syncStatus: SyncStatus = .local
    ) {
        self.remoteId = remoteId
        self.contextId = contextId
        self.userName = userName
        self.content = content
        self.type = type
        self.status = status
        self.createdAt = createdAt
        self.syncStatus = syncStatus
    }

    /// Auto-classify from content text (mirrors web OpsLog.jsx logic)
    static func classify(_ text: String) -> (LogType, LogStatus?) {
        let lower = text.lowercased()
        if lower.hasPrefix("/task") {
            return (.task, .open)
        } else if lower.contains("warning") || lower.contains("alert") || lower.contains("danger") || lower.contains("fire") {
            return (.alert, nil)
        }
        return (.note, nil)
    }

    /// Cycle status: nil → OPEN → IN_PROGRESS → DONE → nil
    func cycleStatus() {
        switch status {
        case nil:         status = .open
        case .open:       status = .inProgress
        case .inProgress: status = .done
        case .done:       status = nil
        }
        syncStatus = .local
    }
}
