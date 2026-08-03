import SwiftUI
import SwiftData
import Charts

struct ElevationProfileView: View {
    @Binding var hoverPoint: HoverPoint?
    @Binding var selectedDay: Int?
    let waterConditions: [TrailWaterCondition]
    let waterReportUpdatedText: String?
    let waterSnapshotFetchedAt: Date?
    let waterSourceURL: String?
    
    @Query(sort: \TrailPoint.index) private var trailPoints: [TrailPoint]
    @Query(sort: \CampSite.day) private var camps: [CampSite]
    @Query private var waterSources: [WaterSource]

    @State private var selectedMile: Double?
    @State private var selectedGraphWater: WaterSource?
    @State private var selectedGraphCamp: CampSite?
    @State private var selectedGraphZone: ConnectivityZone?

    // Cached state to prevent main thread blocking
    @State private var profileData: [ProfilePoint] = []
    @State private var waterSourceMiles: [WaterMileData] = []
    @State private var connectivitySourceMiles: [ConnectivityMileData] = []
    @State private var dayMileRanges: [DayMileRange] = []
    @State private var totalGain: Double = 0
    @State private var totalLoss: Double = 0

    var body: some View {
        ZStack(alignment: .top) {
            if profileData.isEmpty {
                ContentUnavailableView(
                    "Processing Trail Data...",
                    systemImage: "waveform.path.ecg",
                    description: Text("Loading the normalized 51.8-mile profile...")
                )
            } else {
                VStack(spacing: 0) {
                    dayPicker
                    chartView
                    statsBar
                        .padding(.top, 4)
                        .padding(.bottom, 8)
                }
            }
        }
        .onChange(of: selectedMile) { _, newValue in
            if let newValue {
                hoverPoint = findClosestPoint(to: newValue)
            } else {
                hoverPoint = nil
            }
        }
        .onChange(of: selectedDay) { _, newDay in
            // A selected day owns the chart's exact X/Y domains. Clear any cursor
            // left behind by the previous day so its annotation cannot imply that
            // the old segment is still active.
            selectedMile = nil
        }
        .onAppear {
            print("DEBUG [ElevationProfileView]: Mounted on screen. TrailPoints database count: \(trailPoints.count) | Camps database count: \(camps.count) | Generated ProfilePoints count: \(profileData.count)")
        }
        .task(id: trailPoints.count) {
            if profileData.isEmpty && trailPoints.count > 1 {
                computeData()
            }
        }
        .sheet(item: $selectedGraphWater) { source in
            WaterDetailSheet(
                source: source,
                mile: source.routeMile,
                liveCondition: liveCondition(for: source),
                reportUpdatedText: waterReportUpdatedText,
                snapshotFetchedAt: waterSnapshotFetchedAt,
                sourceURL: waterSourceURL
            )
            .presentationDetents([.medium, .large])
        }
        .sheet(item: $selectedGraphCamp) { camp in
            CampDetailSheet(camp: camp)
                .presentationDetents([.medium, .large])
        }
        .sheet(item: $selectedGraphZone) { zone in
            ConnectivityDetailSheet(zone: zone)
                .presentationDetents([.medium])
        }
    }

    private func findClosestPoint(to mile: Double) -> HoverPoint? {
        guard !profileData.isEmpty else { return nil }
        
        var closest = profileData[0]
        var minDiff = abs(closest.mile - mile)
        
        for pt in profileData {
            let diff = abs(pt.mile - mile)
            if diff < minDiff {
                minDiff = diff
                closest = pt
            }
        }
        
        return HoverPoint(
            latitude: closest.latitude,
            longitude: closest.longitude,
            mile: closest.mile,
            elevationFeet: closest.elevationFeet
        )
    }

    // MARK: - Data Computation

    // Local Sendable structs to cross actor boundary
    private struct SimpleTrailPoint: Sendable {
        let latitude: Double
        let longitude: Double
        let elevationFeet: Double
        let routeMile: Double
    }
    private struct SimpleWater: Sendable {
        let name: String
        let latitude: Double
        let longitude: Double
        let routeMile: Double
    }

    private func computeData() {
        guard trailPoints.count > 1 else { return }

        // 1. Extract data safely on MainActor
        let simpleTPs = trailPoints.map {
            SimpleTrailPoint(
                latitude: $0.latitude,
                longitude: $0.longitude,
                elevationFeet: $0.elevationFeet,
                routeMile: $0.routeMile
            )
        }
        let simpleWaters = waterSources.map {
            SimpleWater(
                name: $0.name,
                latitude: $0.latitude,
                longitude: $0.longitude,
                routeMile: $0.routeMile
            )
        }
        let simpleConn = connectivityZones
        let colors = dayColors.map { $0.stroke }
        let profiles = TrailConstants.dayProfiles
        let officialTotalMiles = TrailConstants.totalMiles
        let normalizedTotalGain = TrailConstants.totalGainFeet
        let normalizedTotalLoss = TrailConstants.totalLossFeet

        Task.detached {
            // Day ranges and stats come directly from the normalized bundled plan.
            let ranges = profiles.map { profile in
                let colorIndex = max(0, profile.day - 1)
                let hexString = colorIndex < colors.count ? colors[colorIndex] : ""
                return DayMileRange(
                    day: profile.day,
                    startMile: profile.routeMileStart,
                    endMile: profile.routeMileEnd,
                    hexColor: hexString,
                    gain: profile.gainFeet,
                    loss: profile.lossFeet
                )
            }

            // Profile data and point/day mapping. Canonical terrain points
            // carry the PCTA-calibrated route mile directly. The old geometric
            // rescale remains only as a safe fallback for damaged/legacy data.
            let hasCanonicalRouteMiles =
                simpleTPs.count > 1 &&
                simpleTPs.allSatisfy { $0.routeMile.isFinite } &&
                (simpleTPs.last?.routeMile ?? 0) > 0 &&
                zip(simpleTPs, simpleTPs.dropFirst()).allSatisfy { pair in
                    pair.0.routeMile <= pair.1.routeMile
                }
            var displayMiles: [Double]
            if hasCanonicalRouteMiles {
                displayMiles = simpleTPs.map(\.routeMile)
            } else {
                var rawMiles = Array(repeating: 0.0, count: simpleTPs.count)
                for index in 1..<simpleTPs.count {
                    rawMiles[index] = rawMiles[index - 1] + Self.haversineMiles(
                        from: simpleTPs[index - 1],
                        to: simpleTPs[index]
                    )
                }
                let mileageScale = rawMiles.last.map {
                    $0 > 0 ? officialTotalMiles / $0 : 1
                } ?? 1
                displayMiles = rawMiles.map { $0 * mileageScale }
            }
            let stride = max(1, simpleTPs.count / 2000)
            var sampledIndices = Array(
                Swift.stride(from: 0, to: simpleTPs.count, by: stride)
            )
            if sampledIndices.last != simpleTPs.indices.last {
                sampledIndices.append(simpleTPs.indices.last!)
            }
            var points: [ProfilePoint] = []

            for i in sampledIndices {
                let tp = simpleTPs[i]
                let officialMile = displayMiles[i]
                
                var ptDay = ranges.last?.day ?? 8
                for r in ranges {
                    if officialMile <= r.endMile {
                        ptDay = r.day
                        break
                    }
                }

                points.append(ProfilePoint(
                    mile: officialMile,
                    elevationFeet: tp.elevationFeet,
                    latitude: tp.latitude,
                    longitude: tp.longitude,
                    day: ptDay
                ))
            }

            // Water source miles.
            var wsMiles: [WaterMileData] = []
            for ws in simpleWaters {
                // Find nearest profile point (faster than 48k trail points)
                guard let nearest = points.min(by: { a, b in
                    let da = (a.latitude - ws.latitude) * (a.latitude - ws.latitude) + (a.longitude - ws.longitude) * (a.longitude - ws.longitude)
                    let db = (b.latitude - ws.latitude) * (b.latitude - ws.latitude) + (b.longitude - ws.longitude) * (b.longitude - ws.longitude)
                    return da < db
                }) else { continue }
                wsMiles.append(
                    WaterMileData(
                        name: ws.name,
                        mile: ws.routeMile > 0 ? ws.routeMile : nearest.mile,
                        elevation: nearest.elevationFeet
                    )
                )
            }
            
            // Connectivity zone miles.
            var connMiles: [ConnectivityMileData] = []
            for zone in simpleConn {
                guard let nearest = points.min(by: { a, b in
                    let da = (a.latitude - zone.latitude) * (a.latitude - zone.latitude) + (a.longitude - zone.longitude) * (a.longitude - zone.longitude)
                    let db = (b.latitude - zone.latitude) * (b.latitude - zone.latitude) + (b.longitude - zone.longitude) * (b.longitude - zone.longitude)
                    return da < db
                }) else { continue }
                let hasSignal = zone.cellCoverage.verizon != "none" || zone.cellCoverage.att != "none" || zone.cellCoverage.tmobile != "none"
                connMiles.append(ConnectivityMileData(name: zone.name, mile: nearest.mile, elevation: nearest.elevationFeet, hasSignal: hasSignal))
            }
 
            let finalPoints = points
            let finalRanges = ranges
            let finalWs = wsMiles
            let finalConn = connMiles
 
            await MainActor.run {
                self.profileData = finalPoints
                self.totalGain = normalizedTotalGain
                self.totalLoss = normalizedTotalLoss
                self.dayMileRanges = finalRanges
                self.waterSourceMiles = finalWs
                self.connectivitySourceMiles = finalConn
            }
        }
    }

    nonisolated private static func haversineMiles(
        from first: SimpleTrailPoint,
        to second: SimpleTrailPoint
    ) -> Double {
        let radians = { (degrees: Double) in degrees * .pi / 180 }
        let latitude1 = radians(first.latitude)
        let latitude2 = radians(second.latitude)
        let latitudeDelta = latitude2 - latitude1
        let longitudeDelta = radians(second.longitude - first.longitude)
        let value =
            pow(sin(latitudeDelta / 2), 2) +
            cos(latitude1) * cos(latitude2) * pow(sin(longitudeDelta / 2), 2)
        return 3_958.7613 * 2 * asin(sqrt(value))
    }

    // MARK: - Chart

    private var displayedDayRanges: [DayMileRange] {
        guard let selectedDay else { return dayMileRanges }
        return dayMileRanges.filter { $0.day == selectedDay }
    }

    private var chartXDomain: ClosedRange<Double> {
        guard let profile = selectedProfileForStats else {
            return 0...TrailConstants.totalMiles
        }
        let padding = min(0.20, profile.miles * 0.025)
        let lowerBound = max(0, profile.routeMileStart - padding)
        let upperBound = min(TrailConstants.totalMiles, profile.routeMileEnd + padding)
        return lowerBound...upperBound
    }

    private var chartYDomain: ClosedRange<Double> {
        let visiblePoints = profileData.filter { chartXDomain.contains($0.mile) }
        guard
            let minimum = visiblePoints.map(\.elevationFeet).min(),
            let maximum = visiblePoints.map(\.elevationFeet).max()
        else {
            return 0...7_000
        }

        let lower = max(0, floor((minimum - 250) / 500) * 500)
        let upper = max(lower + 1_000, ceil((maximum + 250) / 500) * 500)
        return lower...upper
    }

    private var chartView: some View {
        Chart {
            // Day boundaries
            ForEach(displayedDayRanges, id: \.day) { range in
                RuleMark(
                    x: .value("Mile", range.startMile)
                )
                .foregroundStyle(range.color.opacity(0.3))
                .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 4]))
                .annotation(position: .top, alignment: .leading) {
                    Text("Day \(range.day)")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(range.color)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(range.color.opacity(0.15), in: Capsule())
                        .overlay(Capsule().stroke(range.color.opacity(0.4), lineWidth: 1))
                        .offset(x: 2, y: 10)
                }
            }

            // Dynamic Elevation Area & Line per Day
            ForEach(displayedDayRanges, id: \.day) { range in
                let dayPoints = profileData.filter { $0.day == range.day }
                
                ForEach(dayPoints) { point in
                    AreaMark(
                        x: .value("Mile", point.mile),
                        yStart: .value("Min", 0),
                        yEnd: .value("Elevation", point.elevationFeet)
                    )
                }
                .foregroundStyle(
                    LinearGradient(
                        colors: [range.color.opacity(0.6), range.color.opacity(0.1), .clear],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

                ForEach(dayPoints) { point in
                    LineMark(
                        x: .value("Mile", point.mile),
                        y: .value("Elevation", point.elevationFeet)
                    )
                }
                .foregroundStyle(range.color)
                .lineStyle(StrokeStyle(lineWidth: 2))
            }

            // Water source markers
            ForEach(waterSourceMiles.filter { chartXDomain.contains($0.mile) }, id: \.name) { ws in
                PointMark(
                    x: .value("Mile", ws.mile),
                    y: .value("Elevation", ws.elevation)
                )
                .symbol {
                    let source = waterSources.first { $0.name == ws.name }
                    let live = source.flatMap { liveCondition(for: $0) }
                    Button {
                        if let source {
                            selectedGraphWater = source
                        }
                    } label: {
                        Image(systemName: "drop.fill")
                            .font(.system(size: 6.5, weight: .bold))
                            .frame(width: 18, height: 18)
                            .background(waterColor(live), in: Circle())
                            .foregroundStyle(.white)
                            .overlay(
                                Circle().stroke(
                                    live?.freshness?.lowercased() == "stale" ? .orange : .white,
                                    lineWidth: live?.freshness?.lowercased() == "stale" ? 2 : 1
                                )
                            )
                            .shadow(radius: 2)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(ws.name) water report")
                }
            }

            // Connectivity source markers (cell towers)
            ForEach(connectivitySourceMiles.filter { chartXDomain.contains($0.mile) }, id: \.name) { zone in
                PointMark(
                    x: .value("Mile", zone.mile),
                    y: .value("Elevation", zone.elevation)
                )
                .symbol {
                    Button {
                        selectedGraphZone = connectivityZones.first { $0.name == zone.name }
                    } label: {
                        Image(systemName: "antenna.radiowaves.left.and.right")
                            .font(.system(size: 6, weight: .bold))
                            .frame(width: 18, height: 18)
                            .background(zone.hasSignal ? .purple : .gray, in: Circle())
                            .foregroundStyle(.white)
                            .overlay(Circle().stroke(.white, lineWidth: 1))
                            .shadow(radius: 2)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(zone.name) connectivity details")
                }
            }

            // Trail-stop markers render after environmental markers so an exact
            // camp, transfer, or finish cannot be hidden by co-located water or
            // connectivity data. Travel-day records also use route mile zero,
            // so only Day 0–8 stops belong on the elevation profile.
            ForEach(camps.filter {
                $0.day >= 0 && chartXDomain.contains($0.routeMile)
            }) { camp in
                PointMark(
                    x: .value("Mile", camp.routeMile),
                    y: .value("Elevation", elevation(at: camp.routeMile))
                )
                .symbol {
                    Button {
                            selectedGraphCamp = camp
                    } label: {
                        trailStopSymbol(for: camp)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(camp.name) itinerary stop details")
                }
            }

            // Interactive Selection Cursor
            if let activeMile = hoverPoint?.mile {
                RuleMark(
                    x: .value("Selected Mile", activeMile)
                )
                .foregroundStyle(.primary)
                .lineStyle(StrokeStyle(lineWidth: 1.5))
                .annotation(position: .top) {
                    if let activeElev = hoverPoint?.elevationFeet {
                        VStack(spacing: 2) {
                            Text(String(format: "%.1f mi", activeMile))
                                .font(.caption2.bold())
                            Text(String(format: "%.0f ft", activeElev))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .padding(6)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                        .shadow(color: .black.opacity(0.15), radius: 4)
                    }
                }
                
                if let activeElev = hoverPoint?.elevationFeet {
                    PointMark(
                        x: .value("Selected Mile", activeMile),
                        y: .value("Elevation", activeElev)
                    )
                    .symbol {
                        Circle()
                            .fill(.white)
                            .frame(width: 12, height: 12)
                            .overlay(Circle().stroke(.purple, lineWidth: 3))
                            .shadow(color: .black.opacity(0.2), radius: 3)
                    }
                }
            }
        }
        .chartXSelection(value: $selectedMile)
        .chartOverlay { proxy in
            GeometryReader { geometry in
                Rectangle()
                    .fill(.clear)
                    .contentShape(Rectangle())
                    .simultaneousGesture(
                        SpatialTapGesture()
                            .onEnded { value in
                                guard let plotFrame = proxy.plotFrame else { return }
                                let frame = geometry[plotFrame]
                                let plotX = value.location.x - frame.minX
                                guard plotX >= 0,
                                      plotX <= frame.width,
                                      let mile: Double = proxy.value(atX: plotX)
                                else {
                                    return
                                }
                                selectGraphMarker(near: mile)
                            }
                    )
            }
        }
        .chartXScale(domain: chartXDomain)
        .chartYScale(domain: chartYDomain)
        .chartYAxisLabel("Elevation (ft)")
        .chartXAxisLabel("Trail Miles")
        .frame(height: 220)
        .padding(.horizontal)
    }

    // MARK: - Day Picker
    
    private var dayPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                Button(action: {
                    withAnimation { selectedDay = nil }
                }) {
                    Text("All Days")
                        .font(.subheadline.bold())
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(selectedDay == nil ? Color.blue : Color.gray.opacity(0.15))
                        .foregroundStyle(selectedDay == nil ? .white : .primary)
                        .clipShape(Capsule())
                }
                
                ForEach(dayMileRanges, id: \.day) { range in
                    Button(action: {
                        withAnimation { selectedDay = range.day }
                    }) {
                        Text("Day \(range.day)")
                            .font(.subheadline.bold())
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(selectedDay == range.day ? range.color : range.color.opacity(0.15))
                            .foregroundStyle(selectedDay == range.day ? .white : range.color)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.top, 8)
    }

    // MARK: - Day Mile Ranges

    private struct DayMileRange: Sendable {
        let day: Int
        let startMile: Double
        let endMile: Double
        let hexColor: String
        var gain: Double
        var loss: Double
        
        @MainActor
        var color: Color {
            hexColor.isEmpty ? .blue : Color(hex: hexColor)
        }
    }

    // MARK: - Water Source Mile Approximation

    private struct WaterMileData: Sendable {
        let name: String
        let mile: Double
        let elevation: Double
    }
    
    private struct ConnectivityMileData: Sendable {
        let name: String
        let mile: Double
        let elevation: Double
        let hasSignal: Bool
    }

    // MARK: - Stats Bar

    private var selectedProfileForStats: TrailDayProfile? {
        guard let selectedDay else { return nil }
        return TrailConstants.profile(for: selectedDay)
    }

    private var displayedTimeEstimate: TrailTimeEstimate {
        guard let selectedProfileForStats else {
            return TrailConstants.totalTimeEstimate
        }
        return TrailConstants.timeEstimate(for: selectedProfileForStats)
    }

    private var statsBar: some View {
        VStack(spacing: 10) {
            let displayGain = selectedProfileForStats?.gainFeet ?? totalGain
            let displayLoss = selectedProfileForStats?.lossFeet ?? totalLoss

            HStack(spacing: 12) {
                Label {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(distanceLabel)
                            .font(.subheadline.bold())
                        Text(packModeLabel)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                } icon: {
                    Image(systemName: "figure.hiking")
                        .foregroundStyle(.orange)
                }

                Spacer(minLength: 4)

                Label(displayedTimeEstimate.rangeLabel, systemImage: "clock")
                    .font(.subheadline.bold())
                    .foregroundStyle(.blue)
            }

            Divider()

            HStack(spacing: 0) {
                statItem(
                    icon: "arrow.up.right",
                    value: String(format: "%.0f", displayGain),
                    unit: "ft",
                    color: .green
                )
                Divider().frame(height: 26)
                statItem(
                    icon: "arrow.down.right",
                    value: String(format: "%.0f", displayLoss),
                    unit: "ft",
                    color: .red
                )
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 20)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
        .padding(.horizontal)
    }

    private var distanceLabel: String {
        let miles = selectedProfileForStats?.miles ?? TrailConstants.totalMiles
        return String(format: "%.2f mi", miles)
    }

    private var packModeLabel: String {
        guard let selectedProfileForStats else { return "Entire hiking route" }
        return selectedProfileForStats.packMode == "day-pack-supported"
            ? "Supported day pack"
            : "Overnight pack"
    }

    private func statItem(icon: String, value: String, unit: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(color)
            
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.system(.headline, design: .rounded).bold())
                Text(unit)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func elevation(at mile: Double) -> Double {
        profileData.min { first, second in
            abs(first.mile - mile) < abs(second.mile - mile)
        }?.elevationFeet ?? chartYDomain.lowerBound
    }

    private func selectGraphMarker(near mile: Double) {
        let threshold = max(0.15, (chartXDomain.upperBound - chartXDomain.lowerBound) * 0.012)
        enum Marker {
            case water(WaterSource)
            case camp(CampSite)
            case connectivity(ConnectivityZone)

            var mile: Double {
                switch self {
                case .water(let source): source.routeMile
                case .camp(let camp): camp.routeMile
                case .connectivity(let zone):
                    max(0, zone.mile - 1420.653)
                }
            }
        }

        let markers =
            waterSources.map(Marker.water) +
            camps.filter { $0.day >= 0 }.map(Marker.camp) +
            connectivityZones.map(Marker.connectivity)

        guard let nearest = markers.min(by: {
            abs($0.mile - mile) < abs($1.mile - mile)
        }), abs(nearest.mile - mile) <= threshold else {
            return
        }

        switch nearest {
        case .water(let source):
            selectedGraphWater = source
        case .camp(let camp):
            selectedGraphCamp = camp
        case .connectivity(let zone):
            selectedGraphZone = zone
        }
    }

    @ViewBuilder
    private func trailStopSymbol(for camp: CampSite) -> some View {
        let symbol: String = switch camp.type {
        case "Trailhead": "flag.fill"
        case "Support Transfer": "arrow.left.arrow.right.circle.fill"
        case "Finish": "flag.checkered"
        default: "tent.fill"
        }
        let color: Color = switch camp.type {
        case "Trailhead": .green
        case "Support Transfer": .orange
        case "Finish": .teal
        default:
            if let profile = TrailConstants.profile(for: camp.day) {
                Color(hex: dayColors[max(0, profile.day - 1)].stroke)
            } else {
                .orange
            }
        }

        Image(systemName: symbol)
            .font(.system(size: 6.5, weight: .bold))
            .frame(width: 18, height: 18)
            .background(.thinMaterial, in: Circle())
            .foregroundStyle(color)
            .overlay(Circle().stroke(.white, lineWidth: 1))
            .shadow(color: .black.opacity(0.18), radius: 2)
    }

    private func liveCondition(for source: WaterSource) -> TrailWaterCondition? {
        waterConditions.condition(
            waypoint: source.waypoint,
            pctMile: source.pctMile,
            name: source.name
        )
    }

    private func waterColor(_ condition: TrailWaterCondition?) -> Color {
        switch condition?.condition.lowercased() {
        case "flowing": .blue
        case "limited": .orange
        case "dry": .red
        default: .gray
        }
    }
}

// MARK: - Profile Point

struct ProfilePoint: Sendable, Identifiable {
    var id: Double { mile }
    let mile: Double
    let elevationFeet: Double
    let latitude: Double
    let longitude: Double
    let day: Int
}

#Preview {
    ElevationProfileView(
        hoverPoint: .constant(nil),
        selectedDay: .constant(1),
        waterConditions: [],
        waterReportUpdatedText: nil,
        waterSnapshotFetchedAt: nil,
        waterSourceURL: nil
    )
        .modelContainer(for: [TrailPoint.self, CampSite.self, WaterSource.self], inMemory: true)
}
