import SwiftUI
import MapKit
import SwiftData

struct TrailMapView: View {
    @Binding var hoverPoint: HoverPoint?
    
    @Query(sort: \CampSite.day) private var camps: [CampSite]
    @Query(sort: \TrailPoint.index) private var trailPoints: [TrailPoint]
    @Query private var waterSources: [WaterSource]

    @State private var selectedCamp: CampSite?
    @State private var mapStyle: MapStyle = .standard(elevation: .realistic)
    @State private var showWater = true
    @State private var position: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 41.09, longitude: -121.77),
            span: MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
        )
    )

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Map(position: $position, selection: $selectedCamp) {
                // Live hover cursor
                if let hoverPoint {
                    Annotation("Active Cursor", coordinate: hoverPoint.coordinate) {
                        Image(systemName: "circle.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.purple)
                            .background(Circle().fill(.white))
                            .shadow(radius: 4)
                    }
                }
                    // Trail route colored by day
                    ForEach(daySegments, id: \.day) { segment in
                        MapPolyline(coordinates: segment.coordinates)
                            .stroke(segment.color, lineWidth: 3)
                    }

                    // Fallback: if no day segments, show whole route
                    if daySegments.isEmpty, trailPoints.count > 1 {
                        MapPolyline(coordinates: trailPoints.map(\.coordinate))
                            .stroke(.blue, lineWidth: 3)
                    }

                    // Camp markers
                    ForEach(camps) { camp in
                        Annotation(camp.name, coordinate: camp.coordinate) {
                            campMarker(for: camp)
                        }
                        .tag(camp)
                    }

                    // Water source markers
                    if showWater {
                        ForEach(waterSources) { source in
                            Annotation(source.name, coordinate: source.coordinate) {
                                waterMarker(for: source)
                            }
                        }
                    }
                }
                .mapStyle(mapStyle)

                // Controls
                VStack(spacing: 8) {
                    mapStylePicker
                    waterToggle
                }
                .padding(8)
            }
            .sheet(item: $selectedCamp) { camp in
                CampDetailSheet(camp: camp)
                    .presentationDetents([.medium])
            }
            .onAppear {
                print("DEBUG [TrailMapView]: Mounted on screen. Camps database count: \(camps.count) | TrailPoints database count: \(trailPoints.count) | WaterSources database count: \(waterSources.count)")
            }
        }

    // MARK: - Day Segments

    private struct DaySegment {
        let day: Int
        let coordinates: [CLLocationCoordinate2D]
        let color: Color
    }

    private var daySegments: [DaySegment] {
        guard !camps.isEmpty, trailPoints.count > 1 else { return [] }

        // Build day boundary indices by finding nearest trail point to each day's first/last camp
        let grouped = Dictionary(grouping: camps, by: \.day).sorted { $0.key < $1.key }
        var segments: [DaySegment] = []

        for (day, dayCamps) in grouped {
            let color = day < dayColors.count ? Color(hex: dayColors[day].stroke) : .blue

            // Find first and last camp of this day (by route mile)
            let sortedCamps = dayCamps.sorted { $0.routeMile < $1.routeMile }
            guard let firstCamp = sortedCamps.first, let lastCamp = sortedCamps.last else { continue }

            // Find nearest trail point index for each boundary camp
            let startIdx = nearestTrailPointIndex(to: firstCamp.coordinate)
            let endIdx = nearestTrailPointIndex(to: lastCamp.coordinate)

            let lo = max(0, min(startIdx, endIdx))
            let hi = min(trailPoints.count - 1, max(startIdx, endIdx))
            guard hi > lo else { continue }

            let coords = trailPoints[lo...hi].map(\.coordinate)
            segments.append(DaySegment(day: day, coordinates: Array(coords), color: color))
        }

        return segments
    }

    private func nearestTrailPointIndex(to coord: CLLocationCoordinate2D) -> Int {
        var bestIdx = 0
        var bestDist = Double.greatestFiniteMagnitude
        for (i, tp) in trailPoints.enumerated() {
            let d = pow(tp.latitude - coord.latitude, 2) + pow(tp.longitude - coord.longitude, 2)
            if d < bestDist {
                bestDist = d
                bestIdx = i
            }
        }
        return bestIdx
    }

    // MARK: - Camp Marker

    @ViewBuilder
    private func campMarker(for camp: CampSite) -> some View {
        let icon: String = switch camp.type {
        case "Trailhead": "flag.fill"
        case "Finish":    "flag.checkered"
        default:          "tent.fill"
        }

        let color: Color = camp.day < dayColors.count ? Color(hex: dayColors[camp.day].stroke) : .blue

        Image(systemName: icon)
            .font(.caption)
            .padding(6)
            .background(color, in: Circle())
            .foregroundStyle(.white)
    }

    // MARK: - Water Marker

    @ViewBuilder
    private func waterMarker(for source: WaterSource) -> some View {
        Image(systemName: "drop.fill")
            .font(.caption2)
            .padding(4)
            .background(waterColor(source.reliability), in: Circle())
            .foregroundStyle(.white)
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

    // MARK: - Style Picker

    private var mapStylePicker: some View {
        Menu {
            Button("Standard")  { mapStyle = .standard(elevation: .realistic) }
            Button("Satellite") { mapStyle = .imagery(elevation: .realistic) }
            Button("Hybrid")    { mapStyle = .hybrid(elevation: .realistic) }
        } label: {
            Image(systemName: "map")
                .padding(10)
                .background(.regularMaterial, in: Circle())
        }
    }

    // MARK: - Water Toggle

    private var waterToggle: some View {
        Button {
            showWater.toggle()
        } label: {
            Image(systemName: showWater ? "drop.fill" : "drop")
                .padding(10)
                .background(.regularMaterial, in: Circle())
                .foregroundStyle(showWater ? .blue : .secondary)
        }
    }
}

// MARK: - Camp Detail Sheet

struct CampDetailSheet: View {
    let camp: CampSite

    var body: some View {
        NavigationStack {
            List {
                Section {
                    LabeledContent("Day", value: "\(camp.day + 1)")
                    LabeledContent("Mile", value: String(format: "%.1f", camp.routeMile))
                    LabeledContent("Distance", value: String(format: "%.1f mi", camp.distance))
                    LabeledContent("Start Elevation", value: camp.startElevation)
                    LabeledContent("End Elevation", value: camp.endElevation)
                }

                if !camp.segment.isEmpty {
                    Section("Segment Description") {
                        Text(camp.segment)
                            .font(.body)
                    }
                }

                if !camp.notes.isEmpty {
                    Section("Notes") {
                        Text(camp.notes)
                            .font(.body)
                    }
                }
            }
            .navigationTitle(camp.name)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    TrailMapView(hoverPoint: .constant(nil))
        .modelContainer(for: [CampSite.self, TrailPoint.self, WaterSource.self], inMemory: true)
}
