import SwiftUI
import SwiftData

struct ItineraryView: View {
    @Query(sort: \CampSite.day) private var camps: [CampSite]
    @Query private var waterSources: [WaterSource]
    @Query(sort: \TrailPoint.index) private var trailPoints: [TrailPoint]

    private let operations = TripOperations.bundled
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
                        VStack(alignment: .leading, spacing: 16) {
                            TerrainOverviewCard()

                            ForEach(timelineDays) { tDay in
                                dayTimelineBlock(tDay)
                            }

                            ComparableHikerContextView()
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
        calendarDate(from: operations.tripDates.arrival)
    }

    private var departureOffset: Int {
        Calendar.current.dateComponents(
            [.day],
            from: tripStartDate,
            to: calendarDate(from: operations.tripDates.departure)
        ).day ?? 10
    }

    private var inboundTravelDetails: String {
        let flight = operations.workingFlights.inbound
        return "✈️ \(flight.flightNumber) · \(flight.origin) → \(flight.destination)\nScheduled arrival: \(flight.scheduledArrivalLocal).\n🚙 \(operations.arrivalPlan.driver) drives the \(operations.arrivalPlan.vehicle).\n🛏️ \(operations.arrivalPlan.instruction)\n⚠️ \(operations.workingFlights.disclaimer)"
    }

    private var finishTravelDetails: String {
        let route = operations.canonicalRoute
        let finish = operations.finishPlan
        return "Complete the \(String(format: "%.3f", route.officialPctaMiles))-mile route to \(route.finish.name).\n🚙 \(finish.driver) pickup window: \(finish.pickupWindow).\n🛣️ \(finish.road)\nSep 6 remains the contingency day."
    }

    private var outboundTravelDetails: String {
        let flight = operations.workingFlights.outbound
        return "✈️ \(flight.flightNumber) · \(flight.origin) → \(flight.destination)\nScheduled departure: \(flight.scheduledDepartureLocal). Arrival: \(flight.scheduledArrivalLocal).\n⚠️ \(operations.workingFlights.disclaimer)"
    }

    private func calendarDate(from isoDate: String) -> Date {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "America/Los_Angeles")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: isoDate) ?? Date()
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
            travelDetails: inboundTravelDetails,
            hikeDayIndex: nil
        ))
        
        // Aug 29 - Sept 5: eight canonical hiking days. Sept 6 remains contingency.
        let hikeGroups = Dictionary(grouping: camps, by: \.day)
        for day in 1...8 {
            let dayCamps = hikeGroups[day]?.sorted(by: { $0.routeMile < $1.routeMile }) ?? []
            days.append(TimelineDay(
                dayOffset: day,
                title: day == 8 ? "Day 8 & Extraction" : "Expedition Day \(day)",
                camps: dayCamps,
                isTravelDay: false,
                travelDetails: day == 8
                    ? finishTravelDetails
                    : nil,
                hikeDayIndex: day
            ))
        }
        
        // Sept 7: Departure
        days.append(TimelineDay(
            dayOffset: departureOffset,
            title: "Departure",
            camps: [],
            isTravelDay: true,
            travelDetails: outboundTravelDetails,
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
                let dayWater = tDay.hikeDayIndex.map { waterSourcesForDay($0) } ?? []
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
                    DayStatsRow(day: tDay.hikeDayIndex ?? 0, camps: tDay.camps, color: dayColor)
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
                Text("Offline water location markers (\(water.count))")
                    .font(.caption.bold())
                    .foregroundStyle(.cyan)
                
                Text(water.map { "\($0.name)" }.joined(separator: " • "))
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Text("Map locations only. Verify current flow, access, and treatment need in Field → Daily Conditions before moving.")
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

    private func waterSourcesForDay(_ day: Int) -> [WaterSource] {
        guard let profile = TrailConstants.profile(for: day) else { return [] }
        return waterSources.filter { source in
            source.routeMile > profile.routeMileStart &&
            source.routeMile <= profile.routeMileEnd
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
    let day: Int
    let camps: [CampSite]
    let color: Color

    private var profile: TrailDayProfile? { TrailConstants.profile(for: day) }
    private var totalDistance: Double { profile?.miles ?? camps.reduce(0) { $0 + $1.distance } }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            LazyVGrid(columns: [
                GridItem(.flexible(), alignment: .leading),
                GridItem(.flexible(), alignment: .leading)
            ], spacing: 10) {
                statItem(icon: "figure.hiking", value: String(format: "%.1f", totalDistance), unit: "miles")
                statItem(icon: "arrow.up.right", value: String(format: "+%.0f", profile?.gainFeet ?? 0), unit: "feet")
                statItem(icon: "arrow.down.right", value: String(format: "−%.0f", profile?.lossFeet ?? 0), unit: "feet")
                statItem(icon: "gauge.with.dots.needle.50percent", value: String(format: "%.1f", profile?.effortMiles ?? totalDistance), unit: "effort mi")
                if let profile {
                    statItem(icon: "clock", value: TrailConstants.timeEstimate(for: profile).rangeLabel, unit: "")
                }
            }

            if let profile {
                Divider()

                HStack {
                    Label("Difficulty #\(profile.difficultyRank) of 8", systemImage: "chart.bar.fill")
                    Spacer()
                    Text("\(profile.kneeLoad.rawValue.capitalized) knee load")
                        .foregroundStyle(kneeColor(profile.kneeLoad))
                }
                .font(.caption.bold())

                Text("Net \(signed(profile.netFeet)) ft · high point \(profile.highPointFeet.formatted(.number.precision(.fractionLength(0)))) ft · \(profile.descentPerMile.formatted(.number.precision(.fractionLength(0)))) ft descent/mi")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Text(profile.note)
                    .font(.caption)
            }
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

    private func signed(_ value: Double) -> String {
        String(format: value >= 0 ? "+%.0f" : "−%.0f", abs(value))
    }

    private func kneeColor(_ level: KneeLoadLevel) -> Color {
        switch level {
        case .low: .green
        case .moderate: .orange
        case .high, .veryHigh: .red
        }
    }
}

// MARK: - Terrain Context

private struct TerrainOverviewCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Route Reality Check", systemImage: "mountain.2.fill")
                .font(.headline)

            Text("This is a 51.844-mile trip—not a flat 6.5 miles every day.")
                .font(.subheadline.bold())

            HStack {
                overviewValue(String(format: "%.1f", TrailConstants.totalMiles), "miles")
                Spacer()
                overviewValue("+\(TrailConstants.totalGainFeet.formatted(.number.precision(.fractionLength(0))))", "gain ft")
                Spacer()
                overviewValue("−\(TrailConstants.totalLossFeet.formatted(.number.precision(.fractionLength(0))))", "loss ft")
            }

            Text("Day 3 is the longest day at 12.59 miles, but it is a supported day-pack traverse with timed Bartle Gap extraction. Day 2 has the largest climb; Day 7 is the biggest knee-risk descent. Time ranges assume ordinary group pacing, water and navigation stops—not a 2.5–3.5 mph race pace.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(.blue.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.blue.opacity(0.25)))
    }

    private func overviewValue(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(.title3, design: .rounded).bold())
            Text(label)
                .font(.caption2.bold())
                .foregroundStyle(.secondary)
        }
    }
}

private struct ComparableHikerContextView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("What Other Hikers Actually Did", systemImage: "person.2.fill")
                .font(.headline)

            Text("These are context—not promises. Pack weight, conditioning, heat, smoke, water carries, trail damage, and stopping time can change the result substantially.")
                .font(.caption)
                .foregroundStyle(.secondary)

            comparison(
                "Cabin Creek → Ash Camp",
                detail: "15 miles and about +2,000 ft in just over 6 hours with a day pack.",
                url: URL(string: "https://trailhiker.wordpress.com/2017/11/09/pct-section-o-cabin-creek-to-ash-camp/")!
            )
            comparison(
                "Bartle Gap → Ash Camp",
                detail: "26.4 miles, about +2,400/−5,100 ft in roughly 11.5 hours; the author said they would not repeat it.",
                url: URL(string: "https://trailhiker.wordpress.com/2018/06/27/pct-section-o-bartle-gap-to-ash-camp/")!
            )
            comparison(
                "2003 PCT journal",
                detail: "A thru-hiker logged approximately 17, 28, and 23 miles on successive days in this broader section—useful only as a high-conditioning comparison.",
                url: URL(string: "https://www.bedore.org/2003_PCT_August.html")!
            )
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private func comparison(_ title: String, detail: String, url: URL) -> some View {
        Link(destination: url) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.subheadline.bold())
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
            }
        }
        .buttonStyle(.plain)
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

            if camp.stopType == "support-transfer" {
                Text("TRANSFER · NO CAMPING")
                    .font(.system(size: 9, weight: .black))
                    .foregroundStyle(.orange)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(.orange.opacity(0.12), in: Capsule())
            }
            
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
        case "Support Transfer": return "arrow.left.arrow.right.circle.fill"
        case "Finish":    return "flag.checkered"
        default:          return "tent.fill"
        }
    }
}

#Preview {
    ItineraryView()
        .modelContainer(for: [CampSite.self, WaterSource.self, TrailPoint.self], inMemory: true)
}
