import Foundation

// MARK: - Connectivity Data (Section O: Burney Falls → Castle Crags)

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

/// 8 connectivity zones along Section O
let connectivityZones: [ConnectivityZone] = [
    ConnectivityZone(
        id: "burney-falls",
        name: "Burney Falls Trailhead",
        mile: 1420.7,
        longitude: -121.620709, latitude: 41.01348,
        cellCoverage: CellCoverage(verizon: "good", att: "fair", tmobile: "fair"),
        satelliteCompatible: true,
        notes: "Last reliable cell coverage before entering wilderness. Download offline maps here."
    ),
    ConnectivityZone(
        id: "round-valley",
        name: "Round Valley Campground",
        mile: 1436.6,
        longitude: -121.732282, latitude: 41.027728,
        cellCoverage: CellCoverage(verizon: "none", att: "none", tmobile: "none"),
        satelliteCompatible: true,
        notes: "Deep wilderness — satellite only. Good open sky for satellite devices."
    ),
    ConnectivityZone(
        id: "black-rock",
        name: "Black Rock Camp",
        mile: 1451.0,
        longitude: -121.800767, latitude: 41.091989,
        cellCoverage: CellCoverage(verizon: "none", att: "none", tmobile: "none"),
        satelliteCompatible: true,
        notes: "No cell coverage. Satellite devices work well with clear sky views."
    ),
    ConnectivityZone(
        id: "horse-camp",
        name: "Horse Camp",
        mile: 1463.7,
        longitude: -121.783984, latitude: 41.16896,
        cellCoverage: CellCoverage(verizon: "none", att: "none", tmobile: "none"),
        satelliteCompatible: true,
        notes: "No cell coverage. Trees may intermittently block satellite signal."
    ),
    ConnectivityZone(
        id: "indian-springs",
        name: "Indian Springs Camp",
        mile: 1478.1,
        longitude: -121.897491, latitude: 41.173417,
        cellCoverage: CellCoverage(verizon: "none", att: "none", tmobile: "none"),
        satelliteCompatible: true,
        notes: "No cell coverage. Open ridgeline provides good satellite visibility."
    ),
    ConnectivityZone(
        id: "castle-crags-vista",
        name: "Castle Crags Vista Camp",
        mile: 1490.8,
        longitude: -121.982003, latitude: 41.139897,
        cellCoverage: CellCoverage(verizon: "spotty", att: "none", tmobile: "none"),
        satelliteCompatible: true,
        notes: "Occasional Verizon signal from Castle Crags towers. Don't count on it."
    ),
    ConnectivityZone(
        id: "castle-crags-sp",
        name: "Castle Crags State Park",
        mile: 1498.8,
        longitude: -122.039017, latitude: 41.114517,
        cellCoverage: CellCoverage(verizon: "good", att: "good", tmobile: "fair"),
        satelliteCompatible: true,
        notes: "Re-entering civilization. Good coverage near the parking lot and visitor center."
    ),
    ConnectivityZone(
        id: "dunsmuir",
        name: "Dunsmuir Town",
        mile: 1510,
        longitude: -122.2719, latitude: 41.2084,
        cellCoverage: CellCoverage(verizon: "excellent", att: "excellent", tmobile: "good"),
        satelliteCompatible: true,
        notes: "Full town services. All carriers work well. Resupply and celebrate!"
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
        trailNotes: "Overkill for a 6-day hike, but bulletproof navigation."
    ),
]
