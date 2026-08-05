import SwiftUI
import MapKit
import SwiftData

struct TrailMapView: View {
    private enum MapScope: String, CaseIterable, Identifiable {
        case trail = "Trail Detail"
        case circuit = "Full Circuit"

        var id: Self { self }
    }

    @Binding var hoverPoint: HoverPoint?
    @Binding var selectedDay: Int?
    let waterConditions: [TrailWaterCondition]
    let waterReportUpdatedText: String?
    let waterSnapshotFetchedAt: Date?
    let waterSourceURL: String?
    
    @Query(sort: \CampSite.day) private var camps: [CampSite]
    @Query(sort: \TrailPoint.index) private var trailPoints: [TrailPoint]
    @Query private var waterSources: [WaterSource]

    @State private var selectedCamp: CampSite?
    @State private var selectedWater: WaterSource?
    @State private var selectedZone: ConnectivityZone?
    @State private var mapStyle: MapStyle = .standard(elevation: .realistic)
    @State private var showWater = true
    @State private var showConnectivity = true
    @State private var showOwnership = false
    @State private var showOwnershipDetail = false
    @State private var selectedParcel: LandOwnership.Parcel?
    @StateObject private var locationAuthorizer = LocationAuthorizer()
    @State private var mapScope: MapScope = .circuit
    @State private var position: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 41.09, longitude: -121.77),
            span: MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
        )
    )
    
    @State private var campbellToSJC: MKRoute?

    private let arrivalDriveRoute = DriveRouteData.arrival
    private let extractionDriveRoute = DriveRouteData.extraction

    var body: some View {
        ZStack {
            Map(position: $position, selection: $selectedCamp) {
                // Where you actually are. GPS is satellite-based and keeps
                // working with no cell service, so this dot stays live for the
                // whole trip even where the basemap tiles do not load.
                UserAnnotation()

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
                    // Land ownership sits beneath the route so the trail,
                    // camps, and water stay legible on top of the fills.
                    //
                    // Culled at Full Circuit scope: that view spans the whole
                    // California drive, where 127 parcel polygons are both
                    // invisible and pure render cost. They only carry meaning
                    // at trail zoom, where "may I stop here" is a real question.
                    if showOwnership, mapScope == .trail {
                        ForEach(LandOwnership.parcels) { parcel in
                            ForEach(Array(parcel.polygons.enumerated()), id: \.offset) { _, ring in
                                MapPolygon(coordinates: ring)
                                    .foregroundStyle(ownershipFill(for: parcel.category))
                                    .stroke(ownershipStroke(for: parcel.category), lineWidth: 1)
                            }
                        }
                    }

                    // Trail route colored by day
                    ForEach(computedSegments, id: \.day) { segment in
                        MapPolyline(coordinates: segment.coordinates)
                            .stroke(segment.color, lineWidth: 3)
                    }

                    // Fallback: if no day segments, show whole route
                    if computedSegments.isEmpty, trailPoints.count > 1 {
                        MapPolyline(coordinates: trailPoints.map(\.coordinate))
                            .stroke(.blue, lineWidth: 3)
                    }
                    
                    // Drive-in route: Campbell → SJC → Burney Falls.
                    if let campbellToSJC {
                        MapPolyline(campbellToSJC)
                            .stroke(
                                .blue.opacity(0.68),
                                style: StrokeStyle(
                                    lineWidth: 3,
                                    lineCap: .round,
                                    dash: [8, 6]
                                )
                            )
                    }

                    if let arrivalDriveRoute {
                        MapPolyline(coordinates: arrivalDriveRoute.coordinates)
                            .stroke(
                                .blue.opacity(0.68),
                                style: StrokeStyle(
                                    lineWidth: 3,
                                    lineCap: .round,
                                    dash: [8, 6]
                                )
                            )
                    }

                    // Drive-home route: Ash Camp → Campbell.
                    if let extractionDriveRoute {
                        MapPolyline(coordinates: extractionDriveRoute.coordinates)
                            .stroke(
                                .teal.opacity(0.78),
                                style: StrokeStyle(
                                    lineWidth: 3,
                                    lineCap: .round,
                                    dash: [6, 5]
                                )
                            )
                    }

                    // Camp markers
                    ForEach(camps) { camp in
                        Annotation(camp.name, coordinate: camp.coordinate) {
                            Button {
                                selectedCamp = camp
                            } label: {
                                campMarker(for: camp)
                            }
                            .buttonStyle(.plain)
                            .frame(width: 36, height: 36)
                            .contentShape(Circle())
                            .accessibilityLabel("\(camp.name) itinerary stop details")
                        }
                        .tag(camp)
                    }

                    // Water source markers
                    if showWater {
                        ForEach(waterSources) { source in
                            Annotation(source.name, coordinate: source.coordinate) {
                                Button {
                                    selectedWater = source
                                } label: {
                                    waterMarker(for: source)
                                }
                                .buttonStyle(.plain)
                                .frame(width: 36, height: 36)
                                .contentShape(Circle())
                            }
                        }
                    }
                    
                    // Connectivity markers (cell towers)
                    if showConnectivity {
                        ForEach(connectivityZones) { zone in
                            Annotation(zone.name, coordinate: CLLocationCoordinate2D(latitude: zone.latitude, longitude: zone.longitude)) {
                                Button {
                                    selectedZone = zone
                                } label: {
                                    connectivityMarker(for: zone)
                                }
                                .buttonStyle(.plain)
                                .frame(width: 36, height: 36)
                                .contentShape(Circle())
                                .accessibilityLabel("\(zone.name) connectivity details")
                            }
                            
                            let radius = coverageRadius(for: zone)
                            if radius > 0 {
                                MapCircle(
                                    center: CLLocationCoordinate2D(latitude: zone.latitude, longitude: zone.longitude),
                                    radius: radius
                                )
                                .foregroundStyle(Color.purple.opacity(0.15))
                                .stroke(Color.purple.opacity(0.40), lineWidth: 1.5)
                            }
                        }
                    }
                }
                .mapStyle(mapStyle)
                // No .mapControls here on purpose. MapKit places them in the
                // top-trailing corner, which is exactly where the custom
                // toggle stack lives, so the location button landed on top of
                // the basemap button and was awkward to hit. It is rendered
                // inside that stack instead, where it gets the same tap target
                // as every other control.
                .onAppear {
                    locationAuthorizer.requestIfNeeded()
                }
                .sheet(isPresented: $showOwnershipDetail) {
                    ownershipDetailSheet
                }
                .onChange(of: selectedDay) { _, newDay in
                    if let newDay {
                        mapScope = .trail
                        focusOnDay(newDay)
                    } else {
                        focusOnMapScope()
                    }
                }

                // Controls
                VStack {
                    HStack(alignment: .top) {
                        mapScopePicker

                        Spacer()

                        // Trailing alignment, not the default centre. The
                        // legend and the location warning are far wider than
                        // the 44pt buttons, so a centred stack re-centres every
                        // button the moment either appears and the whole column
                        // visibly jumps sideways. Pinning to the trailing edge
                        // keeps the buttons still and lets the wide panels
                        // extend leftward instead.
                        VStack(alignment: .trailing, spacing: 8) {
                            locateMeButton
                            mapStylePicker
                            waterToggle
                            connectivityToggle
                            ownershipToggle
                            if showOwnership {
                                ownershipLegend
                                    .transition(.opacity.combined(with: .scale(scale: 0.95, anchor: .topTrailing)))
                            }
                            if let reason = locationAuthorizer.unavailableReason {
                                Text(reason)
                                    .font(.caption2)
                                    .foregroundStyle(.orange)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .padding(8)
                                    .frame(maxWidth: 260, alignment: .leading)
                                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
                            }
                        }
                    }

                    Spacer()

                    routeLegend
                        .padding(.bottom, 26)
                }
                .padding(8)
            }
            .sheet(isPresented: Binding(
                get: { selectedCamp != nil },
                set: { if !$0 { selectedCamp = nil } }
            )) {
                if let camp = selectedCamp {
                    CampDetailSheet(camp: camp)
                        .presentationDetents([.medium])
                }
            }
            .sheet(item: $selectedWater) { source in
                WaterDetailSheet(
                    source: source,
                    mile: source.routeMile > 0 ? source.routeMile : calculateMile(for: source),
                    liveCondition: liveCondition(for: source),
                    reportUpdatedText: waterReportUpdatedText,
                    snapshotFetchedAt: waterSnapshotFetchedAt,
                    sourceURL: waterSourceURL
                )
                    .presentationDetents([.medium, .large])
            }
            .sheet(item: $selectedZone) { zone in
                ConnectivityDetailSheet(zone: zone)
                    .presentationDetents([.medium])
            }
            .onAppear {
                print("DEBUG [TrailMapView]: Mounted on screen. Camps database count: \(camps.count) | TrailPoints database count: \(trailPoints.count) | WaterSources database count: \(waterSources.count)")
                calculateCampbellToSJCRoute()
                focusOnMapScope()
            }
            .task(id: trailPoints.count) {
                if !camps.isEmpty && trailPoints.count > 1 && computedSegments.isEmpty {
                    computeSegments()
                }
                if trailPoints.count > 1 {
                    focusOnMapScope()
                }
            }
        }

    // MARK: - Day Segments

    private struct DaySegment {
        let day: Int
        let coordinates: [CLLocationCoordinate2D]
        let hexColor: String
        
        @MainActor
        var color: Color {
            hexColor.isEmpty ? .blue : Color(hex: hexColor)
        }
    }

    @State private var computedSegments: [DaySegment] = []

    // Local Sendable structs to cross actor boundary
    private struct SimpleTrailPoint: Sendable {
        let coordinate: CLLocationCoordinate2D
        let routeMile: Double
    }

    private func computeSegments() {
        guard !camps.isEmpty, trailPoints.count > 1 else { return }

        let simpleTPs = trailPoints.map {
            SimpleTrailPoint(coordinate: $0.coordinate, routeMile: $0.routeMile)
        }
        let colors = dayColors.map { $0.stroke }
        let profiles = TrailConstants.dayProfiles

        // Build each map segment from the exact PCTA-calibrated route miles.
        // Camps and the Bartle transfer pin are intentionally shown at real
        // field coordinates, which can be hundreds of feet off-trail; they must
        // never bend or jump the colored trail line away from the centerline.
        Task.detached {
            var segments: [DaySegment] = []

            for profile in profiles {
                guard
                    let startIndex = Self.nearestPointIndex(
                        atRouteMile: profile.routeMileStart,
                        in: simpleTPs
                    ),
                    let endIndex = Self.nearestPointIndex(
                        atRouteMile: profile.routeMileEnd,
                        in: simpleTPs
                    ),
                    startIndex <= endIndex
                else {
                    continue
                }

                let colorIndex = max(0, profile.day - 1)
                let hexString = colorIndex < colors.count ? colors[colorIndex] : ""
                let coords = simpleTPs[startIndex...endIndex].map(\.coordinate)
                
                if coords.count > 1 {
                    segments.append(
                        DaySegment(
                            day: profile.day,
                            coordinates: coords,
                            hexColor: hexString
                        )
                    )
                }
            }

            let finalSegments = segments
            await MainActor.run {
                self.computedSegments = finalSegments
                if let selectedDay {
                    self.focusOnDay(selectedDay)
                } else {
                    self.focusOnMapScope()
                }
            }
        }
    }

    nonisolated private static func nearestPointIndex(
        atRouteMile routeMile: Double,
        in points: [SimpleTrailPoint]
    ) -> Int? {
        points.indices.min { first, second in
            abs(points[first].routeMile - routeMile)
                < abs(points[second].routeMile - routeMile)
        }
    }
    
    private func calculateCampbellToSJCRoute() {
        // Geocoded from the street address via the US Census geocoder
        // (Public_AR_Current). The previous 37.2625, -121.9331 was 0.69 mi
        // southeast of the house and plotted in the Camden Park shopping
        // center.
        let campbell = CLLocation(latitude: 37.271044, longitude: -121.939501)
        let sjc = CLLocation(latitude: 37.3639, longitude: -121.9289)
        
        let request = MKDirections.Request()
        request.source = MKMapItem(location: campbell, address: nil)
        request.destination = MKMapItem(location: sjc, address: nil)
        request.transportType = .automobile
        
        Task {
            let response = try? await MKDirections(request: request).calculate()
            await MainActor.run {
                self.campbellToSJC = response?.routes.first
                self.focusOnMapScope()
            }
        }
    }

    private func calculateMile(for source: WaterSource) -> Double {
        guard !trailPoints.isEmpty else { return 0.0 }
        var nearest = trailPoints[0]
        var bestDist = Double.greatestFiniteMagnitude
        for tp in trailPoints {
            let d = pow(tp.latitude - source.latitude, 2) + pow(tp.longitude - source.longitude, 2)
            if d < bestDist {
                bestDist = d
                nearest = tp
            }
        }
        return nearest.routeMile
    }

    // MARK: - Focus Map

    private func focusOnMapScope() {
        let coordinates: [CLLocationCoordinate2D]
        let padding: Double

        switch mapScope {
        case .trail:
            coordinates = trailPoints.map(\.coordinate)
            padding = 15_000
        case .circuit:
            coordinates =
                trailPoints.map(\.coordinate) +
                (arrivalDriveRoute?.coordinates ?? []) +
                (extractionDriveRoute?.coordinates ?? [])
            padding = 50_000
        }

        var rect = mapRect(for: coordinates)
        if mapScope == .circuit, let campbellToSJC {
            rect = rect.union(campbellToSJC.polyline.boundingMapRect)
        }

        guard !rect.isNull, !rect.isEmpty else { return }
        let paddedRect: MKMapRect
        if mapScope == .circuit {
            paddedRect = rect.insetBy(
                dx: -max(padding, rect.width * 0.10),
                dy: -max(padding, rect.height * 0.20)
            )
        } else {
            paddedRect = rect.insetBy(dx: -padding, dy: -padding)
        }

        withAnimation(.easeInOut(duration: 0.8)) {
            position = .rect(paddedRect)
        }
    }

    private func mapRect(for coordinates: [CLLocationCoordinate2D]) -> MKMapRect {
        coordinates.reduce(MKMapRect.null) { partial, coordinate in
            let point = MKMapPoint(coordinate)
            return partial.union(MKMapRect(x: point.x, y: point.y, width: 1, height: 1))
        }
    }
    
    private func focusOnDay(_ day: Int) {
        let daySegment = computedSegments.first { $0.day == day }
        guard let segment = daySegment, !segment.coordinates.isEmpty else { return }
        
        let lats = segment.coordinates.map(\.latitude)
        let lons = segment.coordinates.map(\.longitude)
        let minLat = lats.min() ?? 0
        let maxLat = lats.max() ?? 0
        let minLon = lons.min() ?? 0
        let maxLon = lons.max() ?? 0
        
        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLon + maxLon) / 2
        )
        // Add padding to the span
        let span = MKCoordinateSpan(
            latitudeDelta: (maxLat - minLat) * 1.5 + 0.05,
            longitudeDelta: (maxLon - minLon) * 1.5 + 0.05
        )
        
        withAnimation(.easeInOut(duration: 1.0)) {
            position = .region(MKCoordinateRegion(center: center, span: span))
        }
    }

    // MARK: - Camp Marker

    @ViewBuilder
    private func campMarker(for camp: CampSite) -> some View {
        let icon: String = switch camp.type {
        case "Trailhead": "flag.fill"
        case "Finish":    "flag.checkered"
        case "Support Transfer": "arrow.left.arrow.right.circle.fill"
        case "Transit":   camp.name.contains("SJC") ? "airplane" : "car.fill"
        case "GasStation": "fuelpump.fill"
        default:          "tent.fill"
        }

        let dayColorIndex = max(0, camp.day - 1)
        let color: Color = switch camp.type {
        case "Transit": .orange
        case "GasStation": .green
        case "Trailhead": .green
        default: dayColorIndex < dayColors.count ? Color(hex: dayColors[dayColorIndex].stroke) : .blue
        }

        Image(systemName: icon)
            .font(.system(size: 8, weight: .bold))
            .frame(width: 20, height: 20)
            .background(color, in: Circle())
            .overlay(Circle().stroke(.white, lineWidth: 1.5))
            .shadow(color: .black.opacity(0.25), radius: 2)
            .foregroundStyle(.white)
            .scaleEffect(selectedDay == camp.day ? 1.3 : 1.0)
            .animation(.spring(), value: selectedDay)
    }

    // MARK: - Water Marker

    @ViewBuilder
    private func waterMarker(for source: WaterSource) -> some View {
        let live = liveCondition(for: source)
        Image(systemName: "drop.fill")
            .font(.system(size: 8, weight: .bold))
            .frame(width: 20, height: 20)
            .background(waterColor(live?.condition, fallback: source.reliability), in: Circle())
            .overlay(
                Circle().stroke(
                    live?.freshness?.lowercased() == "stale" ? .orange : .white,
                    lineWidth: live?.freshness?.lowercased() == "stale" ? 2 : 1.5
                )
            )
            .shadow(color: .black.opacity(0.22), radius: 2)
            .foregroundStyle(.white)
            .accessibilityLabel(waterAccessibilityLabel(source: source, live: live))
    }

    private func liveCondition(for source: WaterSource) -> TrailWaterCondition? {
        waterConditions.condition(
            waypoint: source.waypoint,
            pctMile: source.pctMile,
            name: source.name
        )
    }

    private func waterColor(_ condition: String?, fallback reliability: String) -> Color {
        switch condition?.lowercased() {
        case "flowing": return .blue
        case "limited": return .orange
        case "dry": return .red
        case "unknown": return .gray
        default: break
        }

        switch reliability.lowercased() {
        case "excellent": return .blue
        case "good":      return .cyan
        case "seasonal":  return .orange
        case "sketchy":   return .red
        default:          return .gray
        }
    }

    private func waterAccessibilityLabel(
        source: WaterSource,
        live: TrailWaterCondition?
    ) -> String {
        if let live {
            return "\(source.name), \(live.condition), \(live.freshness ?? "freshness unknown"). Tap for latest hiker report."
        }
        return "\(source.name), no matching live report. Tap for location details."
    }

    // MARK: - Style Picker

    private var mapScopePicker: some View {
        Picker("Map scope", selection: $mapScope) {
            ForEach(MapScope.allCases) { scope in
                Text(scope.rawValue).tag(scope)
            }
        }
        .pickerStyle(.segmented)
        .frame(width: 205)
        .padding(4)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        .onChange(of: mapScope) { _, newScope in
            if newScope == .circuit {
                selectedDay = nil
            }
            focusOnMapScope()
        }
    }

    private var routeLegend: some View {
        HStack(spacing: 10) {
            routeLegendItem("Drive In", color: .blue, icon: "car.fill")
            routeLegendItem("Hike", color: .purple, icon: "figure.hiking")
            routeLegendItem("Drive Home", color: .teal, icon: "house.fill")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(.regularMaterial, in: Capsule())
    }

    private func routeLegendItem(_ title: String, color: Color, icon: String) -> some View {
        Label(title, systemImage: icon)
            .font(.system(size: 9, weight: .bold))
            .foregroundStyle(color)
    }

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

    // MARK: - Locate Me

    /// Centres on the current GPS fix. Same 44pt-class tap target and material
    /// backing as the other controls, so it reads as part of the stack rather
    /// than a floating MapKit control with a different hit area.
    private var locateMeButton: some View {
        Button {
            guard locationAuthorizer.isAuthorized else {
                locationAuthorizer.requestIfNeeded()
                return
            }
            guard let fix = locationAuthorizer.lastFix else { return }
            withAnimation {
                position = .region(
                    MKCoordinateRegion(
                        center: fix.coordinate,
                        span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
                    )
                )
            }
        } label: {
            Image(systemName: locationAuthorizer.isAuthorized
                  ? "location.fill"
                  : "location.slash")
                .padding(10)
                .background(.regularMaterial, in: Circle())
                .foregroundStyle(locationAuthorizer.isAuthorized ? .teal : .secondary)
        }
        .accessibilityLabel("Center on my location")
    }

    // MARK: - Land Ownership

    private var ownershipToggle: some View {
        Button {
            withAnimation(.easeOut(duration: 0.18)) {
                showOwnership.toggle()
            }
            if !showOwnership { selectedParcel = nil }
        } label: {
            Image(systemName: showOwnership ? "map.fill" : "map")
                .padding(10)
                .background(.regularMaterial, in: Circle())
                .foregroundStyle(showOwnership ? .red : .secondary)
        }
        .accessibilityLabel(showOwnership ? "Hide land ownership" : "Show land ownership")
    }

    private func ownershipFill(for category: LandOwnership.Category) -> Color {
        switch category {
        case .publicLand: return Color.green.opacity(0.16)
        case .privateTimberland: return Color.red.opacity(0.34)
        case .privateOther: return Color.orange.opacity(0.34)
        case .tribal: return Color.purple.opacity(0.34)
        case .unknown: return Color.gray.opacity(0.34)
        }
    }

    private func ownershipStroke(for category: LandOwnership.Category) -> Color {
        switch category {
        case .publicLand: return Color.green.opacity(0.7)
        case .privateTimberland: return Color.red.opacity(0.8)
        case .privateOther: return Color.orange.opacity(0.8)
        case .tribal: return Color.purple.opacity(0.8)
        case .unknown: return Color.gray.opacity(0.8)
        }
    }

    /// Compact by default so it does not bury the map. The rule text and
    /// provenance stay one tap away rather than being cut — a caveat you
    /// cannot reach is a caveat that does not exist.
    private var ownershipLegend: some View {
        VStack(alignment: .leading, spacing: 5) {
            // Never let the layer read as "no private land here" simply
            // because it is not being drawn at this zoom.
            if mapScope != .trail {
                Button {
                    withAnimation { mapScope = .trail }
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Hidden at Full Circuit")
                            .font(.caption2.bold())
                        Text("Tap to switch to Trail Detail")
                            .font(.caption2)
                    }
                    .foregroundStyle(.orange)
                    .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.bottom, 2)
            }

            ForEach(
                [
                    (LandOwnership.Category.publicLand, "Public — camp OK"),
                    (.privateTimberland, "Timberland — no stopping"),
                    (.privateOther, "Other private"),
                    (.tribal, "Tribal"),
                ],
                id: \.0
            ) { category, caption in
                HStack(spacing: 5) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(ownershipFill(for: category))
                        .overlay(
                            RoundedRectangle(cornerRadius: 2)
                                .stroke(ownershipStroke(for: category), lineWidth: 1)
                        )
                        .frame(width: 10, height: 10)
                    Text(caption)
                        .font(.caption2)
                }
            }

            if LandOwnership.parcels.isEmpty {
                Text("Parcel data failed to load — a blank map is not public land.")
                    .font(.caption2.bold())
                    .foregroundStyle(.orange)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Button {
                showOwnershipDetail = true
            } label: {
                Label("Rules & source", systemImage: "info.circle")
                    .font(.caption2)
            }
            .padding(.top, 1)
        }
        .padding(8)
        .frame(maxWidth: 170, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 9))
    }

    /// Full, unabridged rule and provenance text.
    private var ownershipDetailSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(
                        [
                            LandOwnership.Category.publicLand,
                            .privateTimberland,
                            .privateOther,
                            .tribal,
                        ],
                        id: \.self
                    ) { category in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 8) {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(ownershipFill(for: category))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 3)
                                            .stroke(ownershipStroke(for: category), lineWidth: 1)
                                    )
                                    .frame(width: 16, height: 16)
                                Text(category.label)
                                    .font(.subheadline.bold())
                            }
                            Text(category.rule)
                                .font(.footnote)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }

                    Divider()

                    if let source = LandOwnership.sourceDescription {
                        Text(source)
                            .font(.footnote)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if let generatedAt = LandOwnership.generatedAt {
                        Text("Generated \(generatedAt) · \(LandOwnership.parcels.count) parcels")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    if let caveat = LandOwnership.caveat {
                        Text(caveat)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding()
            }
            .navigationTitle("Land ownership")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { showOwnershipDetail = false }
                }
            }
        }
    }

    // MARK: - Connectivity Toggle

    private var connectivityToggle: some View {
        Button {
            showConnectivity.toggle()
        } label: {
            Image(systemName: showConnectivity ? "antenna.radiowaves.left.and.right" : "antenna.radiowaves.left.and.right.slash")
                .padding(10)
                .background(.regularMaterial, in: Circle())
                .foregroundStyle(showConnectivity ? .purple : .secondary)
        }
    }
    
    @ViewBuilder
    private func connectivityMarker(for zone: ConnectivityZone) -> some View {
        let hasSignal = zone.cellCoverage.verizon != "none" || zone.cellCoverage.att != "none" || zone.cellCoverage.tmobile != "none"
        Image(systemName: hasSignal ? "antenna.radiowaves.left.and.right" : "antenna.radiowaves.left.and.right.slash")
            .font(.system(size: 6.5, weight: .bold))
            .frame(width: 18, height: 18)
            .background(hasSignal ? .purple : .red.opacity(0.8), in: Circle())
            .overlay(Circle().stroke(.white, lineWidth: 1))
            .shadow(color: .black.opacity(0.2), radius: 1.5)
            .foregroundStyle(.white)
    }

    private func coverageRadius(for zone: ConnectivityZone) -> Double {
        let coverages = [zone.cellCoverage.verizon, zone.cellCoverage.att, zone.cellCoverage.tmobile]
        var maxRadiusMiles = 0.0
        for coverage in coverages {
            let r: Double = switch coverage.lowercased() {
            case "excellent": 8.0
            case "good":      4.0
            case "fair":      2.0
            case "spotty":    0.8
            default:          0.0
            }
            if r > maxRadiusMiles { maxRadiusMiles = r }
        }
        return maxRadiusMiles * 1609.34
    }
}

// MARK: - Camp Detail Sheet

struct CampDetailSheet: View {
    let camp: CampSite

    var body: some View {
        NavigationStack {
            List {
                Section(camp.stopType == "support-transfer" ? "Day 3 Pickup & Day 4 Re-entry" : "Itinerary Stop Details") {
                        LabeledContent("Day", value: "\(camp.day)")
                        LabeledContent("Mile", value: String(format: "%.1f", camp.routeMile))
                        LabeledContent("Distance", value: String(format: "%.1f mi", camp.distance))
                        LabeledContent(
                            "Stop Type",
                            value: camp.stopType == "support-transfer"
                                ? "Planned pickup / re-entry"
                                : camp.type
                        )
                        LabeledContent(
                            "Pack Mode",
                            value: camp.packMode == "day-pack-supported" ? "Supported day pack" : "Overnight pack"
                        )
                        LabeledContent("Start Elevation", value: camp.startElevation)
                        LabeledContent("End Elevation", value: camp.endElevation)

                        if camp.stopType == "support-transfer" {
                            Text("This is not a campsite and it is not an optional emergency shortcut. Private timberland rules prohibit camping through this corridor, so the working itinerary is: Mikaela picks you up at this exact Bartle Gap pin after Day 3, you sleep legally off-corridor, and she returns you to the same pin for Day 4. Vehicle access and any gate constraints still must be confirmed before departure.")
                                .font(.callout)
                                .foregroundStyle(.secondary)
                        }
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

                Section {
                    Button {
                        let location = CLLocation(latitude: camp.latitude, longitude: camp.longitude)
                        let mapItem = MKMapItem(location: location, address: nil)
                        mapItem.name = camp.name
                        mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
                    } label: {
                        HStack {
                            Spacer()
                            Image(systemName: "safari.fill")
                            Text("Open in Apple Maps")
                            Spacer()
                        }
                        .foregroundStyle(.blue)
                    }
                }
            }
            .navigationTitle(camp.name)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct WaterDetailSheet: View {
    let source: WaterSource
    let mile: Double
    let liveCondition: TrailWaterCondition?
    let reportUpdatedText: String?
    let snapshotFetchedAt: Date?
    let sourceURL: String?

    private var statusColor: Color {
        switch liveCondition?.condition.lowercased() {
        case "flowing": return .blue
        case "limited": return .orange
        case "dry": return .red
        default: return .secondary
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Current Reported Condition") {
                    LabeledContent("Location", value: source.name)
                    LabeledContent("Mile Marker", value: String(format: "Mile %.1f", mile))
                    if source.pctMile > 0 {
                        LabeledContent("PCT Mile", value: String(format: "%.2f", source.pctMile))
                    }
                    
                    HStack {
                        Text("Latest Status")
                        Spacer()
                        Text((liveCondition?.condition ?? "NO LIVE MATCH").uppercased())
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(statusColor.opacity(0.15), in: RoundedRectangle(cornerRadius: 6))
                            .foregroundStyle(statusColor)
                    }

                    if let liveCondition {
                        LabeledContent("Observed", value: liveCondition.reportDate ?? "Date not parsed")
                        if let ageDays = liveCondition.ageDays {
                            LabeledContent("Report Age", value: ageDays == 0 ? "Today" : "\(ageDays) day\(ageDays == 1 ? "" : "s") old")
                        }
                        LabeledContent("Freshness", value: (liveCondition.freshness ?? "unknown").capitalized)
                        if let reportedBy = liveCondition.reportedBy, !reportedBy.isEmpty {
                            LabeledContent("Reported By", value: reportedBy)
                        }
                    }
                }

                Section("Latest Hiker Observation") {
                    Text(
                        liveCondition?.latestReport
                            ?? source.notes
                            ?? "No dated hiker observation matched this bundled location."
                    )
                    .font(.body)
                    .textSelection(.enabled)

                    if let reportUpdatedText, !reportUpdatedText.isEmpty {
                        LabeledContent("PCT Sheet", value: reportUpdatedText)
                    }
                    if let snapshotFetchedAt {
                        LabeledContent(
                            "App Checked",
                            value: snapshotFetchedAt.formatted(date: .abbreviated, time: .shortened)
                        )
                    }
                    LabeledContent("Data Source", value: "PCT Water Report")
                }

                Section("How to Read This") {
                    Text("The app checks daily for new location-specific hiker observations. These are not instrumented stream gauges: “flowing,” “limited,” and “dry” summarize the latest dated field report, not a measured water depth. Treat old or unknown reports as unverified and carry a safety reserve.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }

                Section {
                    if let sourceURL, let url = URL(string: sourceURL) {
                        Link(destination: url) {
                            Label("Open Full PCT Water Report", systemImage: "doc.text.magnifyingglass")
                                .frame(maxWidth: .infinity)
                        }
                    }

                    Button {
                        let location = CLLocation(latitude: source.latitude, longitude: source.longitude)
                        let mapItem = MKMapItem(location: location, address: nil)
                        mapItem.name = source.name
                        mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
                    } label: {
                        HStack {
                            Spacer()
                            Image(systemName: "safari.fill")
                            Text("Open in Apple Maps")
                            Spacer()
                        }
                        .foregroundStyle(.blue)
                    }
                }
            }
            .navigationTitle(source.name)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct ConnectivityDetailSheet: View {
    let zone: ConnectivityZone

    private var satelliteBadgeColor: Color {
        zone.satelliteCompatible ? .green : .red
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Connectivity Details") {
                    LabeledContent("Signal Area", value: zone.name)
                    LabeledContent("Mile Location", value: String(format: "Mile %.1f", zone.mile))
                    
                    HStack {
                        Text("Satellite Access")
                        Spacer()
                        Text(zone.satelliteCompatible ? "COMPATIBLE" : "UNAVAILABLE")
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(satelliteBadgeColor.opacity(0.15), in: RoundedRectangle(cornerRadius: 6))
                            .foregroundStyle(satelliteBadgeColor)
                    }
                }
                
                Section("Carrier Coverage Breakdown") {
                    LabeledContent("Verizon", value: zone.cellCoverage.verizon.uppercased())
                    LabeledContent("AT&T", value: zone.cellCoverage.att.uppercased())
                    LabeledContent("T-Mobile", value: zone.cellCoverage.tmobile.uppercased())
                }
                
                if !zone.notes.isEmpty {
                    Section("Safety & Check-in Notes") {
                        Text(zone.notes)
                            .font(.body)
                    }
                }
                
                Section {
                    Button {
                        let location = CLLocation(latitude: zone.latitude, longitude: zone.longitude)
                        let mapItem = MKMapItem(location: location, address: nil)
                        mapItem.name = zone.name
                        mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
                    } label: {
                        HStack {
                            Spacer()
                            Image(systemName: "safari.fill")
                            Text("Open in Apple Maps")
                            Spacer()
                        }
                        .foregroundStyle(.blue)
                    }
                }
            }
            .navigationTitle(zone.name)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    TrailMapView(
        hoverPoint: .constant(nil),
        selectedDay: .constant(1),
        waterConditions: [],
        waterReportUpdatedText: nil,
        waterSnapshotFetchedAt: nil,
        waterSourceURL: nil
    )
        .modelContainer(for: [CampSite.self, TrailPoint.self, WaterSource.self], inMemory: true)
}
