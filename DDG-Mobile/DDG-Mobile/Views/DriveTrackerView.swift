import SwiftUI
import MapKit

struct GasStop: Identifiable, Sendable {
    let id = UUID()
    let name: String
    let brand: String
    let address: String
    let hours: String
    let phone: String
    let pumps: Int
    let amenities: [String]
    let priceDiscount: Double
    let coordinate: CLLocationCoordinate2D
    let milesFromStart: Double
}

struct FlightInfo: Identifiable, Sendable {
    let id = UUID()
    let flightNumber: String
    let carrier: String
    let origin: String
    let originCode: String
    let destination: String
    let destinationCode: String
    let departureTime: String
    let arrivalTime: String
    let duration: String
    let status: String
    let terminalInfo: String
    let aircraft: String
    let gate: String
    let baggageClaim: String
    let onboardServices: [String]
    let delayStats: String
}

private enum DriveMapMode: Int, CaseIterable, Identifiable {
    case arrival
    case end
    case full

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .arrival: "Arrival"
        case .end: "End Route"
        case .full: "Full Trip"
        }
    }

    var mapTitle: String {
        switch self {
        case .arrival: "Arrival Route · Campbell → SJC → Burney Falls"
        case .end: "End Route · Ash Camp → Campbell"
        case .full: "Complete Transit · ORD → Trail → Campbell"
        }
    }
}

private struct BundledDriveRoute: Decodable, Sendable {
    let name: String
    let type: String
    let path: [[Double]]
    let distanceMiles: Double
    let durationHours: Double
    let source: String

    var coordinates: [CLLocationCoordinate2D] {
        path.compactMap { pair in
            guard pair.count >= 2 else { return nil }
            return CLLocationCoordinate2D(latitude: pair[1], longitude: pair[0])
        }
    }

    static func loadAll() -> [BundledDriveRoute] {
        struct Root: Decodable {
            let driveSegments: [BundledDriveRoute]
        }

        guard let url = Bundle.main.url(forResource: "hike_data", withExtension: "json") else {
            print("ERROR [DriveTrackerView]: Bundled hike_data.json was not found.")
            return []
        }

        do {
            let data = try Data(contentsOf: url)
            return try JSONDecoder().decode(Root.self, from: data).driveSegments
        } catch {
            print("ERROR [DriveTrackerView]: Could not decode bundled drive routes: \(error)")
            return []
        }
    }
}

struct DriveTrackerView: View {
    @State private var campbellToSJC: MKRoute?
    @State private var isCalculating = false
    @State private var gasPricePerGallon: Double? = nil
    @State private var position: MapCameraPosition = .automatic
    @State private var mapMode: DriveMapMode = .arrival

    private let bundledDriveRoutes = BundledDriveRoute.loadAll()
    
    // 2024 Kia Sportage X-Pro Prestige (Gas) - 26 Highway MPG
    let assumedMPG: Double = 26.0
    
    let flightCoordinates = [
        CLLocationCoordinate2D(latitude: 41.9742, longitude: -87.9073), // Chicago (ORD)
        CLLocationCoordinate2D(latitude: 37.3639, longitude: -121.9289)  // San Jose (SJC)
    ]
    
    let gasStops = [
        GasStop(
            name: "Vacaville Costco Gas",
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
            name: "Redding Safeway Fuel",
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

    private var arrivalDriveRoute: BundledDriveRoute? {
        bundledDriveRoutes.first { $0.name == "SJC → Burney Falls" }
    }

    private var endDriveRoute: BundledDriveRoute? {
        bundledDriveRoutes.first { $0.name == "Ash Camp → Campbell" }
    }
    
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
            origin: "San José Mineta (SJC)",
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
        ScrollView {
            VStack(spacing: 16) {
                // Header Title
                VStack(alignment: .leading, spacing: 4) {
                    Text("Transit & Flight Control")
                        .font(.title2.bold())
                    Text("Burney Falls insertion and Ash Camp extraction")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                .padding(.top)
                
                // Map Selector Control
                Picker("Route", selection: $mapMode) {
                    ForEach(DriveMapMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .onChange(of: mapMode) {
                    updateMapPosition()
                }
                
                // MapKit Map
                Map(position: $position) {
                    if mapMode != .end {
                        Marker("Campbell Start", systemImage: "car.fill", coordinate: CLLocationCoordinate2D(latitude: 37.2625, longitude: -121.9331))
                            .tint(.blue)

                        Marker("SJC Airport", systemImage: "airplane", coordinate: CLLocationCoordinate2D(latitude: 37.3639, longitude: -121.9289))
                            .tint(.indigo)

                        Marker("Burney Falls (Drop-off)", systemImage: "flag.fill", coordinate: CLLocationCoordinate2D(latitude: 41.0135, longitude: -121.6207))
                            .tint(.green)

                        ForEach(gasStops) { stop in
                            Marker(stop.name, systemImage: "fuelpump.fill", coordinate: stop.coordinate)
                                .tint(.purple)
                        }

                        if let campbellToSJC {
                            MapPolyline(campbellToSJC)
                                .stroke(.indigo, lineWidth: 4)
                        }

                        if let arrivalDriveRoute {
                            MapPolyline(coordinates: arrivalDriveRoute.coordinates)
                                .stroke(.blue, lineWidth: 4)
                        }
                    }

                    if mapMode != .arrival {
                        Marker("Ash Camp Pickup", systemImage: "figure.hiking", coordinate: CLLocationCoordinate2D(latitude: 41.1170914, longitude: -122.0606252))
                            .tint(.orange)

                        Marker("Campbell Home", systemImage: "house.fill", coordinate: CLLocationCoordinate2D(latitude: 37.262499, longitude: -121.933129))
                            .tint(.green)

                        if let endDriveRoute {
                            MapPolyline(coordinates: endDriveRoute.coordinates)
                                .stroke(.orange, lineWidth: 4)
                        }
                    }

                    if mapMode == .full {
                        Marker("Chicago (ORD)", systemImage: "airplane.departure", coordinate: CLLocationCoordinate2D(latitude: 41.9742, longitude: -87.9073))
                            .tint(.teal)

                        MapPolyline(coordinates: flightCoordinates)
                            .stroke(.teal, style: StrokeStyle(lineWidth: 3, dash: [6, 6]))
                    }
                }
                .mapStyle(.standard(elevation: .flat, showsTraffic: true))
                .frame(height: 300)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.primary.opacity(0.1), lineWidth: 1)
                )
                .padding(.horizontal)

                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(mapMode.mapTitle)
                            .font(.caption.bold())
                        Text(routeSourceDescription)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Link(destination: liveRouteURL) {
                        Label("Open", systemImage: "arrow.up.right.square")
                            .font(.caption.bold())
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(mapMode == .end ? .orange : .blue)
                }
                .padding(.horizontal)
                
                // Gas & Car Stats Card
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "fuelpump.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.green)
                        Text("Mikaela's Shuttle Drive (Kia Sportage 2024)")
                            .font(.headline)
                        Spacer()
                        if isCalculating {
                            ProgressView().controlSize(.small)
                        }
                    }
                    
                    if let arrivalDriveRoute, let endDriveRoute {
                        let airportMiles = (campbellToSJC?.distance ?? 0) / 1609.344
                        let insertionMiles = airportMiles + arrivalDriveRoute.distanceMiles
                        let extractionMiles = endDriveRoute.distanceMiles
                        let totalMiles = insertionMiles + extractionMiles
                        let avgPrice = gasPricePerGallon ?? 5.38
                        let totalGallons = totalMiles / assumedMPG
                        let fuelCost = totalGallons * avgPrice
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                            gasBadge(title: "ARRIVAL DRIVE", value: String(format: "%.1f mi", insertionMiles), color: .blue)
                            gasBadge(title: "END ROUTE", value: String(format: "%.1f mi", extractionMiles), color: .orange)
                            gasBadge(title: "TOTAL SHUTTLE", value: String(format: "%.1f mi", totalMiles), color: .indigo)
                            gasBadge(title: "FUEL EST. @ $\(String(format: "%.2f", avgPrice))", value: String(format: "$%.2f", fuelCost), color: .green)
                        }

                        Text("Arrival and end-route mileage are separate routed legs. “Total shuttle” is their sum—not an outbound leg doubled as a fake round trip.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        
                        Divider().padding(.vertical, 4)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Recommended Gas Refuel Stops (Regular Unleaded)")
                                .font(.caption.bold())
                                .foregroundStyle(.secondary)
                            
                            ForEach(gasStops) { stop in
                                let stopPrice = avgPrice - stop.priceDiscount
                                let stopGallons = stop.milesFromStart / assumedMPG
                                let fillCost = stopGallons * stopPrice
                                
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        Image(systemName: "fuelpump.fill")
                                            .foregroundStyle(.purple)
                                            .font(.caption)
                                        Text(stop.name)
                                            .font(.caption.bold())
                                        Spacer()
                                        Text(String(format: "$%.2f/gal", stopPrice))
                                            .font(.caption.bold())
                                            .foregroundStyle(.green)
                                    }
                                    
                                    Text(stop.address)
                                        .font(.system(size: 10))
                                        .foregroundStyle(.secondary)
                                    
                                    HStack {
                                        Text("Hours: \(stop.hours) • Pumps: \(stop.pumps) • Phone: \(stop.phone)")
                                            .font(.system(size: 9))
                                            .foregroundStyle(.secondary)
                                        Spacer()
                                        Text(String(format: "Fill: %.1f gal (Cost: $%.2f)", stopGallons, fillCost))
                                            .font(.caption.bold())
                                            .foregroundStyle(.blue)
                                    }
                                    
                                    HStack(spacing: 4) {
                                        ForEach(stop.amenities, id: \.self) { amenity in
                                            Text(amenity)
                                                .font(.system(size: 8, weight: .semibold))
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(.purple.opacity(0.1), in: Capsule())
                                                .foregroundStyle(.purple)
                                        }
                                    }
                                    .padding(.top, 2)
                                }
                                .padding(10)
                                .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 8))
                            }
                        }
                    }
                }
                .padding()
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
                
                // Flight Status Card
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "airplane.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.blue)
                        Text("Dad & Drew Flight Tracker")
                            .font(.headline)
                        Spacer()
                    }
                    
                    ForEach(flights) { flight in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text(flight.flightNumber)
                                    .font(.subheadline.bold())
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(.blue.opacity(0.15), in: RoundedRectangle(cornerRadius: 4))
                                    .foregroundStyle(.blue)
                                
                                Text(flight.carrier)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                
                                Spacer()
                                
                                Text(flight.status)
                                    .font(.caption.bold())
                                    .foregroundStyle(.green)
                            }
                            
                            HStack(spacing: 0) {
                                VStack(alignment: .leading) {
                                    Text(flight.originCode)
                                        .font(.headline)
                                    Text(flight.origin)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                
                                Spacer()
                                VStack {
                                    Image(systemName: "chevron.right.2")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                    Text(flight.duration)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                
                                VStack(alignment: .trailing) {
                                    Text(flight.destinationCode)
                                        .font(.headline)
                                    Text(flight.destination)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 4)
                            
                            Divider()
                            
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(alignment: .top) {
                                    Image(systemName: "airplane")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .frame(width: 14)
                                    Text(flight.aircraft)
                                        .font(.caption)
                                }
                                
                                HStack(alignment: .top) {
                                    Image(systemName: "clock")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .frame(width: 14)
                                    Text("Times: \(flight.departureTime) ➜ \(flight.arrivalTime)")
                                        .font(.caption)
                                }
                                
                                HStack(alignment: .top) {
                                    Image(systemName: "mappin.and.ellipse")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .frame(width: 14)
                                    Text(flight.gate)
                                        .font(.caption)
                                }
                                
                                HStack(alignment: .top) {
                                    Image(systemName: "briefcase.fill")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .frame(width: 14)
                                    Text("Baggage: \(flight.baggageClaim)")
                                        .font(.caption)
                                }
                                
                                HStack(alignment: .top) {
                                    Image(systemName: "chart.bar.fill")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .frame(width: 14)
                                    Text("Performance: \(flight.delayStats)")
                                        .font(.caption)
                                }
                                
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
                        }
                        .padding(10)
                        .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 8))
                    }
                }
                .padding()
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
                
                // Return Logistics / Extraction Card
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "arrow.left.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.orange)
                        Text("Extraction Plan (Ash Camp ➜ Home)")
                            .font(.headline)
                        Spacer()
                    }
                    
                    Text("The active 51.844-mile trip should end at Ash Camp on Saturday, September 5; Sunday, September 6 is the contingency day. Mikaela pickup is primary and every fallback must be confirmed before departure.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    VStack(alignment: .leading, spacing: 10) {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("Primary: Mikaela at Ash Camp")
                                    .font(.caption.bold())
                                    .foregroundStyle(.orange)
                                Spacer()
                                Text("PCTA MI 51.844")
                                    .font(.caption2.bold())
                                    .foregroundStyle(.secondary)
                            }
                            Text("Finish at the official Ash Camp pin (PCTA 2026 mile 1472.497; 41.1170914, -122.0606252). The provisional rendezvous is 10:00 AM–noon on Day 8, Saturday Sep 5, finalized by inReach; Sep 6 is contingency. FS Road 38N11 is rough and high clearance is recommended. Mikaela must confirm road access with the McCloud Ranger Station (530-964-2184) before committing the Kia Sportage.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .padding(8)
                        .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 6))

                        VStack(alignment: .leading, spacing: 6) {
                            let avgPrice = gasPricePerGallon ?? 5.38
                            let extractionMiles = 333.3
                            let gallons = extractionMiles / assumedMPG
                            let cost = gallons * avgPrice

                            HStack {
                                Text("Return drive: Ash Camp ➜ Campbell")
                                    .font(.caption.bold())
                                    .foregroundStyle(.orange)
                                Spacer()
                                Text(String(format: "$%.2f Fuel", cost))
                                    .font(.caption2.bold())
                                    .foregroundStyle(.green)
                            }
                            Text(String(format: "The current road-routing snapshot is %.1f miles and about 6.8 driving hours after reaching paved roads. Forest-road conditions, stops, and live traffic can make the day longer. The team should sleep in Campbell that night to protect the Sep 7 SJC departure.", extractionMiles))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .padding(8)
                        .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 6))

                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("Backup: pre-confirmed local extraction")
                                    .font(.caption.bold())
                                    .foregroundStyle(.orange)
                                Spacer()
                                Text("CALL AHEAD")
                                    .font(.caption2.bold())
                                    .foregroundStyle(.secondary)
                            }
                            Text("Mt. Shasta Taxi: 530-859-3266. It is only a backup after the operator explicitly confirms Ash Camp, FS Road 38N11, pickup time, vehicle suitability, fare, and what happens if the hikers are late. A named trail angel can be tertiary backup under the same confirmation standard.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .padding(8)
                        .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 6))
                        
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("Rendezvous and overdue protocol")
                                    .font(.caption.bold())
                                    .foregroundStyle(.orange)
                                Spacer()
                                Text("INREACH")
                                    .font(.caption2.bold())
                                    .foregroundStyle(.secondary)
                            }
                            Text("Send an inReach check-in at the Day 8 start, at Butcherknife Creek/PCTA 1468.643, and on arrival at Ash Camp. Mikaela waits at the exact shared pin and does not drive or hike up-trail searching. If the team misses the agreed overdue threshold, follow the written emergency contact plan; use SOS only for an actual emergency.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .padding(8)
                        .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 6))
                    }
                }
                .padding()
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
                
                // Route details
                VStack(alignment: .leading, spacing: 14) {
                    Text(milestoneTitle)
                        .font(.headline)
                        .padding(.bottom, 4)
                    
                    ForEach(Array(displayedTimelineEvents.enumerated()), id: \.offset) { _, event in
                        HStack(alignment: .top, spacing: 12) {
                            Text(event.time)
                                .font(.caption.bold())
                                .foregroundStyle(mapMode == .end ? .orange : .blue)
                                .frame(width: 75, alignment: .leading)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background((mapMode == .end ? Color.orange : Color.blue).opacity(0.1), in: RoundedRectangle(cornerRadius: 6))
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(event.title)
                                    .font(.subheadline.bold())
                                Text(event.detail)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .padding()
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
                .padding(.bottom)
            }
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .task {
            await calculateRoutes()
            await fetchGasPrices()
        }
    }
    
    private func gasBadge(title: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(color)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: 8))
    }

    private var routeSourceDescription: String {
        switch mapMode {
        case .arrival:
            String(
                format: "%.1f mi after SJC · %.1f hr routing snapshot",
                arrivalDriveRoute?.distanceMiles ?? 0,
                arrivalDriveRoute?.durationHours ?? 0
            )
        case .end:
            String(
                format: "%.1f mi · %.1f hr routing snapshot after pickup",
                endDriveRoute?.distanceMiles ?? 0,
                endDriveRoute?.durationHours ?? 0
            )
        case .full:
            "Flight, arrival drive, 51.844-mile hike, and Ash Camp extraction"
        }
    }

    private var liveRouteURL: URL {
        let rawURL: String
        switch mapMode {
        case .arrival, .full:
            rawURL = "https://www.google.com/maps/dir/2800+Joseph+Ave,+Campbell,+CA/San+Jose+Mineta+International+Airport+(SJC),+San+Jose,+CA/Burney+Falls,+CA/"
        case .end:
            rawURL = "https://www.google.com/maps/dir/?api=1&origin=41.1170914,-122.0606252&destination=2800+Joseph+Ave,+Campbell,+CA+95008&travelmode=driving"
        }
        return URL(string: rawURL)!
    }

    private var milestoneTitle: String {
        switch mapMode {
        case .arrival: "Arrival Route Milestones"
        case .end: "End Route Milestones"
        case .full: "Complete Travel Milestones"
        }
    }

    private var displayedTimelineEvents: [(time: String, title: String, detail: String)] {
        switch mapMode {
        case .arrival:
            arrivalTimelineEvents
        case .end:
            endTimelineEvents
        case .full:
            arrivalTimelineEvents + endTimelineEvents
        }
    }
    
    private var arrivalTimelineEvents: [(time: String, title: String, detail: String)] {
        let t1 = campbellToSJC?.expectedTravelTime ?? 900
        let t2 = (arrivalDriveRoute?.durationHours ?? 6.1) * 3600
        
        let leaveCampbell = timeByAdding(seconds: -t1, to: "10:36 PM")
        let sjcArrival = "10:36 PM"
        let sjcDeparture = "5:15 AM"
        
        // Vacaville is ~29% of SJC->Burney Falls drive
        let tVacaville = t2 * 0.29
        let vacavilleArrival = timeByAdding(seconds: tVacaville, to: sjcDeparture)
        let vacavilleDeparture = timeByAdding(seconds: tVacaville + 1200, to: sjcDeparture) // 20m stop
        
        // Redding is ~84% of SJC->Burney Falls drive
        let tRedding = t2 * 0.84
        let reddingArrival = timeByAdding(seconds: tRedding + 1200, to: sjcDeparture)
        let reddingDeparture = timeByAdding(seconds: tRedding + 1800, to: sjcDeparture) // 10m stop
        
        // Burney Falls is 100% of SJC->Burney Falls drive + 30m total stops
        let burneyArrival = timeByAdding(seconds: t2 + 1800, to: sjcDeparture)
        
        return [
            (leaveCampbell, "Aug 28 · Campbell Depart", "Mikaela leaves for SJC. Drive: \(formatTime(t1))"),
            (sjcArrival, "Aug 28 · UA481 Lands", "Working SJC landing time. Verify the booking and live airport status for terminal and baggage, then sleep near SJC."),
            (sjcDeparture, "Aug 29 · SJC Depart", "Leave after sleep around 5:00–5:30 AM. Drive time: \(formatTime(t2))"),
            (vacavilleArrival, "Vacaville Refuel", "Arrive Costco Gas (~78 mi). Quick snacks. Depart at \(vacavilleDeparture) (20m stop)."),
            (reddingArrival, "Redding Refuel", "Arrive Safeway Fuel (~227 mi). Final top-up. Depart at \(reddingDeparture) (10m stop)."),
            (burneyArrival, "Burney Falls Access", "Day 1 is intentionally 5.609 miles to Rock Creek because this hike starts after the morning drive.")
        ]
    }

    private var endTimelineEvents: [(time: String, title: String, detail: String)] {
        let endDriveHours = endDriveRoute?.durationHours ?? 6.8
        return [
            ("10–Noon", "Sep 5 · Ash Camp Rendezvous", "Finish at the exact shared pin: 41.1170914, -122.0606252. Mikaela’s final arrival window is set through the inReach check-in protocol."),
            ("Variable", "Exit FS Road 38N11", "This rough forest-road portion is part of the displayed route. Drive it only after the McCloud Ranger Station confirms current access and vehicle suitability."),
            ("+\(formatDecimalHours(endDriveHours))", "Campbell Home", "The routed snapshot is \(String(format: "%.1f", endDriveRoute?.distanceMiles ?? 333.3)) miles and \(formatDecimalHours(endDriveHours)) before traffic, food, fuel, and forest-road delays."),
            ("Sep 6", "Protected Contingency Day", "If the team finishes late or extraction slips, use Sunday as the buffer. Do not spend the Sep 7 early-flight margin on an avoidable same-day airport transfer.")
        ]
    }
    
    private func timeByAdding(seconds: TimeInterval, to timeString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        formatter.timeZone = TimeZone(identifier: "America/Los_Angeles")
        
        // Today base date
        guard let baseDate = formatter.date(from: timeString) else { return timeString }
        let targetDate = baseDate.addingTimeInterval(seconds)
        return formatter.string(from: targetDate)
    }
    
    private func calculateRoutes() async {
        isCalculating = true
        defer { isCalculating = false }
        
        let campbell = CLLocation(latitude: 37.2625, longitude: -121.9331)
        let sjc = CLLocation(latitude: 37.3639, longitude: -121.9289)
        
        let request = MKDirections.Request()
        request.source = MKMapItem(location: campbell, address: nil)
        request.destination = MKMapItem(location: sjc, address: nil)
        request.transportType = .automobile
        
        do {
            let response = try await MKDirections(request: request).calculate()
            
            withAnimation {
                self.campbellToSJC = response.routes.first
                updateMapPosition()
            }
        } catch {
            print("Route calculation error for Campbell to SJC: \(error)")
            updateMapPosition()
        }
    }
    
    private func updateMapPosition() {
        withAnimation {
            switch mapMode {
            case .arrival:
                var rect = MKMapRect.null
                if let campbellToSJC {
                    rect = rect.union(campbellToSJC.polyline.boundingMapRect)
                }
                rect = rect.union(mapRect(for: arrivalDriveRoute?.coordinates ?? []))
                setMapPosition(rect, padding: 15_000)
            case .end:
                setMapPosition(mapRect(for: endDriveRoute?.coordinates ?? []), padding: 15_000)
            case .full:
                var rect = mapRect(for: flightCoordinates)
                if let campbellToSJC {
                    rect = rect.union(campbellToSJC.polyline.boundingMapRect)
                }
                rect = rect.union(mapRect(for: arrivalDriveRoute?.coordinates ?? []))
                rect = rect.union(mapRect(for: endDriveRoute?.coordinates ?? []))
                setMapPosition(rect, padding: 50_000)
            }
        }
    }

    private func mapRect(for coordinates: [CLLocationCoordinate2D]) -> MKMapRect {
        coordinates.reduce(MKMapRect.null) { partial, coordinate in
            let point = MKMapPoint(coordinate)
            return partial.union(MKMapRect(x: point.x, y: point.y, width: 1, height: 1))
        }
    }

    private func setMapPosition(_ rect: MKMapRect, padding: Double) {
        guard !rect.isNull, !rect.isEmpty else { return }
        position = .rect(rect.insetBy(dx: -padding, dy: -padding))
    }
    
    private func formatTime(_ seconds: TimeInterval) -> String {
        let hours = Int(seconds) / 3600
        let minutes = (Int(seconds) % 3600) / 60
        return "\(hours)h \(minutes)m"
    }

    private func formatDecimalHours(_ decimalHours: Double) -> String {
        formatTime(decimalHours * 3600)
    }

    private func fetchGasPrices() async {
        guard let url = URL(string: "https://gasprices.aaa.com/?state=CA") else { return }
        var request = URLRequest(url: url)
        request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15", forHTTPHeaderField: "User-Agent")
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let html = String(data: data, encoding: .utf8) {
                // Remove spaces and newlines to make regex simpler
                let cleanedHtml = html.replacingOccurrences(of: "\n", with: "").replacingOccurrences(of: "\r", with: "")
                
                // Regex to find California Avg. regular price
                let pattern = #"California Avg\.</p>\s*<p class="numb">\s*\$([0-9.]+)"#
                let regex = try NSRegularExpression(pattern: pattern, options: [.caseInsensitive])
                let nsrange = NSRange(cleanedHtml.startIndex..<cleanedHtml.endIndex, in: cleanedHtml)
                
                if let match = regex.firstMatch(in: cleanedHtml, range: nsrange) {
                    if let range = Range(match.range(at: 1), in: cleanedHtml) {
                        let priceStr = String(cleanedHtml[range]).trimmingCharacters(in: .whitespacesAndNewlines)
                        if let price = Double(priceStr) {
                            withAnimation {
                                self.gasPricePerGallon = price
                            }
                            return
                        }
                    }
                }
                
                // Fallback to general numb match
                let fallbackPattern = #"class="numb">\s*\$([0-9.]+)"#
                let fallbackRegex = try NSRegularExpression(pattern: fallbackPattern, options: [.caseInsensitive])
                let matches = fallbackRegex.matches(in: cleanedHtml, range: nsrange)
                let matchIndex = matches.count > 1 ? 1 : 0
                if !matches.isEmpty {
                    let m = matches[matchIndex]
                    if let range = Range(m.range(at: 1), in: cleanedHtml) {
                        let priceStr = String(cleanedHtml[range]).trimmingCharacters(in: .whitespacesAndNewlines)
                        if let price = Double(priceStr) {
                            withAnimation {
                                self.gasPricePerGallon = price
                            }
                            return
                        }
                    }
                }
            }
        } catch {
            print("Gas price fetch error: \(error)")
        }
        
        // Provide the real current average price as a hardcoded fallback so it's never empty
        withAnimation {
            self.gasPricePerGallon = 5.38
        }
    }
}

#Preview {
    DriveTrackerView()
}
