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
            ZStack {
                Color(uiColor: .systemGroupedBackground).ignoresSafeArea()
                
                if camps.isEmpty {
                    ContentUnavailableView(
                        "No Itinerary Data",
                        systemImage: "calendar",
                        description: Text("Load hike_data.json to see the day-by-day plan")
                    )
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 0) {
                            ForEach(timelineDays) { tDay in
                                dayTimelineBlock(tDay)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Expedition Itinerary")
        }
    }

    // MARK: - Date Mapping

    private var tripStartDate: Date {
        var components = DateComponents()
        components.year = 2026
        components.month = 8
        components.day = 28
        components.hour = 6
        components.timeZone = TimeZone(identifier: "America/Los_Angeles")
        return Calendar.current.date(from: components) ?? Date()
    }

    private func dateString(for dayOffset: Int) -> String {
        let date = Calendar.current.date(byAdding: .day, value: dayOffset, to: tripStartDate) ?? tripStartDate
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        return formatter.string(from: date)
    }

    private struct TimelineDay: Identifiable {
        let id = UUID()
        let dayOffset: Int
        let title: String
        let camps: [CampSite]
        let isTravelDay: Bool
        let travelDetails: String?
        let hikeDayIndex: Int?
    }

    private var timelineDays: [TimelineDay] {
        var days: [TimelineDay] = []
        
        // Aug 28: Travel
        days.append(TimelineDay(
            dayOffset: 0,
            title: "Arrival & Assembly",
            camps: [],
            isTravelDay: true,
            travelDetails: "✈️ Dan & Drew land at SJC at 6:05 PM.\n🚙 Mikaela collects the group in the Kia Sportage and drives north.\n⚠️ A late-night Burney arrival is likely. Confirm legal after-hours campground access or reserve a sleep fallback; hiking starts only after adequate rest.",
            hikeDayIndex: nil
        ))
        
        // Aug 29 - Sept 6: nine GPS-balanced hiking days.
        let hikeGroups = Dictionary(grouping: camps, by: \.day)
        for day in 1...9 {
            let dayCamps = hikeGroups[day]?.sorted(by: { $0.routeMile < $1.routeMile }) ?? []
            days.append(TimelineDay(
                dayOffset: day,
                title: day == 9 ? "Day 9 & Extraction" : "Expedition Day \(day)",
                camps: dayCamps,
                isTravelDay: false,
                travelDetails: day == 9
                    ? "Complete the 54.2-mile route to Ash Camp, meet Mikaela at the pre-shared pin between 10:00 AM and noon, and return to the Bay Area."
                    : nil,
                hikeDayIndex: day
            ))
        }
        
        // Sept 7: Departure
        days.append(TimelineDay(
            dayOffset: 10,
            title: "Departure",
            camps: [],
            isTravelDay: true,
            travelDetails: "✈️ Dan & Drew depart SJC. Booking time is not yet confirmed: 6:40 AM or 10:40 AM. Until the reservation is checked, protect the earlier airport report time.",
            hikeDayIndex: nil
        ))
        
        return days
    }

    // MARK: - Timeline UI

    private func dayTimelineBlock(_ tDay: TimelineDay) -> some View {
        let colorIdx = max(0, (tDay.hikeDayIndex ?? 1) - 1)
        let dayColor = colorIdx < dayColors.count ? Color(hex: dayColors[colorIdx].stroke) : .blue
        
        return HStack(alignment: .top, spacing: 16) {
            // Left Timeline Line
            VStack(spacing: 0) {
                Circle()
                    .fill(tDay.isTravelDay ? .orange : dayColor)
                    .frame(width: 16, height: 16)
                    .shadow(color: (tDay.isTravelDay ? Color.orange : dayColor).opacity(0.4), radius: 6)
                    .overlay(Circle().stroke(.white, lineWidth: 2))
                    .padding(.top, 4)
                
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [tDay.isTravelDay ? .orange : dayColor, (tDay.isTravelDay ? Color.orange : dayColor).opacity(0.3)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: 3)
                    .cornerRadius(1.5)
                    .padding(.top, 4)
            }
            
            // Right Content
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(tDay.title.uppercased())
                            .font(.system(size: 13, weight: .black, design: .rounded))
                            .foregroundStyle(tDay.isTravelDay ? .orange : dayColor)
                        
                        Text(dateString(for: tDay.dayOffset))
                            .font(.title2.bold())
                    }
                    Spacer()
                    
                    if tDay.hikeDayIndex != nil {
                        Button {
                            Task { await generateDayBriefing(tDay) }
                        } label: {
                            if generatingDay == tDay.hikeDayIndex {
                                ProgressView()
                                    .controlSize(.small)
                            } else {
                                Image(systemName: "sparkles")
                                    .font(.title3)
                                    .foregroundStyle(.purple)
                                    .padding(8)
                                    .background(.ultraThinMaterial, in: Circle())
                            }
                        }
                        .disabled(generatingDay != nil)
                    }
                }
                
                // Travel Details
                if let travelDetails = tDay.travelDetails {
                    HStack(spacing: 12) {
                        Image(systemName: "airplane")
                            .foregroundStyle(.orange)
                        Text(travelDetails)
                            .font(.subheadline.bold())
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(.orange.opacity(0.3), lineWidth: 1))
                }
                
                // AI Briefing
                if let hikeIdx = tDay.hikeDayIndex, let briefing = dayBriefings[hikeIdx] {
                    aiBriefingCard(text: briefing)
                }
                
                // Altitude Warning
                if let zone = altitudeZoneForDay(tDay.camps), zone.risk != "none", !zone.symptoms.isEmpty {
                    warningCard(zone: zone)
                }
                
                // Water Sources
                let dayWater = waterSourcesForDay(tDay.camps)
                if !dayWater.isEmpty {
                    waterCard(water: dayWater)
                }
                
                // Camps
                if !tDay.camps.isEmpty {
                    VStack(spacing: 12) {
                        ForEach(tDay.camps) { camp in
                            CampRow(camp: camp, color: dayColor)
                        }
                    }
                    
                    // Footer Stats
                    DayStatsRow(camps: tDay.camps, trailPoints: trailPoints, color: dayColor)
                        .padding(.top, 8)
                }
            }
            .padding(.bottom, 40)
        }
    }

    private func aiBriefingCard(text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(.purple)
                Text("Daily Siri Briefing")
                    .font(.caption.bold())
                    .foregroundStyle(.purple)
                Spacer()
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

    private func warningCard(zone: AltitudeZone) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.orange)
                .font(.title2)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("\(zone.name) Altitude Risk")
                    .font(.caption.bold())
                    .foregroundStyle(.orange)
                Text(zone.symptoms.joined(separator: ", "))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.orange.opacity(0.3), lineWidth: 1))
    }
    
    private func waterCard(water: [WaterSource]) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "drop.fill")
                .foregroundStyle(.cyan)
                .font(.title2)
                .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Water Sources (\(water.count))")
                    .font(.caption.bold())
                    .foregroundStyle(.cyan)
                
                Text(water.map { "\($0.name)" }.joined(separator: " • "))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.cyan.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.cyan.opacity(0.3), lineWidth: 1))
    }

    // MARK: - Day Context Helpers

    private func altitudeZoneForDay(_ camps: [CampSite]) -> AltitudeZone? {
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
        let minLat = camps.map(\.latitude).min()! - 0.05
        let maxLat = camps.map(\.latitude).max()! + 0.05
        let minLon = camps.map(\.longitude).min()! - 0.05
        let maxLon = camps.map(\.longitude).max()! + 0.05

        return waterSources.filter { ws in
            ws.latitude >= minLat && ws.latitude <= maxLat &&
            ws.longitude >= minLon && ws.longitude <= maxLon
        }
    }

    private func generateDayBriefing(_ tDay: TimelineDay) async {
        guard let hikeIdx = tDay.hikeDayIndex else { return }
        generatingDay = hikeIdx
        defer { generatingDay = nil }

        do {
            dayBriefings[hikeIdx] = try await OnDeviceLLM.shared.dayBriefing(
                day: hikeIdx,
                camps: tDay.camps,
                waterSources: waterSources,
                trailPoints: trailPoints
            )
        } catch {
            dayBriefings[hikeIdx] = "Could not generate briefing."
        }
    }
}

// MARK: - Day Stats Row

private struct DayStatsRow: View {
    let camps: [CampSite]
    let trailPoints: [TrailPoint]
    let color: Color

    private var totalDistance: Double { camps.reduce(0) { $0 + $1.distance } }

    private var elevationGain: Double {
        guard let camp = camps.first else { return 0 }
        return TrailConstants.elevationGain(for: camp.day)
    }

    var body: some View {
        HStack {
            statItem(icon: "figure.hiking", value: String(format: "%.1f", totalDistance), unit: "mi")
            Spacer()
            if elevationGain > 0 {
                statItem(icon: "arrow.up.right", value: String(format: "+%.0f", elevationGain), unit: "ft")
                Spacer()
            }
            let estHours = TrailConstants.estimatedTime(miles: totalDistance, gainFeet: elevationGain)
            statItem(icon: "clock.fill", value: String(format: "%.1f", estHours), unit: "hrs")
        }
        .padding()
        .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
    }
    
    private func statItem(icon: String, value: String, unit: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .foregroundStyle(color)
                .font(.callout)
            
            Text(value)
                .font(.system(.callout, design: .rounded).bold())
            
            Text(unit)
                .font(.caption2.bold())
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Camp Row

private struct CampRow: View {
    let camp: CampSite
    let color: Color
    @State private var showFullSegment = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            header
            if !camp.segment.isEmpty {
                Text(camp.segment)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(showFullSegment ? nil : 2)
                    .onTapGesture { withAnimation { showFullSegment.toggle() } }
            }
            if !camp.notes.isEmpty {
                Text(camp.notes)
                    .font(.caption2)
                    .foregroundStyle(.orange)
            }
            Divider().padding(.vertical, 2)
            elevations
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.3), lineWidth: 1))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    private var header: some View {
        HStack {
            Image(systemName: iconFor(camp.type))
                .foregroundStyle(color)
                .font(.title3)
            
            Text(camp.name)
                .font(.headline)
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                Text(String(format: "%.1f mi", camp.distance))
                    .font(.subheadline.bold())
                Text(String(format: "Mile %.1f", camp.routeMile))
                    .font(.caption2)
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
        .font(.caption2.bold())
        .foregroundStyle(.secondary)
    }

    private func iconFor(_ type: String) -> String {
        switch type {
        case "Trailhead": return "flag.fill"
        case "Finish":    return "flag.checkered"
        default:          return "tent.fill"
        }
    }
}

#Preview {
    ItineraryView()
        .modelContainer(for: [CampSite.self, WaterSource.self, TrailPoint.self], inMemory: true)
}
