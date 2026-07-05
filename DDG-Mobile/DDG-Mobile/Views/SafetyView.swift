import SwiftUI
import SwiftData

struct SafetyView: View {
    @Query private var waterSources: [WaterSource]
    @State private var commsBriefing: String?
    @State private var isGeneratingComms = false

    var body: some View {
        NavigationStack {
            List {
                Section("Wildfire & Air Quality") {
                    NavigationLink {
                        WildfireMonitorView()
                    } label: {
                        Label("Active Fires & AQI", systemImage: "flame.fill")
                    }
                }

                Section("Altitude Zones") {
                    ForEach(altitudeZones) { zone in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Circle()
                                    .fill(riskColor(zone.risk))
                                    .frame(width: 12, height: 12)
                                VStack(alignment: .leading) {
                                    Text(zone.name)
                                        .font(.body)
                                    Text("\(Int(zone.minFt))–\(Int(zone.maxFt)) ft · \(zone.risk) risk")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Text(zone.description)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if !zone.symptoms.isEmpty {
                                Text("Watch for: \(zone.symptoms.joined(separator: ", "))")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            if zone.risk != "none" {
                                Label(zone.mitigation, systemImage: "heart.text.clipboard")
                                    .font(.caption2)
                                    .foregroundStyle(.orange)
                            }
                        }
                    }
                }

                Section {
                    // AI Connectivity Briefing
                    if let briefing = commsBriefing {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Image(systemName: "sparkles")
                                    .foregroundStyle(.purple)
                                Text("Comms Strategy")
                                    .font(.caption.bold())
                                Spacer()
                                Button {
                                    commsBriefing = nil
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundStyle(.secondary)
                                }
                                .buttonStyle(.plain)
                            }
                            Text(briefing)
                                .font(.callout)
                        }
                    }

                    ForEach(connectivityZones) { zone in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(zone.name)
                                .font(.body.bold())
                            HStack(spacing: 12) {
                                CoverageChip(carrier: "VZW", level: zone.cellCoverage.verizon)
                                CoverageChip(carrier: "ATT", level: zone.cellCoverage.att)
                                CoverageChip(carrier: "TMO", level: zone.cellCoverage.tmobile)
                            }
                            Text(zone.notes)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                } header: {
                    HStack {
                        Text("Connectivity")
                        Spacer()
                        Button {
                            Task { await generateCommsBriefing() }
                        } label: {
                            if isGeneratingComms {
                                ProgressView()
                                    .controlSize(.mini)
                            } else {
                                Image(systemName: "sparkles")
                                    .font(.caption)
                            }
                        }
                        .disabled(isGeneratingComms)
                    }
                }

                Section("Water Sources") {
                    if waterSources.isEmpty {
                        Text("No water source data loaded")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(waterSources) { source in
                            VStack(alignment: .leading, spacing: 2) {
                                HStack {
                                    Image(systemName: "drop.fill")
                                        .foregroundStyle(waterColor(source.reliability))
                                    Text(source.name)
                                        .font(.body)
                                    Spacer()
                                    Text(source.reliability)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                if let notes = source.notes, !notes.isEmpty {
                                    Text(notes)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                Section("Satellite Devices") {
                    ForEach(satelliteDevices) { device in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(device.device)
                                .font(.body.bold())
                            Text(device.features.joined(separator: " · "))
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Text(device.coverage)
                                .font(.caption2)
                                .foregroundStyle(.secondary)

                            Text(device.compatibility)
                                .font(.caption2)
                                .foregroundStyle(.tertiary)

                            Text(device.trailNotes)
                                .font(.caption)
                                .foregroundStyle(.orange)
                            HStack {
                                Text(device.cost)
                                    .font(.caption2)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(.quaternary, in: Capsule())
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }

                Section("Emergency Contacts") {
                    Label("911 (when cell available)", systemImage: "phone.fill")
                    Label("Shasta County SAR: (530) 245-6540", systemImage: "person.badge.shield.checkmark.fill")
                    Label("Poison Control: 1-800-222-1222", systemImage: "cross.fill")
                }
            }
            .navigationTitle("Safety")
        }
    }

    private func generateCommsBriefing() async {
        isGeneratingComms = true
        defer { isGeneratingComms = false }

        do {
            commsBriefing = try await OnDeviceLLM.shared.connectivityBriefing()
        } catch {
            commsBriefing = "Could not generate comms briefing."
        }
    }

    private func riskColor(_ risk: String) -> Color {
        switch risk {
        case "none":     .green
        case "low":      .yellow
        case "moderate": .orange
        default:         .red
        }
    }

    private func waterColor(_ reliability: String) -> Color {
        switch reliability.lowercased() {
        case "excellent": .blue
        case "good":      .cyan
        case "seasonal":  .orange
        case "sketchy":   .red
        default:          .gray
        }
    }
}

struct CoverageChip: View {
    let carrier: String
    let level: String

    var body: some View {
        HStack(spacing: 3) {
            Text(carrier)
                .font(.system(size: 10, weight: .bold))
            Image(systemName: iconFor(level))
                .font(.system(size: 9))
                .foregroundStyle(colorFor(level))
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(.quaternary, in: Capsule())
    }

    private func iconFor(_ level: String) -> String {
        switch level {
        case "excellent": "cellularbars"
        case "good":      "cellularbars"
        case "fair":      "cellularbars"
        case "spotty":    "cellularbars"
        default:          "xmark"
        }
    }

    private func colorFor(_ level: String) -> Color {
        switch level {
        case "excellent": .green
        case "good":      .green
        case "fair":      .yellow
        case "spotty":    .orange
        default:          .red
        }
    }
}

// MARK: - Wildfire Monitor (live data)

struct WildfireMonitorView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var waterSources: [WaterSource]
    @State private var fires: [WildfireService.WildfireInfo] = []
    @State private var aqiReadings: [WildfireService.AQIReading] = []
    @State private var isLoading = false
    @State private var lastRefresh: Date?
    @State private var safetyBriefing: String?
    @State private var network = NetworkMonitor.shared

    var body: some View {
        List {
            // AI Safety Briefing
            if let briefing = safetyBriefing {
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: "sparkles")
                                .foregroundStyle(.purple)
                            Text("AI Safety Briefing")
                                .font(.caption.bold())
                        }
                        Text(briefing)
                            .font(.callout)
                    }
                }
            }

            // Active Fires
            Section("Active Fires") {
                if fires.isEmpty && !isLoading {
                    Label("No active fires in Section O corridor", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                } else {
                    ForEach(fires, id: \.name) { fire in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Image(systemName: "flame.fill")
                                    .foregroundStyle(.red)
                                Text(fire.name)
                                    .font(.body.bold())
                            }
                            HStack(spacing: 16) {
                                Label("\(fire.acres) acres", systemImage: "rectangle.dashed")
                                Label("\(fire.containment)%", systemImage: "circle.circle")
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            if let discovered = fire.discovered {
                                Text("Discovered \(discovered, style: .relative) ago")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
            }

            // Air Quality
            Section("Air Quality Index") {
                ForEach(aqiReadings, id: \.location) { reading in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(reading.location)
                                .font(.body)
                            if let category = reading.category {
                                Text(category)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        if let aqi = reading.aqi {
                            Text("\(aqi)")
                                .font(.title2.bold())
                                .foregroundStyle(aqiColor(aqi))
                        } else {
                            Text("--")
                                .font(.title2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                if aqiReadings.isEmpty && !isLoading {
                    Text("No AQI data available")
                        .foregroundStyle(.secondary)
                }
            }

            // Cache info
            if let refresh = lastRefresh {
                Section {
                    HStack {
                        Text("Last updated")
                        Spacer()
                        Text(refresh, style: .relative)
                            .foregroundStyle(.secondary)
                    }
                    .font(.caption)
                }
            }
        }
        .navigationTitle("Active Fires & AQI")
        .refreshable {
            await refreshData()
        }
        .task {
            if fires.isEmpty {
                await refreshData()
            }
        }
        .overlay {
            if isLoading && fires.isEmpty {
                ProgressView("Loading conditions...")
            }
        }
    }

    private func refreshData() async {
        isLoading = true
        defer { isLoading = false }

        fires = await WildfireService.shared.fetchWildfiresWithCache(modelContext: modelContext)

        let epaKey = await SupabaseManager.shared.config.epaApiKey
        if !epaKey.isEmpty {
            aqiReadings = await WildfireService.shared.fetchAQIWithCache(
                modelContext: modelContext, apiKey: epaKey
            )
        }

        lastRefresh = .now

        // Generate AI briefing with full context
        do {
            // Determine current altitude zone (default to moderate for Section O)
            let currentZone = altitudeZones.first { $0.id == "moderate" }

            safetyBriefing = try await OnDeviceLLM.shared.safetyBriefing(
                fires: fires.map { ($0.name, $0.acres, $0.containment) },
                aqi: aqiReadings.map { ($0.location, $0.aqi, $0.category, nil as Int?) },
                waterSources: waterSources.map { ($0.name, $0.reliability, $0.notes) },
                currentAltitudeZone: currentZone,
                connectivityGaps: Array(connectivityZones)
            )
        } catch {
            safetyBriefing = nil
        }
    }

    private func aqiColor(_ aqi: Int) -> Color {
        switch aqi {
        case 0...50:    .green
        case 51...100:  .yellow
        case 101...150: .orange
        case 151...200: .red
        case 201...300: .purple
        default:        .brown
        }
    }
}

#Preview {
    SafetyView()
        .modelContainer(for: [WildfireCache.self, AirQualityCache.self, WaterSource.self], inMemory: true)
}
