import SwiftUI
import SwiftData

struct MissionView: View {
    @Query(sort: \CampSite.day) private var camps: [CampSite]
    @Query(sort: \TrailPoint.index) private var trailPoints: [TrailPoint]
    @Query private var waterSources: [WaterSource]
    @Environment(AuthManager.self) private var auth
    @Environment(\.modelContext) private var modelContext

    @State private var missionBriefing: String?
    @State private var isGenerating = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Hero
                    headerSection

                    // AI Mission Briefing
                    if let briefing = missionBriefing {
                        aiBriefingBanner(briefing)
                    }

                    // Trip stats
                    statsGrid

                    // Team
                    teamSection
                }
                .padding()
            }
            .navigationTitle("DDG Mission Control")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            Task { await generateBriefing() }
                        } label: {
                            Label(
                                isGenerating ? "Generating..." : "Mission Briefing",
                                systemImage: "sparkles"
                            )
                        }
                        .disabled(camps.isEmpty || isGenerating)

                        if let user = auth.currentUser {
                            Section {
                                Label("\(user.emoji) \(user.name)", systemImage: "person.fill")
                                Label(auth.userEmail ?? "", systemImage: "envelope")
                            }
                        }

                        Button(role: .destructive) {
                            auth.signOut()
                        } label: {
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } label: {
                        Image(systemName: "person.circle")
                    }
                }
            }
        }
    }

    // MARK: - AI Briefing

    private func aiBriefingBanner(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(.purple)
                Text("Mission Briefing")
                    .font(.caption.bold())
                Spacer()
                Button {
                    missionBriefing = nil
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
    }

    private func generateBriefing() async {
        isGenerating = true
        defer { isGenerating = false }

        do {
            missionBriefing = try await OnDeviceLLM.shared.tripBriefing(
                camps: camps,
                trailPointCount: trailPoints.count,
                waterSources: waterSources,
                team: DDGTeam.roster
            )
        } catch {
            missionBriefing = "Could not generate briefing: \(error.localizedDescription)"
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Burney Falls → Castle Crags")
                .font(.title2.bold())
            Text("PCT Section O · 6-Day Thru-Hike")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Stats Grid

    private var totalMiles: Double {
        camps.last?.routeMile ?? 0
    }

    private var totalDays: Int {
        (camps.map(\.day).max() ?? 0) + 1
    }

    private var totalElevationGain: Double {
        guard trailPoints.count > 1 else { return 0 }
        var gain: Double = 0
        for i in 1..<trailPoints.count {
            let diff = trailPoints[i].elevationFeet - trailPoints[i-1].elevationFeet
            if diff > TrailConstants.elevationThreshold { gain += diff }
        }
        return gain
    }

    private var totalElevationLoss: Double {
        guard trailPoints.count > 1 else { return 0 }
        var loss: Double = 0
        for i in 1..<trailPoints.count {
            let diff = trailPoints[i-1].elevationFeet - trailPoints[i].elevationFeet
            if diff > TrailConstants.elevationThreshold { loss += diff }
        }
        return loss
    }

    private var statsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatCard(title: "Total Miles", value: String(format: "%.1f", totalMiles), icon: "figure.hiking")
            StatCard(title: "Days", value: "\(totalDays)", icon: "calendar")
            StatCard(title: "Elevation Gain", value: String(format: "%.0f ft", totalElevationGain), icon: "arrow.up.right")
            StatCard(title: "Elevation Loss", value: String(format: "%.0f ft", totalElevationLoss), icon: "arrow.down.right")
            StatCard(title: "Est. Time", value: String(format: "%.0f hr", TrailConstants.estimatedTime(miles: totalMiles, gainFeet: totalElevationGain)), icon: "clock")
            StatCard(title: "Water Sources", value: "\(waterSources.count)", icon: "drop.fill")
            StatCard(title: "Camps", value: "\(camps.count)", icon: "tent.fill")
            StatCard(title: "Trail Points", value: "\(trailPoints.count)", icon: "point.topleft.down.to.point.bottomright.curvepath")
        }
    }

    // MARK: - Team

    private var teamSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("The DDG Team")
                .font(.headline)

            ForEach(DDGTeam.roster) { member in
                HStack(spacing: 12) {
                    Text(member.emoji)
                        .font(.title)
                    VStack(alignment: .leading) {
                        Text(member.name)
                            .font(.body.bold())
                        Text(member.role)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color(hex: member.color).opacity(0.12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .strokeBorder(Color(hex: member.color).opacity(0.3), lineWidth: 1)
                        )
                )
            }

            // Day color legend
            dayColorLegend
        }
    }

    private var dayColorLegend: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Day Colors")
                .font(.caption.bold())
                .foregroundStyle(.secondary)
            HStack(spacing: 6) {
                ForEach(Array(dayColors.enumerated()), id: \.offset) { idx, dc in
                    VStack(spacing: 2) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color(hex: dc.stroke).opacity(0.3))
                            .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Color(hex: dc.stroke), lineWidth: 1))
                            .frame(width: 36, height: 24)
                        Text("D\(idx + 1)")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.tint)
            Text(value)
                .font(.title.bold())
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    MissionView()
        .modelContainer(for: [CampSite.self, TrailPoint.self, WaterSource.self], inMemory: true)
        .environment(AuthManager.shared)
}
