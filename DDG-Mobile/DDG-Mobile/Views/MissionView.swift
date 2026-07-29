import SwiftUI
import SwiftData

struct MissionView: View {
    @Query(sort: \CampSite.day) private var camps: [CampSite]
    @Query(sort: \TrailPoint.index) private var trailPoints: [TrailPoint]
    @Query private var waterSources: [WaterSource]
    @Environment(AuthManager.self) private var auth

    @State private var missionBriefing: String?
    @State private var isGenerating = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background Gradient
                LinearGradient(
                    colors: [Color.blue.opacity(0.2), Color.purple.opacity(0.1), Color(uiColor: .systemBackground)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Hero & Countdown
                        countdownHeader
                            .padding(.top, 10)

                        // Briefing
                        if let briefing = missionBriefing {
                            aiBriefingBanner(briefing)
                        }

                        // Team Roster
                        teamSection

                        // Trip Stats
                        Text("Mission Telemetry")
                            .font(.title3.bold())
                            .padding(.top, 10)
                        statsGrid

                        // Day Color Legend
                        dayColorLegend
                            .padding(.top, 10)
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("Mission Control")
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
                        Image(systemName: "person.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.purple)
                    }
                }
            }
        }
    }

    // MARK: - Countdown Clock

    private var tripStartDate: Date {
        var components = DateComponents()
        components.year = 2026
        components.month = 8
        components.day = 28
        components.hour = 6 // 6:00 AM start time
        components.timeZone = TimeZone(identifier: "America/Los_Angeles")
        return Calendar.current.date(from: components) ?? Date()
    }

    private var countdownHeader: some View {
        VStack(spacing: 24) {
            VStack(spacing: 4) {
                Text("PCT Section O")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.purple)
                    .tracking(2)
                
                Text("Burney Falls → Ash Camp")
                    .font(.title2.bold())
                    .multilineTextAlignment(.center)
            }

            TimelineView(.periodic(from: .now, by: 1)) { context in
                let diff = Calendar.current.dateComponents([.day, .hour, .minute, .second], from: context.date, to: tripStartDate)
                
                VStack(spacing: 12) {
                    Text("LAUNCHING IN")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                        .tracking(3)
                    
                    HStack(spacing: 12) {
                        timeBlock(value: max(0, diff.day ?? 0), unit: "DAYS")
                        timeBlock(value: max(0, diff.hour ?? 0), unit: "HRS")
                        timeBlock(value: max(0, diff.minute ?? 0), unit: "MIN")
                        timeBlock(value: max(0, diff.second ?? 0), unit: "SEC")
                    }
                }
                .padding(24)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
                .shadow(color: .black.opacity(0.1), radius: 20, y: 10)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func timeBlock(value: Int, unit: String) -> some View {
        VStack(spacing: 4) {
            Text(String(format: "%02d", value))
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)
                .contentTransition(.numericText())
            Text(unit)
                .font(.system(size: 10, weight: .black, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(width: 60)
    }

    // MARK: - AI Briefing

    private func aiBriefingBanner(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(.purple)
                Text("Siri Mission Briefing")
                    .font(.caption.bold())
                    .foregroundStyle(.purple)
                Spacer()
                Button {
                    withAnimation { missionBriefing = nil }
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
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(LinearGradient(colors: [.purple.opacity(0.15), .blue.opacity(0.05)], startPoint: .topLeading, endPoint: .bottomTrailing))
        )
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.purple.opacity(0.2), lineWidth: 1))
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

    // MARK: - Stats Grid

    private var totalMiles: Double { TrailConstants.totalMiles }
    private var totalDays: Int { TrailConstants.dayProfiles.count }
    private var totalElevationGain: Double { TrailConstants.totalGainFeet }
    private var totalElevationLoss: Double { TrailConstants.totalLossFeet }

    private var statsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
            StatCard(title: "Total Miles", value: String(format: "%.1f", totalMiles), icon: "figure.hiking", color: .blue)
            StatCard(title: "Duration", value: "\(totalDays) Days", icon: "calendar", color: .indigo)
            StatCard(title: "Elevation Gain", value: String(format: "%.0f ft", totalElevationGain), icon: "arrow.up.right", color: .green)
            StatCard(title: "Elevation Loss", value: String(format: "%.0f ft", totalElevationLoss), icon: "arrow.down.right", color: .red)
            StatCard(title: "Trail Time Range", value: TrailConstants.totalTimeEstimate.rangeLabel, icon: "clock.fill", color: .orange)
            StatCard(title: "Water Sources", value: "\(waterSources.count)", icon: "drop.fill", color: .cyan)
        }
    }

    // MARK: - Team

    private var teamSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("The DDG Team")
                .font(.title3.bold())

            VStack(spacing: 12) {
                ForEach(DDGTeam.roster) { member in
                    HStack(spacing: 16) {
                        Text(member.emoji)
                            .font(.system(size: 40))
                            .shadow(radius: 2)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(member.name)
                                .font(.headline)
                            Text(member.role)
                                .font(.caption.bold())
                                .foregroundStyle(Color(hex: member.color))
                        }
                        Spacer()
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(.green)
                    }
                    .padding()
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(Color(hex: member.color).opacity(0.3), lineWidth: 1)
                    )
                }
            }
        }
    }

    // MARK: - Day Color Legend

    private var dayColorLegend: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Route Color Legend")
                .font(.title3.bold())
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(Array(dayColors.enumerated()), id: \.offset) { idx, dc in
                        VStack(spacing: 6) {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color(hex: dc.stroke))
                                .frame(width: 44, height: 44)
                                .shadow(color: Color(hex: dc.stroke).opacity(0.3), radius: 4, y: 2)
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(.white.opacity(0.5), lineWidth: 1))
                            
                            Text("D\(idx + 1)")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(.horizontal, 4)
                .padding(.bottom, 8)
            }
        }
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(value)
                    .font(.system(.title3, design: .rounded).bold())
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.2), lineWidth: 1))
        .shadow(color: .black.opacity(0.05), radius: 10, y: 5)
    }
}

#Preview {
    MissionView()
        .modelContainer(for: [CampSite.self, TrailPoint.self, WaterSource.self], inMemory: true)
        .environment(AuthManager.shared)
}
