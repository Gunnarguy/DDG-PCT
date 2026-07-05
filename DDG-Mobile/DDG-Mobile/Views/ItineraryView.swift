import SwiftUI
import SwiftData

struct ItineraryView: View {
    @Query(sort: \CampSite.day) private var camps: [CampSite]
    @Query private var waterSources: [WaterSource]
    @Query(sort: \TrailPoint.index) private var trailPoints: [TrailPoint]

    @State private var dayBriefings: [Int: String] = [:]
    @State private var generatingDay: Int?

    var body: some View {
        NavigationStack {
            Group {
                if camps.isEmpty {
                    ContentUnavailableView(
                        "No Itinerary Data",
                        systemImage: "calendar",
                        description: Text("Load hike_data.json to see the day-by-day plan")
                    )
                } else {
                    itineraryList
                }
            }
            .navigationTitle("Itinerary")
        }
    }

    private var itineraryList: some View {
        List {
            ForEach(groupedByDay, id: \.day) { dayGroup in
                Section {
                    // AI day briefing
                    if let briefing = dayBriefings[dayGroup.day] {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Image(systemName: "sparkles")
                                    .foregroundStyle(.purple)
                                Text("Day Briefing")
                                    .font(.caption.bold())
                                Spacer()
                                Button {
                                    dayBriefings[dayGroup.day] = nil
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundStyle(.secondary)
                                }
                                .buttonStyle(.plain)
                            }
                            Text(briefing)
                                .font(.callout)
                        }
                        .padding(.vertical, 4)
                    }

                    // Altitude zone warning if entering high altitude
                    if let zone = altitudeZoneForDay(dayGroup.camps), zone.risk != "none", !zone.symptoms.isEmpty {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(.orange)
                                .font(.caption)
                            Text("\(zone.name): \(zone.symptoms.joined(separator: ", "))")
                                .font(.caption2)
                                .foregroundStyle(.orange)
                        }
                        .padding(.vertical, 2)
                    }

                    // Water sources for this day
                    let dayWater = waterSourcesForDay(dayGroup.camps)
                    if !dayWater.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "drop.fill")
                                .foregroundStyle(.blue)
                                .font(.caption)
                            Text(dayWater.map { "\($0.name) (\($0.reliability))" }.joined(separator: ", "))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 2)
                    }

                    ForEach(dayGroup.camps) { camp in
                        CampRow(camp: camp)
                    }

                    // Day stats footer
                    DayStatsRow(camps: dayGroup.camps, trailPoints: trailPoints)
                } header: {
                    HStack(spacing: 6) {
                        // Day color bar
                        if dayGroup.day < dayColors.count {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color(hex: dayColors[dayGroup.day].stroke))
                                .frame(width: 4, height: 16)
                        }
                        Text("Day \(dayGroup.day + 1)")
                        Spacer()
                        Button {
                            Task { await generateDayBriefing(dayGroup) }
                        } label: {
                            if generatingDay == dayGroup.day {
                                ProgressView()
                                    .controlSize(.mini)
                            } else {
                                Image(systemName: "sparkles")
                                    .font(.caption)
                            }
                        }
                        .disabled(generatingDay != nil)
                    }
                }
            }
        }
    }

    // MARK: - Day Context Helpers

    private func altitudeZoneForDay(_ camps: [CampSite]) -> AltitudeZone? {
        // Find highest elevation camp for this day and match to zone
        let maxElev = camps.compactMap { camp -> Double? in
            Double(camp.endElevation.replacingOccurrences(of: ",", with: "")
                .replacingOccurrences(of: "'", with: "")
                .replacingOccurrences(of: " ft", with: "")
                .components(separatedBy: .letters).joined())
        }.max() ?? 0
        return altitudeZones.first { maxElev >= $0.minFt && maxElev < $0.maxFt }
    }

    private func waterSourcesForDay(_ camps: [CampSite]) -> [WaterSource] {
        guard !camps.isEmpty else { return [] }
        // Use lat/lon bounding box as rough proximity filter
        let minLat = camps.map(\.latitude).min()! - 0.05
        let maxLat = camps.map(\.latitude).max()! + 0.05
        let minLon = camps.map(\.longitude).min()! - 0.05
        let maxLon = camps.map(\.longitude).max()! + 0.05

        return waterSources.filter { ws in
            ws.latitude >= minLat && ws.latitude <= maxLat &&
            ws.longitude >= minLon && ws.longitude <= maxLon
        }
    }

    private func generateDayBriefing(_ dayGroup: DayGroup) async {
        generatingDay = dayGroup.day
        defer { generatingDay = nil }

        do {
            dayBriefings[dayGroup.day] = try await OnDeviceLLM.shared.dayBriefing(
                day: dayGroup.day,
                camps: dayGroup.camps,
                waterSources: waterSources,
                trailPoints: trailPoints
            )
        } catch {
            dayBriefings[dayGroup.day] = "Could not generate briefing."
        }
    }

    private struct DayGroup {
        let day: Int
        let camps: [CampSite]
    }

    private var groupedByDay: [DayGroup] {
        Dictionary(grouping: camps, by: \.day)
            .sorted { $0.key < $1.key }
            .map { DayGroup(day: $0.key, camps: $0.value) }
    }
}

// MARK: - Day Stats Row

private struct DayStatsRow: View {
    let camps: [CampSite]
    let trailPoints: [TrailPoint]

    private var totalDistance: Double {
        camps.reduce(0) { $0 + $1.distance }
    }

    private var elevationGain: Double {
        guard trailPoints.count > 1 else { return 0 }
        var gain: Double = 0
        for i in 1..<trailPoints.count {
            let diff = trailPoints[i].elevationFeet - trailPoints[i-1].elevationFeet
            if diff > TrailConstants.elevationThreshold { gain += diff }
        }
        return gain
    }

    var body: some View {
        HStack(spacing: 12) {
            Label(String(format: "%.1f mi", totalDistance), systemImage: "figure.hiking")
            if elevationGain > 0 {
                Label(String(format: "+%.0f ft", elevationGain), systemImage: "arrow.up.right")
            }
            Spacer()
            let estHours = TrailConstants.estimatedTime(miles: totalDistance, gainFeet: elevationGain)
            Label(String(format: "~%.0fh", estHours), systemImage: "clock")
        }
        .font(.caption)
        .foregroundStyle(.secondary)
    }
}

// MARK: - Camp Row

private struct CampRow: View {
    let camp: CampSite
    @State private var showFullSegment = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            header
            if !camp.segment.isEmpty {
                Text(camp.segment)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(showFullSegment ? nil : 3)
                    .onTapGesture { showFullSegment.toggle() }
            }
            if !camp.notes.isEmpty {
                Text(camp.notes)
                    .font(.caption2)
                    .foregroundStyle(.orange)
            }
            elevations
        }
        .padding(.vertical, 4)
    }

    private var header: some View {
        HStack {
            Image(systemName: iconFor(camp.type))
                .foregroundStyle(.tint)
            Text(camp.name)
                .font(.body.bold())
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(String(format: "%.1f mi", camp.distance))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(String(format: "mi %.1f", camp.routeMile))
                    .font(.system(size: 9))
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private var elevations: some View {
        HStack {
            Label(camp.startElevation, systemImage: "arrow.up.right")
            Spacer()
            Label(camp.endElevation, systemImage: "arrow.down.right")
        }
        .font(.caption2)
        .foregroundStyle(.secondary)
    }

    private func iconFor(_ type: String) -> String {
        switch type {
        case "Trailhead": "flag.fill"
        case "Finish":    "flag.checkered"
        default:          "tent.fill"
        }
    }
}

#Preview {
    ItineraryView()
        .modelContainer(for: [CampSite.self, WaterSource.self, TrailPoint.self], inMemory: true)
}
