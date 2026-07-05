//
//  DDG_MobileApp.swift
//  DDG-Mobile
//
//  Created by Gunnar Hostetler on 3/21/26.
//

import SwiftUI
import SwiftData
import AuthenticationServices

@main
struct DDG_MobileApp: App {
    let modelContainer: ModelContainer

    init() {
        let schema = Schema([
            OpsLogEntry.self,
            GearLoadout.self,
            CustomItem.self,
            TrailPoint.self,
            CampSite.self,
            WaterSource.self,
            WildfireCache.self,
            AirQualityCache.self,
        ])
        let config = ModelConfiguration(isStoredInMemoryOnly: false)
        modelContainer = try! ModelContainer(for: schema, configurations: config)

        // Initialize Supabase config
        SupabaseManager.shared.config.url = Secrets.supabaseURL
        SupabaseManager.shared.config.anonKey = Secrets.supabaseAnonKey
        SupabaseManager.shared.config.epaApiKey = Secrets.epaApiKey

        // Wire up network reconnection → sync
        NetworkMonitor.shared.onReconnect = { [modelContainer] in
            Task {
                await SyncEngine.shared.syncPendingChanges(
                    modelContext: modelContainer.mainContext
                )
                await SyncEngine.shared.pullRemoteChanges(
                    modelContext: modelContainer.mainContext
                )
            }
        }

        // Register background tasks
        BackgroundTaskManager.shared.register(modelContainer: modelContainer)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .task {
                    await ingestBundledDataIfNeeded()
                    // Schedule background tasks on first launch
                    BackgroundTaskManager.shared.scheduleSyncTask()
                    BackgroundTaskManager.shared.scheduleKeepAliveTask()
                }
                .environment(AuthManager.shared)
        }
        .modelContainer(modelContainer)
    }

    /// On first launch, parse hike_data.json into SwiftData
    @MainActor
    private func ingestBundledDataIfNeeded() async {
        let context = modelContainer.mainContext
        if HikeDataIngestor.needsIngest(modelContext: context) {
            do {
                try HikeDataIngestor.ingest(modelContext: context)
            } catch {
                print("Failed to ingest hike data: \(error)")
            }
        }
    }
}

// MARK: - Root View (auth gate)

struct RootView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        switch auth.authState {
        case .unknown:
            ProgressView("Checking credentials...")

        case .signedIn:
            ContentView()

        case .signedOut:
            SignInView()

        case .denied:
            AccessDeniedView()
        }
    }
}

// MARK: - Sign In View

struct SignInView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            Image(systemName: "mountain.2.fill")
                .font(.system(size: 64))
                .foregroundStyle(.tint)

            VStack(spacing: 8) {
                Text("DDG Mission Control")
                    .font(.largeTitle.bold())
                Text("PCT Section O · Burney Falls → Castle Crags")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            VStack(spacing: 12) {
                Text("Team members only")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.email]
                } onCompletion: { result in
                    auth.handleAppleSignIn(result)
                }
                .signInWithAppleButtonStyle(.whiteOutline)
                .frame(height: 50)
                .frame(maxWidth: 280)
            }

            Spacer()
        }
        .padding()
    }
}

// MARK: - Access Denied View

struct AccessDeniedView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "hand.raised.fill")
                .font(.system(size: 48))
                .foregroundStyle(.red)

            Text("Access Denied")
                .font(.title.bold())

            Text("This app is restricted to DDG team members.\nContact Gunnar if you should have access.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            Button("Try Different Account") {
                auth.signOut()
            }
            .buttonStyle(.bordered)
        }
        .padding()
    }
}
