import Foundation

// MARK: - Connectivity Data (Section O: Burney Falls → Ash Camp)

struct CellCoverage: Sendable {
    let verizon: String     // "excellent", "good", "fair", "spotty", "none"
    let att: String
    let tmobile: String
}

struct ConnectivityZone: Identifiable, Sendable {
    let id: String
    let name: String
    let mile: Double
    let longitude: Double
    let latitude: Double
    let cellCoverage: CellCoverage
    let satelliteCompatible: Bool
    let notes: String
}

/// Conservative checkpoints along the active route. Carrier values are planning
/// assumptions, not field measurements; satellite messaging remains primary.
let connectivityZones: [ConnectivityZone] = [
    ConnectivityZone(
        id: "burney-falls",
        name: "Burney Falls Trailhead",
        mile: 1420.653,
        longitude: -121.65376551, latitude: 41.01104125,
        cellCoverage: CellCoverage(verizon: "good", att: "fair", tmobile: "fair"),
        satelliteCompatible: true,
        notes: "Expected trailhead coverage; download offline maps here and field-test every carrier."
    ),
    ConnectivityZone(
        id: "pre-private-usfs-camp",
        name: "Pre-private USFS Dry Camp",
        mile: 1434.94,
        longitude: -121.789562, latitude: 41.068437,
        cellCoverage: CellCoverage(verizon: "none", att: "none", tmobile: "none"),
        satelliteCompatible: true,
        notes: "Conservative no-cell assumption at the GIS-screened dry-camp candidate. Use satellite check-in; ground capacity still needs verification."
    ),
    ConnectivityZone(
        id: "bartle-gap-transfer",
        name: "Bartle Gap Support Transfer",
        mile: 1447.531,
        longitude: -121.81993729434907, latitude: 41.17064891383052,
        cellCoverage: CellCoverage(verizon: "none", att: "none", tmobile: "none"),
        satelliteCompatible: true,
        notes: "Exact pickup/re-entry pin. Assume no cell and coordinate by inReach. This is a timed transfer point, not a campsite."
    ),
    ConnectivityZone(
        id: "star-city",
        name: "Alder / Star City Camp",
        mile: 1456.689,
        longitude: -121.9202143, latitude: 41.157895,
        cellCoverage: CellCoverage(verizon: "none", att: "none", tmobile: "none"),
        satelliteCompatible: true,
        notes: "Conservative no-cell assumption; trees may also slow satellite acquisition."
    ),
    ConnectivityZone(
        id: "deer-creek",
        name: "Deer Creek Spring Camp",
        mile: 1463.039,
        longitude: -121.9860782, latitude: 41.1356197,
        cellCoverage: CellCoverage(verizon: "spotty", att: "none", tmobile: "none"),
        satelliteCompatible: true,
        notes: "Possible intermittent ridge exposure; do not count on it."
    ),
    ConnectivityZone(
        id: "ash-camp",
        name: "Ash Camp Pickup",
        mile: 1472.497,
        longitude: -122.0606252, latitude: 41.1170914,
        cellCoverage: CellCoverage(verizon: "unknown", att: "unknown", tmobile: "unknown"),
        satelliteCompatible: true,
        notes: "Remote forest-road trailhead. Use inReach for pickup coordination and assume no cellular service."
    ),
]

// MARK: - Satellite Devices

struct SatelliteDevice: Identifiable, Sendable {
    let id: String
    let device: String
    let features: [String]
    let coverage: String
    let cost: String
    let notes: String
    let compatibility: String
    let trailNotes: String
}

let satelliteDevices: [SatelliteDevice] = [
    SatelliteDevice(
        id: "iphone-16",
        device: "iPhone 16 Pro Max",
        features: ["Emergency SOS via satellite", "Crash Detection", "Find My via satellite"],
        coverage: "Globalstar satellite network (limited availability in canyons)",
        cost: "Free for 2 years with iPhone purchase",
        notes: "Emergency only — no custom messages. Requires clear sky view.",
        compatibility: "iOS 18.1+, iPhone 14 or later",
        trailNotes: "Good for SOS. Not a replacement for a dedicated communicator."
    ),
    SatelliteDevice(
        id: "inreach-mini2",
        device: "Garmin inReach Mini 2",
        features: ["Two-way messaging", "SOS", "Tracking", "Weather forecast"],
        coverage: "Iridium satellite network (global, pole-to-pole)",
        cost: "$14.95+/mo subscription",
        notes: "Best weight-to-features ratio. Pairs with phone via Garmin Messenger app.",
        compatibility: "Bluetooth LE, any smartphone",
        trailNotes: "DDG team recommended. Set up tracking share before departure."
    ),
    SatelliteDevice(
        id: "inreach-messenger",
        device: "Garmin inReach Messenger",
        features: ["Two-way messaging", "SOS", "Tracking", "Location sharing"],
        coverage: "Iridium satellite network (global)",
        cost: "$14.95+/mo subscription",
        notes: "Messaging focused. Lighter than Mini 2 but fewer features.",
        compatibility: "Bluetooth LE, any smartphone",
        trailNotes: "Good budget option if you don't need weather forecasts."
    ),
    SatelliteDevice(
        id: "zoleo",
        device: "Zoleo Satellite Communicator",
        features: ["Two-way messaging", "SOS", "Check-in", "Weather"],
        coverage: "Iridium satellite network",
        cost: "$20/mo subscription",
        notes: "Simple interface. Good for non-tech-savvy team members.",
        compatibility: "Bluetooth, iOS/Android app",
        trailNotes: "Reliable but slightly heavier. Good backup device."
    ),
    SatelliteDevice(
        id: "gpsmap-67i",
        device: "Garmin GPSMAP 67i",
        features: ["Two-way messaging", "SOS", "Tracking", "Topo maps", "GPS navigation"],
        coverage: "Iridium satellite network + GPS/GLONASS/Galileo",
        cost: "$599 + $14.95+/mo subscription",
        notes: "Full-featured GPS with inReach built in. Heavy but self-contained.",
        compatibility: "Standalone + Bluetooth",
        trailNotes: "Heavier than phone-only navigation, but dependable for an eight-day route with long cell gaps."
    ),
]
