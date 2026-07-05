import SwiftUI
import SwiftData

struct OpsLogView: View {
    @Query(sort: \OpsLogEntry.createdAt, order: .reverse) private var entries: [OpsLogEntry]
    @Environment(\.modelContext) private var modelContext
    @Environment(AuthManager.self) private var auth

    @State private var newMessage = ""
    @State private var network = NetworkMonitor.shared
    @State private var summaryText: String?
    @State private var isSummarizing = false
    @State private var filterType: LogType?

    private var todayEntries: [OpsLogEntry] {
        entries.filter { Calendar.current.isDateInToday($0.createdAt) }
    }

    private var filteredEntries: [OpsLogEntry] {
        guard let filter = filterType else { return entries }
        return entries.filter { $0.type == filter }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // AI Summary banner
                if let summary = summaryText {
                    summaryBanner(summary)
                }

                // Filter bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(label: "All", isActive: filterType == nil) {
                            filterType = nil
                        }
                        ForEach(LogType.allCases, id: \.self) { type in
                            FilterChip(label: type.rawValue, isActive: filterType == type) {
                                filterType = filterType == type ? nil : type
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 4)

                // Log entries
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(filteredEntries) { entry in
                            LogEntryCard(entry: entry)
                        }
                    }
                    .padding()
                }

                if filteredEntries.isEmpty {
                    Spacer()
                    ContentUnavailableView(
                        "No Ops Logs Yet",
                        systemImage: "list.bullet.clipboard",
                        description: Text("Start logging tasks, notes, and alerts for the team")
                    )
                    Spacer()
                }

                // Input bar
                inputBar
            }
            .navigationTitle("Ops Log")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            Task { await summarizeToday() }
                        } label: {
                            Label(
                                isSummarizing ? "Summarizing..." : "Summarize Today",
                                systemImage: "sparkles"
                            )
                        }
                        .disabled(todayEntries.isEmpty || isSummarizing)

                        Button {
                            Task {
                                await SyncEngine.shared.syncPendingChanges(modelContext: modelContext)
                            }
                        } label: {
                            Label("Force Sync", systemImage: "arrow.triangle.2.circlepath")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
    }

    // MARK: - AI Summary Banner

    private func summaryBanner(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(.purple)
                Text("Today's Summary")
                    .font(.caption.bold())
                Spacer()
                Button {
                    summaryText = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            Text(text)
                .font(.callout)
        }
        .padding()
        .background(.purple.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
        .padding(.top, 8)
    }

    // MARK: - Summarize

    private func summarizeToday() async {
        isSummarizing = true
        defer { isSummarizing = false }

        let formatter = DateFormatter()
        formatter.timeStyle = .short

        let entryData = todayEntries.map { entry in
            (userName: entry.userName, content: entry.content,
             type: entry.type.rawValue, status: entry.status?.rawValue,
             time: formatter.string(from: entry.createdAt))
        }

        do {
            summaryText = try await OnDeviceLLM.shared.summarizeOpsLog(entries: entryData)
        } catch {
            summaryText = "Could not generate summary: \(error.localizedDescription)"
        }
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: 8) {
            TextField("Log a note, /task, or alert...", text: $newMessage)
                .textFieldStyle(.roundedBorder)

            Button {
                sendMessage()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
            }
            .disabled(newMessage.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding()
        .background(.bar)
    }

    // MARK: - Send

    private func sendMessage() {
        let text = newMessage.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }

        let (type, status) = OpsLogEntry.classify(text)
        let cleanText = text.hasPrefix("/task") ? String(text.dropFirst(5)).trimmingCharacters(in: .whitespaces) : text

        let userName = auth.currentUser?.id ?? "unknown"
        let entry = OpsLogEntry(
            contextId: "section-o",
            userName: userName,
            content: cleanText,
            type: type,
            status: status
        )
        modelContext.insert(entry)
        newMessage = ""
    }
}

// MARK: - Filter Chip

private struct FilterChip: View {
    let label: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.caption.bold())
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(isActive ? Color.accentColor : Color.clear, in: Capsule())
                .foregroundStyle(isActive ? .white : .primary)
                .overlay(Capsule().strokeBorder(.quaternary))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Log Entry Card

struct LogEntryCard: View {
    let entry: OpsLogEntry

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            // Type indicator
            Image(systemName: iconFor(entry.type))
                .foregroundStyle(colorFor(entry.type))
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(entry.userName)
                        .font(.caption.bold())
                    Spacer()
                    Text(entry.createdAt, style: .relative)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                Text(entry.content)
                    .font(.body)

                HStack(spacing: 8) {
                    // Type badge
                    Text(entry.type.rawValue)
                        .font(.system(size: 10, weight: .bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(colorFor(entry.type).opacity(0.15), in: Capsule())
                        .foregroundStyle(colorFor(entry.type))

                    // Status badge (tappable to cycle)
                    if entry.type == .task {
                        Button {
                            entry.cycleStatus()
                        } label: {
                            Text(entry.status?.rawValue.replacingOccurrences(of: "_", with: " ") ?? "—")
                                .font(.system(size: 10, weight: .bold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(statusColor(entry.status).opacity(0.15), in: Capsule())
                                .foregroundStyle(statusColor(entry.status))
                        }
                        .buttonStyle(.plain)
                    } else if let status = entry.status {
                        Text(status.rawValue.replacingOccurrences(of: "_", with: " "))
                            .font(.system(size: 10, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.quaternary, in: Capsule())
                    }

                    // Sync status
                    Image(systemName: syncIcon(entry.syncStatus))
                        .font(.system(size: 10))
                        .foregroundStyle(syncColor(entry.syncStatus))
                }
            }
        }
        .padding(12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10))
    }

    private func iconFor(_ type: LogType) -> String {
        switch type {
        case .note:  "note.text"
        case .task:  "checkmark.circle"
        case .alert: "exclamationmark.triangle.fill"
        }
    }

    private func colorFor(_ type: LogType) -> Color {
        switch type {
        case .note:  .blue
        case .task:  .green
        case .alert: .red
        }
    }

    private func syncIcon(_ status: SyncStatus) -> String {
        switch status {
        case .local:      "icloud.slash"
        case .syncing:    "arrow.triangle.2.circlepath"
        case .synced:     "checkmark.icloud"
        case .conflicted: "exclamationmark.icloud"
        }
    }

    private func syncColor(_ status: SyncStatus) -> Color {
        switch status {
        case .local:      .secondary
        case .syncing:    .blue
        case .synced:     .green
        case .conflicted: .red
        }
    }

    private func statusColor(_ status: LogStatus?) -> Color {
        switch status {
        case .open:       .orange
        case .inProgress: .blue
        case .done:       .green
        case nil:         .secondary
        }
    }
}

#Preview {
    OpsLogView()
        .modelContainer(for: OpsLogEntry.self, inMemory: true)
        .environment(AuthManager.shared)
}
