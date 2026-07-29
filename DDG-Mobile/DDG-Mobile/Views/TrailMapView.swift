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
    
    @Query(sort: \CampSite.day) private var camps: [CampSite]
    @Query(sort: \TrailPoint.index) private var trailPoints: [TrailPoint]
    @Query private var waterSources: [WaterSource]

    @State private var selectedCamp: CampSite?
    @State private var selectedWater: WaterSource?
    @State private var selectedZone: ConnectivityZone?
    @State private var mapStyle: MapStyle = .standard(elevation: .realistic)
    @State private var showWater = true
    @State private var showConnectivity = true
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
                            campMarker(for: camp)
                        }
                        .tag(camp)
                    }

                    // Water source markers
                    if showWater {
                        ForEach(waterSources) { source in
                            Annotation(source.name, coordinate: source.coordinate) {
                                waterMarker(for: source)
                                    .onTapGesture {
                                        selectedWater = source
                                    }
                            }
                        }
                    }
                    
                    // Connectivity markers (cell towers)
                    if showConnectivity {
                        ForEach(connectivityZones) { zone in
                            Annotation(zone.name, coordinate: CLLocationCoordinate2D(latitude: zone.latitude, longitude: zone.longitude)) {
                                connectivityMarker(for: zone)
                                    .onTapGesture {
                                        selectedZone = zone
                                    }
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

                        VStack(spacing: 8) {
                            mapStylePicker
                            waterToggle
                            connectivityToggle
                        }
                    }

                    Spacer()

                    routeLegend
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
                WaterDetailSheet(source: source, mile: calculateMile(for: source))
                    .presentationDetents([.medium])
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
    }

    private struct SimpleStop: Sendable {
        let day: Int
        let coordinate: CLLocationCoordinate2D
    }

    private func computeSegments() {
        guard !camps.isEmpty, trailPoints.count > 1 else { return }

        let simpleTPs = trailPoints.map { SimpleTrailPoint(coordinate: $0.coordinate) }
        let stops = camps
            .filter { (0...8).contains($0.day) }
            .map { SimpleStop(day: $0.day, coordinate: $0.coordinate) }
            .sorted { $0.day < $1.day }
        let colors = dayColors.map { $0.stroke }
        let profiles = TrailConstants.dayProfiles

        // Build each map segment between the exact itinerary stop coordinates.
        // This avoids drifting day colors when the Garmin track mileage differs
        // slightly from the official PCTA endpoint mileage.
        Task.detached {
            var segments: [DaySegment] = []

            for profile in profiles {
                guard
                    let startStop = stops.first(where: { $0.day == profile.day - 1 }),
                    let endStop = stops.first(where: { $0.day == profile.day }),
                    let startIndex = Self.nearestPointIndex(
                        to: startStop.coordinate,
                        in: simpleTPs
                    ),
                    let endIndex = Self.nearestPointIndex(
                        to: endStop.coordinate,
                        in: simpleTPs
                    ),
                    startIndex <= endIndex
                else {
                    continue
                }

                let colorIndex = max(0, profile.day - 1)
                let hexString = colorIndex < colors.count ? colors[colorIndex] : ""
                var coords = [startStop.coordinate]
                coords.append(contentsOf: simpleTPs[startIndex...endIndex].map(\.coordinate))
                coords.append(endStop.coordinate)
                
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
        to coordinate: CLLocationCoordinate2D,
        in points: [SimpleTrailPoint]
    ) -> Int? {
        points.indices.min { first, second in
            let firstLatitude = points[first].coordinate.latitude - coordinate.latitude
            let firstLongitude = points[first].coordinate.longitude - coordinate.longitude
            let secondLatitude = points[second].coordinate.latitude - coordinate.latitude
            let secondLongitude = points[second].coordinate.longitude - coordinate.longitude
            return firstLatitude * firstLatitude + firstLongitude * firstLongitude
                < secondLatitude * secondLatitude + secondLongitude * secondLongitude
        }
    }
    
    private func calculateCampbellToSJCRoute() {
        let campbell = CLLocation(latitude: 37.2625, longitude: -121.9331)
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
        var tempPoints: [Double] = []
        var cumulativeDist: Double = 0
        for i in 0..<trailPoints.count {
            let tp = trailPoints[i]
            if i > 0 {
                let prev = trailPoints[i-1]
                let dx = tp.longitude - prev.longitude
                let dy = tp.latitude - prev.latitude
                let distDeg = (dx * dx + dy * dy).squareRoot()
                cumulativeDist += distDeg * 69.0
            }
            tempPoints.append(cumulativeDist)
        }
        
        var bestIdx = 0
        var bestDist = Double.greatestFiniteMagnitude
        for (i, tp) in trailPoints.enumerated() {
            let d = pow(tp.latitude - source.latitude, 2) + pow(tp.longitude - source.longitude, 2)
            if d < bestDist {
                bestDist = d
                bestIdx = i
            }
        }
        return tempPoints[bestIdx]
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
            .font(.caption)
            .padding(6)
            .background(color, in: Circle())
            .overlay(Circle().stroke(.white, lineWidth: 2))
            .shadow(color: .black.opacity(0.3), radius: 3)
            .foregroundStyle(.white)
            .scaleEffect(selectedDay == camp.day ? 1.3 : 1.0)
            .animation(.spring(), value: selectedDay)
    }

    // MARK: - Water Marker

    @ViewBuilder
    private func waterMarker(for source: WaterSource) -> some View {
        Image(systemName: "drop.fill")
            .font(.caption2)
            .padding(4)
            .background(waterColor(source.reliability), in: Circle())
            .overlay(Circle().stroke(.white, lineWidth: 1.5))
            .shadow(color: .black.opacity(0.2), radius: 2)
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
            .font(.system(size: 8))
            .padding(4)
            .background(hasSignal ? .purple : .red.opacity(0.8), in: Circle())
            .overlay(Circle().stroke(.white, lineWidth: 1.5))
            .shadow(color: .black.opacity(0.2), radius: 2)
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
    @State private var gasPricePerGallon: Double? = nil

    // 2024 Kia Sportage X-Pro Prestige (Gas) - 26 Highway MPG
    let assumedMPG: Double = 26.0

    let gasStops = [
        GasStop(
            name: "Vacaville Gas Station",
            brand: "Costco",
            address: "2151 E Monte Vista Ave, Vacaville, CA 95688",
            hours: "6:00 AM - 9:30 PM",
            phone: "(707) 453-7315",
            pumps: 30,
            amenities: ["Membership Required", "Pay at Pump Only", "High-Flow Diesel"],
            priceDiscount: 0.58,
            coordinate: CLLocationCoordinate2D(latitude: 38.3566, longitude: -121.9877),
            milesFromStart: 78.0
        ),
        GasStop(
            name: "Redding Gas Station",
            brand: "Safeway",
            address: "2275 Pine St, Redding, CA 96001",
            hours: "5:00 AM - 10:00 PM",
            phone: "(530) 244-7043",
            pumps: 12,
            amenities: ["Rewards Discount Available", "Convenience Kiosk", "Air & Water"],
            priceDiscount: 0.32,
            coordinate: CLLocationCoordinate2D(latitude: 40.5865, longitude: -122.3917),
            milesFromStart: 227.0
        )
    ]
    
    let flights = [
        FlightInfo(
            flightNumber: "UA481",
            carrier: "United Airlines",
            origin: "Chicago O'Hare (ORD)",
            originCode: "ORD",
            destination: "San Jose Mineta (SJC)",
            destinationCode: "SJC",
            departureTime: "Aug 28 • 8:00 PM CDT",
            arrivalTime: "Aug 28 • 10:36 PM PDT",
            duration: "4h 36m scheduled",
            status: "WORKING SCHEDULE — VERIFY BOOKING",
            terminalInfo: "Verify in United Manage Trip",
            aircraft: "Not yet verified",
            gate: "Check day-of-flight",
            baggageClaim: "Check SJC monitors",
            onboardServices: [],
            delayStats: "Build 45–60 minutes for bags and loading"
        ),
        FlightInfo(
            flightNumber: "UA1317",
            carrier: "United Airlines",
            origin: "San Jose Mineta (SJC)",
            originCode: "SJC",
            destination: "Chicago O'Hare (ORD)",
            destinationCode: "ORD",
            departureTime: "Sep 7 • 6:40 AM PDT",
            arrivalTime: "Sep 7 • 11:00 AM CDT",
            duration: "4h 20m scheduled",
            status: "WORKING SCHEDULE — VERIFY BOOKING",
            terminalInfo: "Verify in United Manage Trip",
            aircraft: "Not yet verified",
            gate: "Check day-of-flight",
            baggageClaim: "Check destination monitors",
            onboardServices: [],
            delayStats: "Keep Sep 6 as the home/airport-buffer day"
        )
    ]

    var body: some View {
        NavigationStack {
            List {
                if camp.type == "GasStation" {
                    // Render Rich Gas Station Card
                    if let stop = gasStops.first(where: { $0.name.lowercased().contains(camp.name.lowercased()) || camp.name.lowercased().contains($0.name.lowercased()) }) {
                        let avgPrice = gasPricePerGallon ?? 5.38
                        let stopPrice = avgPrice - stop.priceDiscount
                        let stopGallons = stop.milesFromStart / assumedMPG
                        let fillCost = stopGallons * stopPrice
                        
                        Section("Gas Stop Details") {
                            LabeledContent("Brand", value: stop.brand)
                            LabeledContent("Address", value: stop.address)
                            LabeledContent("Hours", value: stop.hours)
                            LabeledContent("Phone", value: stop.phone)
                            LabeledContent("Pumps Available", value: "\(stop.pumps)")
                        }
                        
                        Section("Realtime Price & Fill Calculator") {
                            LabeledContent("Regular Price", value: String(format: "$%.2f/gal", stopPrice))
                            LabeledContent("Fuel Needed to Fill", value: String(format: "%.1f gal", stopGallons))
                            LabeledContent("Refuel Cost", value: String(format: "$%.2f", fillCost))
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Refuel calculations based on Sportage X-Pro 26 MPG.")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        
                        Section("Station Amenities") {
                            ForEach(stop.amenities, id: \.self) { amenity in
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(.purple)
                                    Text(amenity)
                                }
                            }
                        }
                    }
                } else if camp.type == "Transit" && camp.name.lowercased().contains("sjc") {
                    // Render Rich Flight Card
                    Section("Associated Flights") {
                        ForEach(flights) { flight in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(flight.flightNumber)
                                        .font(.subheadline.bold())
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(.blue.opacity(0.15), in: RoundedRectangle(cornerRadius: 4))
                                        .foregroundStyle(.blue)
                                    
                                    Spacer()
                                    
                                    Text(flight.status)
                                        .font(.caption.bold())
                                        .foregroundStyle(.green)
                                }
                                
                                Text("\(flight.originCode) ➜ \(flight.destinationCode)")
                                    .font(.headline)
                                Text("Times: \(flight.departureTime) ➜ \(flight.arrivalTime)")
                                    .font(.caption)
                                Text("Aircraft: \(flight.aircraft)")
                                    .font(.caption)
                                Text("Gate: \(flight.gate)")
                                    .font(.caption)
                                Text("Baggage Claim: \(flight.baggageClaim)")
                                    .font(.caption)
                                    
                                HStack(spacing: 4) {
                                    ForEach(flight.onboardServices, id: \.self) { service in
                                        Text(service)
                                            .font(.system(size: 8, weight: .semibold))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(.blue.opacity(0.1), in: Capsule())
                                            .foregroundStyle(.blue)
                                    }
                                }
                                .padding(.top, 2)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                } else if camp.type == "Transit" && camp.name.lowercased().contains("campbell") {
                    Section("Starting Location Details") {
                        LabeledContent("Address", value: "2800 Joseph Ave, Campbell, CA 95008")
                        LabeledContent("Role", value: "Trip start & shuttle pickup vehicle base")
                        Text("Mikaela will drive the Sportage from here to SJC to retrieve Dad and Drew before initiating the drive up I-5 to Burney Falls.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Section(camp.stopType == "support-transfer" ? "Support Transfer Details" : "Itinerary Stop Details") {
                        LabeledContent("Day", value: "\(camp.day)")
                        LabeledContent("Mile", value: String(format: "%.1f", camp.routeMile))
                        LabeledContent("Distance", value: String(format: "%.1f mi", camp.distance))
                        LabeledContent("Stop Type", value: camp.type)
                        LabeledContent(
                            "Pack Mode",
                            value: camp.packMode == "day-pack-supported" ? "Supported day pack" : "Overnight pack"
                        )
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
            .task {
                if camp.type == "GasStation" {
                    await fetchGasPrices()
                }
            }
        }
    }

    private func fetchGasPrices() async {
        guard let url = URL(string: "https://gasprices.aaa.com/?state=CA") else { return }
        var request = URLRequest(url: url)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15", forHTTPHeaderField: "User-Agent")
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let html = String(data: data, encoding: .utf8) {
                let cleanedHtml = html.replacingOccurrences(of: "\n", with: "").replacingOccurrences(of: "\r", with: "")
                let pattern = #"California Avg\.</p>\s*<p class="numb">\s*\$([0-9.]+)"#
                let regex = try NSRegularExpression(pattern: pattern, options: [.caseInsensitive])
                let nsrange = NSRange(cleanedHtml.startIndex..<cleanedHtml.endIndex, in: cleanedHtml)
                if let match = regex.firstMatch(in: cleanedHtml, range: nsrange) {
                    if let range = Range(match.range(at: 1), in: cleanedHtml) {
                        let priceStr = String(cleanedHtml[range]).trimmingCharacters(in: .whitespacesAndNewlines)
                        if let price = Double(priceStr) {
                            withAnimation { self.gasPricePerGallon = price }
                            return
                        }
                    }
                }
            }
        } catch {
            print("Gas price fetch error in sheet: \(error)")
        }
        withAnimation { self.gasPricePerGallon = 5.38 }
    }
}

struct WaterDetailSheet: View {
    let source: WaterSource
    let mile: Double

    private var reliabilityColor: Color {
        switch source.reliability.lowercased() {
        case "excellent": return .blue
        case "good": return .cyan
        case "seasonal": return .orange
        case "sketchy": return .red
        default: return .secondary
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Water Source Details") {
                    LabeledContent("Location", value: source.name)
                    LabeledContent("Mile Marker", value: String(format: "Mile %.1f", mile))
                    
                    HStack {
                        Text("Flow Reliability")
                        Spacer()
                        Text(source.reliability.uppercased())
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(reliabilityColor.opacity(0.15), in: RoundedRectangle(cornerRadius: 6))
                            .foregroundStyle(reliabilityColor)
                    }
                }
                
                Section("Latest Hiker Report") {
                    Text(source.notes ?? "No report notes available.")
                        .font(.body)
                        .padding(.vertical, 2)
                    
                    LabeledContent("Data Source", value: "PCT Water Report (pctwater.com)")
                }
                
                Section {
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
    TrailMapView(hoverPoint: .constant(nil), selectedDay: .constant(1))
        .modelContainer(for: [CampSite.self, TrailPoint.self, WaterSource.self], inMemory: true)
}
