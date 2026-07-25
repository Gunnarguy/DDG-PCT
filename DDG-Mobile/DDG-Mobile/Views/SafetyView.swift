import SwiftUI
import SwiftData

struct SafetyView: View {
    @Query private var waterSources: [WaterSource]
    @State private var commsBriefing: String?
    @State private var isGeneratingComms = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(uiColor: .systemGroupedBackground).ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Unified daily route-condition monitor
                        NavigationLink {
                            TrailConditionsView()
                        } label: {
                            HStack {
                                Image(systemName: "flame.fill")
                                    .font(.system(size: 32))
                                    .foregroundStyle(.red)
                                    .shadow(color: .red.opacity(0.6), radius: 8)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Daily Trail Conditions")
                                        .font(.headline.bold())
                                        .foregroundStyle(.primary)
                                    Text("Water · closures · crossings · fire · smoke")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right").foregroundStyle(.secondary)
                            }
                            .padding()
                            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(.red.opacity(0.3), lineWidth: 1))
                        }
                        
                        // Altitude Zones
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Altitude Risk Zones")
                                .font(.title3.bold())
                            
                            ForEach(altitudeZones) { zone in
                                HStack(spacing: 16) {
                                    Circle()
                                        .fill(riskColor(zone.risk))
                                        .frame(width: 16, height: 16)
                                        .shadow(color: riskColor(zone.risk).opacity(0.6), radius: 5)
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack {
                                            Text(zone.name)
                                                .font(.headline)
                                            Spacer()
                                            Text("\(Int(zone.minFt))–\(Int(zone.maxFt)) ft")
                                                .font(.caption.bold())
                                                .foregroundStyle(.secondary)
                                        }
                                        Text(zone.description)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                        if zone.risk != "none" {
                                            Text(zone.mitigation)
                                                .font(.caption2.bold())
                                                .foregroundStyle(.orange)
                                        }
                                    }
                                }
                                .padding()
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        
                        // Connectivity
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("Comms & Connectivity")
                                    .font(.title3.bold())
                                Spacer()
                                Button {
                                    Task { await generateCommsBriefing() }
                                } label: {
                                    if isGeneratingComms {
                                        ProgressView().controlSize(.small)
                                    } else {
                                        Image(systemName: "sparkles")
                                            .font(.title3)
                                            .foregroundStyle(.purple)
                                    }
                                }
                                .disabled(isGeneratingComms)
                            }
                            
                            if let briefing = commsBriefing {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Image(systemName: "sparkles")
                                            .foregroundStyle(.purple)
                                        Text("Siri Comms Strategy")
                                            .font(.caption.bold())
                                            .foregroundStyle(.purple)
                                    }
                                    Text(briefing)
                                        .font(.callout)
                                }
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(LinearGradient(colors: [.purple.opacity(0.15), .blue.opacity(0.05)], startPoint: .topLeading, endPoint: .bottomTrailing))
                                )
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(.purple.opacity(0.2), lineWidth: 1))
                            }
                            
                            ForEach(connectivityZones) { zone in
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(zone.name).font(.headline)
                                    HStack(spacing: 8) {
                                        CoverageChip(carrier: "VZW", level: zone.cellCoverage.verizon)
                                        CoverageChip(carrier: "ATT", level: zone.cellCoverage.att)
                                        CoverageChip(carrier: "TMO", level: zone.cellCoverage.tmobile)
                                    }
                                    Text(zone.notes)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        
                        // Sat Devices
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Satellite Uplink").font(.title3.bold())
                            ForEach(satelliteDevices) { device in
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        Image(systemName: "antenna.radiowaves.left.and.right")
                                            .foregroundStyle(.blue)
                                        Text(device.device).font(.headline)
                                        Spacer()
                                        Text(device.cost)
                                            .font(.caption2.bold())
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(.blue.opacity(0.1), in: Capsule())
                                            .foregroundStyle(.blue)
                                    }
                                    Text(device.features.joined(separator: " · "))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Text(device.trailNotes)
                                        .font(.caption2.bold())
                                        .foregroundStyle(.orange)
                                }
                                .padding()
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        
                        // Emergency Contacts
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Emergency Protocol").font(.title3.bold())
                            VStack(spacing: 12) {
                                emergencyRow(icon: "phone.fill", color: .red, title: "911", subtitle: "When cell coverage is available")
                                emergencyRow(icon: "star.fill", color: .yellow, title: "Shasta County SAR", subtitle: "(530) 245-6540")
                                emergencyRow(icon: "cross.fill", color: .orange, title: "Poison Control", subtitle: "1-800-222-1222")
                            }
                            .padding()
                            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding()
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("Safety & Survival")
        }
    }
    
    private func emergencyRow(icon: String, color: Color, title: String, subtitle: String) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
                .frame(width: 32)
            VStack(alignment: .leading) {
                Text(title).font(.headline)
                Text(subtitle).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "arrow.up.right.circle.fill")
                .foregroundStyle(.tertiary)
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
        case "none": return .green
        case "low": return .yellow
        case "moderate": return .orange
        default: return .red
        }
    }

    private func waterColor(_ reliability: String) -> Color {
        switch reliability.lowercased() {
        case "excellent": return .blue
        case "good": return .cyan
        case "seasonal": return .orange
        case "sketchy": return .red
        default: return .gray
        }
    }
}

struct CoverageChip: View {
    let carrier: String
    let level: String

    var body: some View {
        HStack(spacing: 4) {
            Text(carrier)
                .font(.system(size: 11, weight: .bold))
            Image(systemName: iconFor(level))
                .font(.system(size: 10))
                .foregroundStyle(colorFor(level))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(colorFor(level).opacity(0.15), in: Capsule())
        .foregroundStyle(colorFor(level))
    }

    private func iconFor(_ level: String) -> String {
        switch level {
        case "excellent", "good": return "cellularbars"
        case "fair", "spotty": return "cellularbars"
        default: return "xmark"
        }
    }

    private func colorFor(_ level: String) -> Color {
        switch level {
        case "excellent", "good": return .green
        case "fair": return .yellow
        case "spotty": return .orange
        default: return .red
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
        ZStack {
            Color(uiColor: .systemGroupedBackground).ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 20) {
                    // AI Safety Briefing
                    if let briefing = safetyBriefing {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "sparkles")
                                    .foregroundStyle(.purple)
                                Text("Siri Safety Analysis")
                                    .font(.caption.bold())
                                    .foregroundStyle(.purple)
                            }
                            Text(briefing)
                                .font(.callout)
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(LinearGradient(colors: [.purple.opacity(0.15), .red.opacity(0.05)], startPoint: .topLeading, endPoint: .bottomTrailing))
                        )
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.purple.opacity(0.2), lineWidth: 1))
                    }
                    
                    // Active Fires
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Active Fire Threats").font(.title3.bold())
                        if fires.isEmpty && !isLoading {
                            HStack {
                                Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                                Text("No active fires in Section O corridor")
                                    .font(.subheadline.bold())
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(.green.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
                        } else {
                            ForEach(fires, id: \.name) { fire in
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Image(systemName: "flame.fill").foregroundStyle(.red)
                                        Text(fire.name).font(.headline)
                                    }
                                    HStack(spacing: 16) {
                                        Label("\(fire.acres) acres", systemImage: "rectangle.dashed")
                                        Label("\(fire.containment)%", systemImage: "circle.circle")
                                    }
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)
                                    if let discovered = fire.discovered {
                                        Text("Discovered \(discovered, style: .relative) ago")
                                            .font(.caption2)
                                            .foregroundStyle(.tertiary)
                                    }
                                }
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                            }
                        }
                    }
                    
                    // AQI
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Air Quality Index").font(.title3.bold())
                        if aqiReadings.isEmpty && !isLoading {
                            Text("No AQI data available")
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(aqiReadings, id: \.location) { reading in
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(reading.location).font(.headline)
                                        if let category = reading.category {
                                            Text(category).font(.caption).foregroundStyle(.secondary)
                                        }
                                    }
                                    Spacer()
                                    if let aqi = reading.aqi {
                                        Text("\(aqi)")
                                            .font(.title.bold())
                                            .foregroundStyle(aqiColor(aqi))
                                    } else {
                                        Text("--").font(.title).foregroundStyle(.secondary)
                                    }
                                }
                                .padding()
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                            }
                        }
                    }
                    
                    if let refresh = lastRefresh {
                        Text("Last updated: \(refresh.formatted(date: .omitted, time: .shortened))")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .padding(.top)
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Threat Monitor")
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
                VStack {
                    ProgressView()
                    Text("Scanning satellite imagery...").font(.caption).foregroundStyle(.secondary)
                }
                .padding()
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func refreshData() async {
        isLoading = true
        defer { isLoading = false }

        fires = await WildfireService.shared.fetchWildfiresWithCache(modelContext: modelContext)

        let epaKey = SupabaseManager.shared.config.epaApiKey
        if !epaKey.isEmpty {
            aqiReadings = await WildfireService.shared.fetchAQIWithCache(
                modelContext: modelContext, apiKey: epaKey
            )
        }

        lastRefresh = .now

        do {
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
        case 0...50:    return .green
        case 51...100:  return .yellow
        case 101...150: return .orange
        case 151...200: return .red
        case 201...300: return .purple
        default:        return .brown
        }
    }
}

#Preview {
    SafetyView()
        .modelContainer(for: [WildfireCache.self, AirQualityCache.self, WaterSource.self], inMemory: true)
}
