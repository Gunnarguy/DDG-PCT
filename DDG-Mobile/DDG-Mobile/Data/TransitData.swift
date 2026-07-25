import Foundation

// MARK: - Transit Routes

struct TransitRoute: Identifiable, Sendable {
    let id: String
    let type: String        // "train", "rail", "bus"
    let name: String
    let agency: String
    let route: String
    let stops: [String]
    let frequency: String
    let relevantFor: String
    let notes: String
    let url: String
    let distance: String?
    let cost: String?
    let emoji: String
}

let transitRoutes: [TransitRoute] = [
    TransitRoute(
        id: "mikaela-shuttle", type: "car",
        name: "Mikaela's Shuttle",
        agency: "Personal Vehicle", route: "Campbell → SJC → Burney Falls",
        stops: ["2800 Joseph Ave", "SJC", "Burney Falls"],
        frequency: "Aug 28 Drop-off",
        relevantFor: "Outbound Logistics",
        notes: "Mikaela driving. Real-time gas tracking in Prep tab.",
        url: "",
        distance: "270 miles", cost: nil, emoji: "🚙"
    ),
    TransitRoute(
        id: "dan-sjc-ua", type: "flight",
        name: "Dan & Drew SJC Flights",
        agency: "Confirm from booking", route: "SJC arrival / departure",
        stops: ["SJC"],
        frequency: "Aug 28 Inbound / Sep 7 Outbound",
        relevantFor: "Dan's Arrival & Departure",
        notes: "Arrive Aug 28 at 6:05 PM. Sep 7 departure is unconfirmed: 6:40 AM or 10:40 AM.",
        url: "",
        distance: nil, cost: nil, emoji: "✈️"
    ),
    TransitRoute(
        id: "amtrak-cs-sj", type: "train",
        name: "San Jose Diridon → Redding",
        agency: "Amtrak", route: "Coast Starlight 14",
        stops: ["San Jose Diridon", "Sacramento", "Chico", "Redding"],
        frequency: "Daily, 1 train",
        relevantFor: "Getting from Bay Area to Redding",
        notes: "Book early for lower fares. Redding stop is unstaffed.",
        url: "https://www.amtrak.com/coast-starlight-train",
        distance: nil, cost: nil, emoji: "🚆"
    ),
    TransitRoute(
        id: "amtrak-cs-sac", type: "train",
        name: "Sacramento → Redding",
        agency: "Amtrak", route: "Coast Starlight",
        stops: ["Sacramento", "Chico", "Redding"],
        frequency: "Daily, 1 train",
        relevantFor: "Sacramento to Redding connection",
        notes: "Shorter segment of the Coast Starlight route.",
        url: "https://www.amtrak.com/coast-starlight-train",
        distance: nil, cost: nil, emoji: "🚆"
    ),
    TransitRoute(
        id: "bart-sfo", type: "rail",
        name: "SFO AirTrain → BART → Richmond",
        agency: "BART", route: "Yellow Line",
        stops: ["SFO International", "Millbrae", "SF", "Oakland", "Richmond"],
        frequency: "Every 15 min",
        relevantFor: "Airport to Amtrak connection at Richmond",
        notes: "Transfer to Amtrak Capitol Corridor at Richmond.",
        url: "https://www.bart.gov",
        distance: nil, cost: nil, emoji: "🚇"
    ),
    TransitRoute(
        id: "raba-route5", type: "bus",
        name: "Redding → Burney",
        agency: "RABA", route: "Route 5",
        stops: ["Redding Transit Center", "Burney"],
        frequency: "Mon-Fri, 2x daily",
        relevantFor: "Redding to trailhead connection",
        notes: "Limited schedule! Verify times before relying on this.",
        url: "https://www.rabaride.com",
        distance: nil, cost: "$3.00", emoji: "🚌"
    ),
    TransitRoute(
        id: "greyhound-i5", type: "bus",
        name: "I-5 Corridor Service",
        agency: "Greyhound", route: "I-5",
        stops: ["Sacramento", "Redding", "Dunsmuir", "Yreka", "Medford"],
        frequency: "3-4x daily",
        relevantFor: "Flexible north-south corridor transportation",
        notes: "More frequent than local buses. Book online for best fares.",
        url: "https://www.greyhound.com",
        distance: nil, cost: nil, emoji: "🚌"
    ),
]

// MARK: - Shuttle Services

struct ShuttleService: Identifiable, Sendable {
    let id: String
    let name: String
    let type: String
    let notes: String
    let phone: String?
    let cost: String
    let coverage: String
    let emoji: String
}

// MARK: - Rental Car Info

struct AirportOption: Identifiable, Sendable {
    let id: String      // IATA code
    let name: String
    let distanceToBurney: String
    let rentalAgencies: [String]
    let recommended: Bool
    let notes: String
}

let airportOptions: [AirportOption] = [
    AirportOption(id: "SMF", name: "Sacramento International", distanceToBurney: "~180 mi / 3 hr", rentalAgencies: ["Enterprise", "Hertz", "Avis", "Budget", "National"], recommended: false, notes: "Largest airport, most rental options"),
    AirportOption(id: "RDD", name: "Redding Municipal", distanceToBurney: "~60 mi / 1 hr", rentalAgencies: ["Enterprise", "Hertz"], recommended: true, notes: "Closest airport to trailhead. Limited flights."),
    AirportOption(id: "SJC", name: "San Jose International", distanceToBurney: "~260 mi / 4.5 hr", rentalAgencies: ["Enterprise", "Hertz", "Avis", "Budget", "National", "Alamo"], recommended: false, notes: "Good if flying into Bay Area"),
    AirportOption(id: "SFO", name: "San Francisco International", distanceToBurney: "~280 mi / 5 hr", rentalAgencies: ["Enterprise", "Hertz", "Avis", "Budget", "National", "Alamo"], recommended: false, notes: "Most flight options"),
]

// MARK: - Parking

struct ParkingLocation: Identifiable, Sendable {
    let id: String
    let location: String
    let address: String
    let cost: String
    let phone: String
    let security: String
    let notes: String
}

let parkingLocations: [ParkingLocation] = [
    ParkingLocation(
        id: "burney-falls",
        location: "Burney Falls State Park",
        address: "24898 CA-89, Burney, CA 96013",
        cost: "$10/day",
        phone: "(530) 335-2777",
        security: "Ranger-staffed during day, gated at night",
        notes: "Trailhead parking. Day-use fee required."
    ),
    ParkingLocation(
        id: "ash-camp",
        location: "Ash Camp Pickup",
        address: "FS Road 38N11 · 41.1171, -122.0606",
        cost: "No service assumed",
        phone: "(530) 964-2184",
        security: "Remote forest-road rendezvous",
        notes: "Day 9 finish only. McCloud Ranger Station must confirm road conditions and Kia Sportage suitability before Mikaela drives in."
    ),
]

// MARK: - Resupply Towns

struct ResupplyTown: Identifiable, Sendable {
    let id: String
    let town: String
    let services: [String]
    let transitAccess: String
    let trailDistance: String
    let notes: String
}

let resupplyTowns: [ResupplyTown] = [
    ResupplyTown(id: "burney", town: "Burney", services: ["Grocery", "Gas", "Restaurants", "Hardware store", "Post office"], transitAccess: "RABA Route 5 from Redding", trailDistance: "Pre-hike only", notes: "Buy and pack all nine days of food before starting. There is no on-route resupply in the active 54.2-mile itinerary."),
]
