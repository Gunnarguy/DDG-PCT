//
//  ContentView.swift
//  DDG-Mobile
//
//  Created by Gunnar Hostetler on 3/21/26.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @State private var selectedTab = 0
    @State private var network = NetworkMonitor.shared
    @Environment(AuthManager.self) private var auth
    @Query private var allOpsEntries: [OpsLogEntry]

    private var pendingSyncCount: Int {
        allOpsEntries.filter { $0.syncStatus == .local }.count
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("Mission", systemImage: "flag.fill", value: 0) {
                MissionView()
            }
            Tab("Prep", systemImage: "checklist", value: 1) {
                PrepView()
            }
            Tab("Map", systemImage: "map.fill", value: 2) {
                MapContainerView()
            }
            Tab("Itinerary", systemImage: "calendar", value: 3) {
                ItineraryView()
            }
            Tab("Safety", systemImage: "exclamationmark.shield.fill", value: 4) {
                SafetyView()
            }
            Tab("Gear", systemImage: "backpack.fill", value: 5) {
                GearPlannerView()
            }
            Tab("Ops Log", systemImage: "list.bullet.clipboard.fill", value: 6) {
                OpsLogView()
            }
            Tab("Info", systemImage: "info.circle.fill", value: 7) {
                InfoView()
            }
        }
        .overlay(alignment: .topTrailing) {
            // Global Status Indicator (does not block touches)
            HStack(spacing: 8) {
                if let user = auth.currentUser {
                    Text(user.emoji)
                        .font(.caption)
                }
                SyncIndicator(isConnected: network.isConnected, pendingCount: pendingSyncCount)
            }
            .padding(.trailing, 16)
            .allowsHitTesting(false)
        }
    }
}

// MARK: - Sync Status Indicator

struct SyncIndicator: View {
    let isConnected: Bool
    let pendingCount: Int

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(isConnected ? .green : .red)
                .frame(width: 8, height: 8)
            Text(isConnected ? "Online" : "Offline")
                .font(.caption2)
                .foregroundStyle(.secondary)
            if pendingCount > 0 {
                Text("(\(pendingCount) pending)")
                    .font(.caption2)
                    .foregroundStyle(.orange)
            }
        }
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
