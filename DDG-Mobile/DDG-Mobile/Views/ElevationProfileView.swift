import SwiftUI
import SwiftData
import Charts

struct ElevationProfileView: View {
    @Binding var hoverPoint: HoverPoint?
    @Binding var selectedDay: Int?
    
    @Query(sort: \TrailPoint.index) private var trailPoints: [TrailPoint]
    @Query(sort: \CampSite.day) private var camps: [CampSite]
    @Query private var waterSources: [WaterSource]

    @State private var selectedMile: Double?
    @State private var scrollPosition: Double = 0

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
                    description: Text("Calculating elevations for 2,650 miles...")
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
            if let newDay, let range = dayMileRanges.first(where: { $0.day == newDay }) {
                withAnimation(.easeInOut) {
                    scrollPosition = range.startMile
                }
            }
        }
        .onAppear {
            print("DEBUG [ElevationProfileView]: Mounted on screen. TrailPoints database count: \(trailPoints.count) | Camps database count: \(camps.count) | Generated ProfilePoints count: \(profileData.count)")
        }
        .task(id: trailPoints.count) {
            if profileData.isEmpty && trailPoints.count > 1 {
                computeData()
            }
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
    private struct SimpleCamp: Sendable {
        let day: Int
        let routeMile: Double
    }
    private struct SimpleTrailPoint: Sendable {
        let latitude: Double
        let longitude: Double
        let elevationFeet: Double
    }
    private struct SimpleWater: Sendable {
        let name: String
        let latitude: Double
        let longitude: Double
    }

    private func computeData() {
        guard trailPoints.count > 1 else { return }

        // 1. Extract data safely on MainActor
        let simpleCamps = camps.map { SimpleCamp(day: $0.day, routeMile: $0.routeMile) }
        let simpleTPs = trailPoints.map { SimpleTrailPoint(latitude: $0.latitude, longitude: $0.longitude, elevationFeet: $0.elevationFeet) }
        let simpleWaters = waterSources.map { SimpleWater(name: $0.name, latitude: $0.latitude, longitude: $0.longitude) }
        let simpleConn = connectivityZones
        let colors = dayColors.map { $0.stroke }
        let thresh = TrailConstants.elevationThreshold

        Task.detached {
            // 1. Day Mile Ranges (Compute First to map points)
            let grouped = Dictionary(grouping: simpleCamps, by: \.day).sorted { $0.key < $1.key }
            var ranges: [DayMileRange] = []
            for (day, dayCamps) in grouped {
                let start = dayCamps.map(\.routeMile).min() ?? 0
                let end = dayCamps.map(\.routeMile).max() ?? 0
                let hexString = (day >= 0 && day < colors.count) ? colors[day] : ""
                ranges.append(DayMileRange(day: day, startMile: start, endMile: end, hexColor: hexString, gain: 0, loss: 0))
            }

            // 2. Profile Data & Point Day Mapping
            let stride = max(1, simpleTPs.count / 2000)
            var points: [ProfilePoint] = []
            var cumulativeDist: Double = 0

            for i in Swift.stride(from: 0, to: simpleTPs.count, by: stride) {
                let tp = simpleTPs[i]
                if i > 0 {
                    let prev = simpleTPs[max(0, i - stride)]
                    let dx = tp.longitude - prev.longitude
                    let dy = tp.latitude - prev.latitude
                    let distDeg = (dx * dx + dy * dy).squareRoot()
                    cumulativeDist += distDeg * 69.0
                }
                
                var ptDay = ranges.last?.day ?? 0
                for r in ranges {
                    if cumulativeDist <= r.endMile {
                        ptDay = r.day
                        break
                    }
                }

                points.append(ProfilePoint(
                    mile: cumulativeDist,
                    elevationFeet: tp.elevationFeet,
                    latitude: tp.latitude,
                    longitude: tp.longitude,
                    day: ptDay
                ))
            }

            // 3. Accurate Gain / Loss (Global and Per Day)
            var globalGain: Double = 0
            var globalLoss: Double = 0
            var dailyGains = [Int: Double]()
            var dailyLosses = [Int: Double]()
            var lastDist: Double = 0
            
            for i in 1..<simpleTPs.count {
                let tp = simpleTPs[i]
                let prev = simpleTPs[i-1]
                
                let dx = tp.longitude - prev.longitude
                let dy = tp.latitude - prev.latitude
                let distDeg = (dx * dx + dy * dy).squareRoot()
                lastDist += distDeg * 69.0
                
                var tpDay = ranges.last?.day ?? 0
                for r in ranges {
                    if lastDist <= r.endMile {
                        tpDay = r.day
                        break
                    }
                }

                let diff = tp.elevationFeet - prev.elevationFeet
                if diff > thresh { 
                    globalGain += diff
                    dailyGains[tpDay, default: 0] += diff
                } else if diff < -thresh { 
                    globalLoss -= diff 
                    dailyLosses[tpDay, default: 0] -= diff
                }
            }
            
            // Update ranges with accurate daily stats
            for i in 0..<ranges.count {
                let d = ranges[i].day
                ranges[i].gain = dailyGains[d] ?? 0
                ranges[i].loss = dailyLosses[d] ?? 0
            }

            // 4. Water Source Miles
            var wsMiles: [WaterMileData] = []
            for ws in simpleWaters {
                // Find nearest profile point (faster than 48k trail points)
                guard let nearest = points.min(by: { a, b in
                    let da = (a.latitude - ws.latitude) * (a.latitude - ws.latitude) + (a.longitude - ws.longitude) * (a.longitude - ws.longitude)
                    let db = (b.latitude - ws.latitude) * (b.latitude - ws.latitude) + (b.longitude - ws.longitude) * (b.longitude - ws.longitude)
                    return da < db
                }) else { continue }
                wsMiles.append(WaterMileData(name: ws.name, mile: nearest.mile, elevation: nearest.elevationFeet))
            }
            
            // 5. Connectivity Zone Miles
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
            let finalGain = globalGain
            let finalLoss = globalLoss
            let finalRanges = ranges
            let finalWs = wsMiles
            let finalConn = connMiles
 
            await MainActor.run {
                self.profileData = finalPoints
                self.totalGain = finalGain
                self.totalLoss = finalLoss
                self.dayMileRanges = finalRanges
                self.waterSourceMiles = finalWs
                self.connectivitySourceMiles = finalConn
            }
        }
    }

    // MARK: - Chart

    private var chartView: some View {
        Chart {
            // Altitude zone backgrounds
            ForEach(altitudeZones) { zone in
                RectangleMark(
                    xStart: .value("Start", 0),
                    xEnd: .value("End", profileData.last?.mile ?? 80),
                    yStart: .value("Min", zone.minFt),
                    yEnd: .value("Max", min(zone.maxFt, 15000))
                )
                .foregroundStyle(zoneColor(zone).opacity(0.05))
            }

            // Day boundaries
            ForEach(dayMileRanges.filter { $0.day >= 0 }, id: \.day) { range in
                RuleMark(
                    x: .value("Mile", range.startMile)
                )
                .foregroundStyle(range.color.opacity(0.3))
                .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 4]))
                .annotation(position: .top, alignment: .leading) {
                    Text("Day \(range.day + 1)")
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
            ForEach(dayMileRanges.filter { $0.day >= 0 }, id: \.day) { range in
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

            // Camp markers
            ForEach(camps) { camp in
                PointMark(
                    x: .value("Mile", camp.routeMile),
                    y: .value("Elevation", 0)
                )
                .symbol {
                    Image(systemName: "tent.fill")
                        .font(.caption2)
                        .foregroundStyle((camp.day >= 0 && camp.day < dayColors.count) ? Color(hex: dayColors[camp.day].stroke) : .orange)
                        .shadow(radius: 2)
                }
            }

            // Water source markers
            ForEach(waterSourceMiles, id: \.name) { ws in
                PointMark(
                    x: .value("Mile", ws.mile),
                    y: .value("Elevation", ws.elevation)
                )
                .symbol {
                    Image(systemName: "drop.fill")
                        .font(.system(size: 7))
                        .padding(4)
                        .background(.cyan, in: Circle())
                        .foregroundStyle(.white)
                        .overlay(Circle().stroke(.white, lineWidth: 1.5))
                        .shadow(radius: 2)
                }
            }

            // Connectivity source markers (cell towers)
            ForEach(connectivitySourceMiles, id: \.name) { zone in
                PointMark(
                    x: .value("Mile", zone.mile),
                    y: .value("Elevation", zone.elevation)
                )
                .symbol {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .font(.system(size: 7))
                        .padding(4)
                        .background(zone.hasSignal ? .purple : .gray, in: Circle())
                        .foregroundStyle(.white)
                        .overlay(Circle().stroke(.white, lineWidth: 1.5))
                        .shadow(radius: 2)
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
        .chartYAxisLabel("Elevation (ft)")
        .chartXAxisLabel("Trail Miles")
        .chartScrollableAxes(.horizontal)
        .chartXVisibleDomain(length: selectedDay == nil ? (profileData.last?.mile ?? 80) : 25)
        .chartScrollPosition(x: $scrollPosition)
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
                        Text("Day \(range.day + 1)")
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

    private var statsBar: some View {
        HStack(spacing: 0) {
            let displayGain = selectedDay.flatMap { d in dayMileRanges.first(where: { $0.day == d })?.gain } ?? totalGain
            let displayLoss = selectedDay.flatMap { d in dayMileRanges.first(where: { $0.day == d })?.loss } ?? totalLoss
            let displayMiles = selectedDay.flatMap { d in 
                if let r = dayMileRanges.first(where: { $0.day == d }) { return r.endMile - r.startMile }
                return 0
            } ?? (profileData.last?.mile ?? 0)

            statItem(icon: "arrow.up.right", value: String(format: "%.0f", displayGain), unit: "ft", color: .green)
            Divider().frame(height: 30)
            statItem(icon: "arrow.down.right", value: String(format: "%.0f", displayLoss), unit: "ft", color: .red)
            Divider().frame(height: 30)
            statItem(icon: "clock", value: String(format: "%.0f", TrailConstants.estimatedTime(miles: displayMiles, gainFeet: displayGain)), unit: "hr", color: .blue)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 20)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
        .padding(.horizontal)
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

    private func zoneColor(_ zone: AltitudeZone) -> Color {
        switch zone.risk {
        case "none":     .green
        case "low":      .yellow
        case "moderate": .orange
        default:         .red
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
    ElevationProfileView(hoverPoint: .constant(nil), selectedDay: .constant(0))
        .modelContainer(for: [TrailPoint.self, CampSite.self, WaterSource.self], inMemory: true)
}
