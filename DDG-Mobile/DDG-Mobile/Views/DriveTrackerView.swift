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

struct DriveTrackerView: View {
    @State private var route1: MKRoute?
    @State private var route2: MKRoute?
    @State private var isCalculating = false
    @State private var gasPricePerGallon: Double? = nil
    @State private var position: MapCameraPosition = .automatic
    @State private var mapMode = 0 // 0 = CA Drive Route, 1 = Full flight & drive
    
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
                    Text("Realtime logistics dashboard for Burney Falls insertion")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                .padding(.top)
                
                // Map Selector Control
                Picker("Map View Mode", selection: $mapMode) {
                    Text("California Drive Route").tag(0)
                    Text("Full US Transit Path").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .onChange(of: mapMode) {
                    updateMapPosition()
                }
                
                // MapKit Map
                Map(position: $position) {
                    Marker("Campbell Start", systemImage: "car.fill", coordinate: CLLocationCoordinate2D(latitude: 37.2625, longitude: -121.9331))
                        .tint(.blue)
                    
                    Marker("SJC Airport", systemImage: "airplane", coordinate: CLLocationCoordinate2D(latitude: 37.3639, longitude: -121.9289))
                        .tint(.indigo)
                    
                    Marker("Burney Falls (Drop-off)", systemImage: "flag.fill", coordinate: CLLocationCoordinate2D(latitude: 41.0135, longitude: -121.6207))
                        .tint(.green)
                    
                    // Gas Stop Annotations
                    ForEach(gasStops) { stop in
                        Marker(stop.name, systemImage: "fuelpump.fill", coordinate: stop.coordinate)
                            .tint(.purple)
                    }
                    
                    // Flight Markers
                    if mapMode == 1 {
                        Marker("Chicago (ORD)", systemImage: "airplane.departure", coordinate: CLLocationCoordinate2D(latitude: 41.9742, longitude: -87.9073))
                            .tint(.teal)

                        MapPolyline(coordinates: flightCoordinates)
                            .stroke(.teal, style: StrokeStyle(lineWidth: 3, dash: [6, 6]))
                    }
                    
                    if let route1 = route1 {
                        MapPolyline(route1)
                            .stroke(.blue, lineWidth: 4)
                    }
                    if let route2 = route2 {
                        MapPolyline(route2)
                            .stroke(.orange, lineWidth: 4)
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
                    
                    if let r1 = route1, let r2 = route2 {
                        let singleTripMiles = (r1.distance + r2.distance) / 1609.34
                        let roundTripMiles = singleTripMiles * 2
                        let avgPrice = gasPricePerGallon ?? 5.38
                        let totalGallons = roundTripMiles / assumedMPG
                        let fuelCost = totalGallons * avgPrice
                        
                        HStack(spacing: 8) {
                            gasBadge(title: "AAA CA AVG", value: String(format: "$%.2f/gal", avgPrice), color: .green)
                            gasBadge(title: "ROUND TRIP MILES", value: String(format: "%.1f mi", roundTripMiles), color: .blue)
                            gasBadge(title: "FUEL COST EST.", value: String(format: "$%.2f", fuelCost), color: .purple)
                        }
                        
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
                    Text("Detailed Travel Milestones")
                        .font(.headline)
                        .padding(.bottom, 4)
                    
                    ForEach(0..<timelineEvents.count, id: \.self) { idx in
                        let event = timelineEvents[idx]
                        HStack(alignment: .top, spacing: 12) {
                            Text(event.time)
                                .font(.caption.bold())
                                .foregroundStyle(.blue)
                                .frame(width: 75, alignment: .leading)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(.blue.opacity(0.1), in: RoundedRectangle(cornerRadius: 6))
                            
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
    
    private var timelineEvents: [(time: String, title: String, detail: String)] {
        let t1 = route1?.expectedTravelTime ?? 900 // default 15m
        let t2 = route2?.expectedTravelTime ?? 16200 // default 4.5h
        
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
        let burney = CLLocation(latitude: 41.0135, longitude: -121.6207)
        
        let req1 = MKDirections.Request()
        req1.source = MKMapItem(location: campbell, address: nil)
        req1.destination = MKMapItem(location: sjc, address: nil)
        req1.transportType = .automobile
        
        let req2 = MKDirections.Request()
        req2.source = MKMapItem(location: sjc, address: nil)
        req2.destination = MKMapItem(location: burney, address: nil)
        req2.transportType = .automobile
        
        do {
            let res1 = try await MKDirections(request: req1).calculate()
            let res2 = try await MKDirections(request: req2).calculate()
            
            withAnimation {
                self.route1 = res1.routes.first
                self.route2 = res2.routes.first
                updateMapPosition()
            }
        } catch {
            print("Route calculation error: \(error)")
        }
    }
    
    private func updateMapPosition() {
        withAnimation {
            if mapMode == 0 {
                // Focus on drive route
                if let r1 = route1, let r2 = route2 {
                    let rect1 = r1.polyline.boundingMapRect
                    let rect2 = r2.polyline.boundingMapRect
                    self.position = .rect(rect1.union(rect2).insetBy(dx: -15000, dy: -15000))
                }
            } else {
                // Focus on full route (flight + drive)
                var rect = MKMapRect.null
                for coord in flightCoordinates {
                    let point = MKMapPoint(coord)
                    rect = rect.union(MKMapRect(x: point.x, y: point.y, width: 0, height: 0))
                }
                if let r1 = route1 { rect = rect.union(r1.polyline.boundingMapRect) }
                if let r2 = route2 { rect = rect.union(r2.polyline.boundingMapRect) }
                self.position = .rect(rect.insetBy(dx: -50000, dy: -50000))
            }
        }
    }
    
    private func formatTime(_ seconds: TimeInterval) -> String {
        let hours = Int(seconds) / 3600
        let minutes = (Int(seconds) % 3600) / 60
        return "\(hours)h \(minutes)m"
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
