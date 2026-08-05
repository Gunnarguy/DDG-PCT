//
//  ContentView.swift
//  DDG-Mobile
//
//  Created by Gunnar Hostetler on 3/21/26.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    private enum AppTab: Hashable {
        case mission
        case plan
        case map
        case field
        case gear
    }

    @State private var selectedTab: AppTab = .mission
    @State private var network = NetworkMonitor.shared
    @State private var showPendingSync = false
    @Environment(AuthManager.self) private var auth
    @Environment(\.modelContext) private var modelContext
    @Query private var allOpsEntries: [OpsLogEntry]
    @Query private var allGearLoadouts: [GearLoadout]
    @Query private var allCustomItems: [CustomItem]

    private var pendingSyncCount: Int {
        allOpsEntries.filter { $0.syncStatus == .local }.count +
            allGearLoadouts.filter { $0.syncStatus == .local }.count +
            allCustomItems.filter { $0.syncStatus == .local }.count
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("Mission", systemImage: "flag.fill", value: AppTab.mission) {
                MissionView()
            }
            Tab("Plan", systemImage: "calendar.badge.clock", value: AppTab.plan) {
                PlanWorkspaceView()
            }
            Tab("Map", systemImage: "map.fill", value: AppTab.map) {
                MapContainerView()
            }
            Tab("Field", systemImage: "exclamationmark.shield.fill", value: AppTab.field) {
                FieldWorkspaceView()
            }
            Tab("Gear", systemImage: "backpack.fill", value: AppTab.gear) {
                GearPlannerView()
            }
        }
        .overlay(alignment: .topTrailing) {
            // Global status indicator. Only the unsynced-edits chip is
            // interactive; the rest stays hit-test transparent so it never
            // swallows taps meant for the view underneath.
            HStack(spacing: 8) {
                if let user = auth.currentUser {
                    Text(user.emoji)
                        .font(.caption)
                        .allowsHitTesting(false)
                }
                SyncIndicator(
                    isConnected: network.isConnected,
                    pendingCount: pendingSyncCount,
                    onTapPending: { showPendingSync = true }
                )
            }
            .padding(.trailing, 16)
        }
        .sheet(isPresented: $showPendingSync) {
            PendingSyncView()
        }
        .task {
            await SyncEngine.shared.pullRemoteChanges(modelContext: modelContext)
            await SyncEngine.shared.syncPendingChanges(modelContext: modelContext)
        }
    }
}

private struct PlanWorkspaceView: View {
    private enum Mode: String, CaseIterable, Identifiable {
        case itinerary = "Itinerary"
        case logistics = "Logistics"
        case preparation = "Preparation"

        var id: Self { self }
    }

    @State private var mode: Mode = .itinerary

    var body: some View {
        VStack(spacing: 0) {
            Picker("Planning view", selection: $mode) {
                ForEach(Mode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.top, 8)

            switch mode {
            case .itinerary:
                ItineraryView()
            case .logistics:
                LogisticsView()
            case .preparation:
                PrepView()
            }
        }
    }
}

private struct FieldWorkspaceView: View {
    private enum Mode: String, CaseIterable, Identifiable {
        case brief = "Brief"
        case opsLog = "Ops Log"

        var id: Self { self }
    }

    @State private var mode: Mode = .brief

    var body: some View {
        VStack(spacing: 0) {
            Picker("Field view", selection: $mode) {
                ForEach(Mode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.top, 8)

            switch mode {
            case .brief:
                SafetyView()
            case .opsLog:
                OpsLogView()
            }
        }
    }
}

// MARK: - Sync Status Indicator

struct SyncIndicator: View {
    let isConnected: Bool
    let pendingCount: Int
    var onTapPending: (() -> Void)?

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(isConnected ? .green : .red)
                .frame(width: 8, height: 8)
            Text(isConnected ? "Online" : "Offline")
                .font(.caption2)
                .foregroundStyle(.secondary)

            if pendingCount > 0 {
                Button {
                    onTapPending?()
                } label: {
                    HStack(spacing: 3) {
                        Text("\(pendingCount) unsynced")
                        Image(systemName: "chevron.right")
                            .font(.system(size: 8, weight: .semibold))
                    }
                    .font(.caption2)
                    .foregroundStyle(.orange)
                    // Padding is the tap target: the label alone is far too
                    // small to hit reliably with cold hands.
                    .padding(.horizontal, 7)
                    .padding(.vertical, 4)
                    .background(
                        Capsule().fill(.orange.opacity(0.16))
                    )
                    .overlay(
                        Capsule().stroke(.orange.opacity(0.5), lineWidth: 1)
                    )
                    .fixedSize(horizontal: false, vertical: true)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(pendingCount) unsynced edits. Open to review and retry.")
            }
        }
        // Only the button above accepts touches; the dot and label do not.
        .allowsHitTesting(pendingCount > 0)
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [
            OpsLogEntry.self,
            GearLoadout.self,
            CustomItem.self,
            TrailPoint.self,
            CampSite.self,
            WaterSource.self,
        ], inMemory: true)
        .environment(AuthManager.shared)
}
