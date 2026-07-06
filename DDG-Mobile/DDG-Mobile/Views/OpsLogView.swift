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
            ZStack {
                Color.black.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // AI Summary banner
                    if let summary = summaryText {
                        summaryBanner(summary)
                    }

                    // Filter bar
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            FilterChip(label: "ALL", isActive: filterType == nil) { filterType = nil }
                            ForEach(LogType.allCases, id: \.self) { type in
                                FilterChip(label: type.rawValue.uppercased(), isActive: filterType == type) {
                                    filterType = filterType == type ? nil : type
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical, 8)
                    .background(Color(white: 0.05))

                    // Log entries
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            ForEach(filteredEntries) { entry in
                                LogEntryCard(entry: entry)
                            }
                        }
                        .padding()
                    }

                    if filteredEntries.isEmpty {
                        Spacer()
                        ContentUnavailableView(
                            "AWAITING TELEMETRY",
                            systemImage: "terminal",
                            description: Text("Terminal is empty. Start logging tasks, notes, and alerts.")
                        )
                        .foregroundStyle(.green)
                        .environment(\.colorScheme, .dark)
                        Spacer()
                    }

                    // Input bar
                    inputBar
                }
            }
            .navigationTitle("Ops Telemetry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            Task { await summarizeToday() }
                        } label: {
                            Label(
                                isSummarizing ? "Processing..." : "Generate Intel",
                                systemImage: "sparkles"
                            )
                        }
                        .disabled(todayEntries.isEmpty || isSummarizing)

                        Button {
                            Task { await SyncEngine.shared.syncPendingChanges(modelContext: modelContext) }
                        } label: {
                            Label("Force Uplink", systemImage: "antenna.radiowaves.left.and.right")
                        }
                    } label: {
                        Image(systemName: "terminal.fill")
                            .foregroundStyle(.green)
                    }
                }
            }
        }
    }

    // MARK: - AI Summary Banner

    private func summaryBanner(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("> SYSTEM INTEL GENERATED")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(.purple)
                Spacer()
                Button {
                    summaryText = nil
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            Text(text)
                .font(.system(size: 13, design: .monospaced))
                .foregroundStyle(.white)
        }
        .padding()
        .background(Color.purple.opacity(0.1))
        .border(Color.purple.opacity(0.5), width: 1)
        .padding()
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
            summaryText = "ERROR: \(error.localizedDescription)"
        }
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: 12) {
            Text(">")
                .font(.system(.title3, design: .monospaced))
                .foregroundStyle(.green)
            
            TextField("Enter command, /task, or log...", text: $newMessage)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(.green)
                .tint(.green)

            Button {
                sendMessage()
            } label: {
                Image(systemName: "return")
                    .font(.title3.bold())
                    .foregroundStyle(.black)
                    .padding(8)
                    .background(.green, in: RoundedRectangle(cornerRadius: 6))
            }
            .disabled(newMessage.trimmingCharacters(in: .whitespaces).isEmpty)
            .opacity(newMessage.trimmingCharacters(in: .whitespaces).isEmpty ? 0.5 : 1.0)
        }
        .padding()
        .background(Color(white: 0.08))
        .border(Color(white: 0.2), width: 1)
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
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isActive ? Color.green.opacity(0.2) : Color.clear)
                .foregroundStyle(isActive ? Color.green : Color.gray)
                .border(isActive ? Color.green : Color.gray, width: 1)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Log Entry Card

struct LogEntryCard: View {
    let entry: OpsLogEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text("[\(entry.createdAt.formatted(date: .omitted, time: .standard))]")
                    .foregroundStyle(.secondary)
                
                Text(entry.userName.uppercased())
                    .foregroundStyle(.cyan)
                
                Text(entry.type.rawValue.uppercased())
                    .foregroundStyle(colorFor(entry.type))
                
                Spacer()
                
                // Sync status
                Text("[\(syncText(entry.syncStatus))]")
                    .foregroundStyle(syncColor(entry.syncStatus))
            }
            .font(.system(size: 11, weight: .bold, design: .monospaced))
            
            HStack(alignment: .top) {
                Text(">")
                    .foregroundStyle(colorFor(entry.type))
                Text(entry.content)
                    .foregroundStyle(contentColorFor(entry.type))
            }
            .font(.system(size: 14, design: .monospaced))
            
            if entry.type == .task {
                Button {
                    entry.cycleStatus()
                } label: {
                    Text("STATUS: \(entry.status?.rawValue.uppercased() ?? "UNKNOWN")")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundStyle(statusColor(entry.status))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(statusColor(entry.status).opacity(0.15))
                        .border(statusColor(entry.status), width: 1)
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
        }
        .padding(12)
        .background(Color(white: 0.08))
        .border(Color(white: 0.15), width: 1)
    }

    private func colorFor(_ type: LogType) -> Color {
        switch type {
        case .note:  return .blue
        case .task:  return .green
        case .alert: return .red
        }
    }
    
    private func contentColorFor(_ type: LogType) -> Color {
        switch type {
        case .note:  return .white
        case .task:  return .green
        case .alert: return .red
        }
    }

    private func syncText(_ status: SyncStatus) -> String {
        switch status {
        case .local:      return "LOCAL"
        case .syncing:    return "UPLINK"
        case .synced:     return "SYNCED"
        case .conflicted: return "CONFLICT"
        }
    }

    private func syncColor(_ status: SyncStatus) -> Color {
        switch status {
        case .local:      return .gray
        case .syncing:    return .blue
        case .synced:     return .green
        case .conflicted: return .red
        }
    }

    private func statusColor(_ status: LogStatus?) -> Color {
        switch status {
        case .open:       return .orange
        case .inProgress: return .blue
        case .done:       return .green
        case nil:         return .gray
        }
    }
}

#Preview {
    OpsLogView()
        .modelContainer(for: OpsLogEntry.self, inMemory: true)
        .environment(AuthManager.shared)
}
