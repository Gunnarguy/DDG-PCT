import SwiftUI
import SwiftData
import Charts

struct ElevationProfileView: View {
    @Binding var hoverPoint: HoverPoint?
    
    @Query(sort: \TrailPoint.index) private var trailPoints: [TrailPoint]
    @Query(sort: \CampSite.day) private var camps: [CampSite]
    @Query private var waterSources: [WaterSource]

    @State private var selectedMile: Double?

    var body: some View {
        VStack(spacing: 0) {
            if profileData.isEmpty {
                ContentUnavailableView(
                    "No Trail Data",
                    systemImage: "chart.line.downtrend.xyaxis",
                    description: Text("Trail data will appear after first launch loads hike_data.json")
                )
            } else {
                chartView
                statsBar
            }
        }
        .onChange(of: selectedMile) { _, newValue in
            if let newValue {
                hoverPoint = findClosestPoint(to: newValue)
            } else {
                hoverPoint = nil
            }
        }
        .onAppear {
            print("DEBUG [ElevationProfileView]: Mounted on screen. TrailPoints database count: \(trailPoints.count) | Camps database count: \(camps.count) | Generated ProfilePoints count: \(profileData.count)")
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

    // MARK: - Computed Profile Data

    private var profileData: [ProfilePoint] {
        guard trailPoints.count > 1 else { return [] }

        // Downsample for chart performance (every Nth point)
        let stride = max(1, trailPoints.count / 2000)
        var points: [ProfilePoint] = []
        var cumulativeDist: Double = 0

        for i in Swift.stride(from: 0, to: trailPoints.count, by: stride) {
            let tp = trailPoints[i]
            if i > 0 {
                let prev = trailPoints[max(0, i - stride)]
                let dx = tp.longitude - prev.longitude
                let dy = tp.latitude - prev.latitude
                let distDeg = (dx * dx + dy * dy).squareRoot()
                cumulativeDist += distDeg * 69.0  // rough deg → miles
            }
            points.append(ProfilePoint(
                mile: cumulativeDist,
                elevationFeet: tp.elevationFeet,
                latitude: tp.latitude,
                longitude: tp.longitude
            ))
        }
        return points
    }

    private var totalGain: Double {
        var gain: Double = 0
        for i in 1..<profileData.count {
            let diff = profileData[i].elevationFeet - profileData[i-1].elevationFeet
            if diff > TrailConstants.elevationThreshold { gain += diff }
        }
        return gain
    }

    private var totalLoss: Double {
        var loss: Double = 0
        for i in 1..<profileData.count {
            let diff = profileData[i-1].elevationFeet - profileData[i].elevationFeet
            if diff > TrailConstants.elevationThreshold { loss += diff }
        }
        return loss
    }

    // MARK: - Chart

    private var chartView: some View {
        Chart {
            // Day color backgrounds
            ForEach(dayMileRanges, id: \.day) { range in
                RectangleMark(
                    xStart: .value("Start", range.startMile),
                    xEnd: .value("End", range.endMile),
                    yStart: .value("Min", 0),
                    yEnd: .value("Max", 10000)
                )
                .foregroundStyle(range.color.opacity(0.08))
            }

            // Altitude zone backgrounds
            ForEach(altitudeZones) { zone in
                RectangleMark(
                    xStart: .value("Start", 0),
                    xEnd: .value("End", profileData.last?.mile ?? 80),
                    yStart: .value("Min", zone.minFt),
                    yEnd: .value("Max", min(zone.maxFt, 10000))
                )
                .foregroundStyle(zoneColor(zone).opacity(0.1))
            }

            // Elevation line
            ForEach(profileData, id: \.mile) { point in
                LineMark(
                    x: .value("Mile", point.mile),
                    y: .value("Elevation", point.elevationFeet)
                )
                .foregroundStyle(.blue)
                .lineStyle(StrokeStyle(lineWidth: 1.5))
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
                        .foregroundStyle(camp.day < dayColors.count ? Color(hex: dayColors[camp.day].stroke) : .orange)
                }
                .annotation(position: .top) {
                    Text(camp.name)
                        .font(.system(size: 8))
                        .foregroundStyle(.secondary)
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
                        .foregroundStyle(.cyan)
                }
            }

            // Interactive Selection Cursor
            if let activeMile = hoverPoint?.mile {
                RuleMark(
                    x: .value("Selected Mile", activeMile)
                )
                .foregroundStyle(.purple)
                .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 2]))
                
                if let activeElev = hoverPoint?.elevationFeet {
                    PointMark(
                        x: .value("Selected Mile", activeMile),
                        y: .value("Elevation", activeElev)
                    )
                    .foregroundStyle(.purple)
                    .symbolSize(80)
                }
            }
        }
        .chartXSelection(value: $selectedMile)
        .chartYAxisLabel("Elevation (ft)")
        .chartXAxisLabel("Trail Miles")
        .frame(height: 180)
        .padding()
    }

    // MARK: - Day Mile Ranges

    private struct DayMileRange {
        let day: Int
        let startMile: Double
        let endMile: Double
        let color: Color
    }

    private var dayMileRanges: [DayMileRange] {
        let grouped = Dictionary(grouping: camps, by: \.day).sorted { $0.key < $1.key }
        return grouped.map { (day, dayCamps) in
            let start = dayCamps.map(\.routeMile).min() ?? 0
            let end = dayCamps.map(\.routeMile).max() ?? 0
            let color = day < dayColors.count ? Color(hex: dayColors[day].stroke) : .blue
            return DayMileRange(day: day, startMile: start, endMile: end, color: color)
        }
    }

    // MARK: - Water Source Mile Approximation

    private struct WaterMileData: Sendable {
        let name: String
        let mile: Double
        let elevation: Double
    }

    private var waterSourceMiles: [WaterMileData] {
        waterSources.compactMap { ws in
            // Find nearest trail point to approximate mile position
            guard let nearest = trailPoints.min(by: { a, b in
                let da = pow(a.latitude - ws.latitude, 2) + pow(a.longitude - ws.longitude, 2)
                let db = pow(b.latitude - ws.latitude, 2) + pow(b.longitude - ws.longitude, 2)
                return da < db
            }) else { return nil }
            // Use profileData to find approximate mile
            let idx = nearest.index
            let stride = max(1, trailPoints.count / 2000)
            let profileIdx = min(idx / stride, profileData.count - 1)
            guard profileIdx >= 0, profileIdx < profileData.count else { return nil }
            return WaterMileData(name: ws.name, mile: profileData[profileIdx].mile, elevation: nearest.elevationFeet)
        }
    }

    // MARK: - Stats Bar

    private var statsBar: some View {
        HStack(spacing: 20) {
            VStack {
                Text(String(format: "%.0f ft", totalGain))
                    .font(.headline)
                    .foregroundStyle(.green)
                Text("Total Gain")
                    .font(.caption2)
            }
            VStack {
                Text(String(format: "%.0f ft", totalLoss))
                    .font(.headline)
                    .foregroundStyle(.red)
                Text("Total Loss")
                    .font(.caption2)
            }
            VStack {
                let miles = profileData.last?.mile ?? 0
                Text(String(format: "%.0f hr", TrailConstants.estimatedTime(miles: miles, gainFeet: totalGain)))
                    .font(.headline)
                Text("Est. Time")
                    .font(.caption2)
            }
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
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

struct ProfilePoint: Sendable {
    let mile: Double
    let elevationFeet: Double
    let latitude: Double
    let longitude: Double
}

#Preview {
    ElevationProfileView(hoverPoint: .constant(nil))
        .modelContainer(for: [TrailPoint.self, CampSite.self, WaterSource.self], inMemory: true)
}
