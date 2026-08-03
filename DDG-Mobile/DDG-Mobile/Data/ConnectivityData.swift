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
        name: "Bartle Gap Pickup / Re-entry",
        mile: 1447.531,
        longitude: -121.81993729434907, latitude: 41.17064891383052,
        cellCoverage: CellCoverage(verizon: "none", att: "none", tmobile: "none"),
        satelliteCompatible: true,
        notes: "Exact planned Day 3 pickup and Day 4 re-entry pin. Assume no cell and coordinate with the tested two-way satellite communicator. Private-corridor camping is prohibited, so this is part of the working itinerary—not a campsite or a casual bailout."
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
        notes: "Remote forest-road trailhead. Use the tested two-way satellite communicator for pickup coordination and assume no cellular service."
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
        id: "phone-satellite-fallback",
        device: "Compatible phone satellite features",
        features: ["Emergency escalation", "Possible contact messaging", "Location sharing where supported"],
        coverage: "Eligibility varies by device, account, software, country, and open-sky conditions",
        cost: "Check current manufacturer and carrier terms",
        notes: "Useful personal fallback. It is not the shared team communications plan.",
        compatibility: "Confirm on each hiker's actual phone before departure",
        trailNotes: "Test outdoors before the trip; trees, terrain, and conditions can delay or block a connection."
    ),
    SatelliteDevice(
        id: "two-way-communicator",
        device: "Dedicated two-way satellite communicator",
        features: ["Two-way check-ins", "SOS", "Location sharing", "Weather or tracking if included in the selected service"],
        coverage: "Depends on the actual device, subscription, satellite network, and sky view",
        cost: "Choose, subscribe, and test the exact unit before departure",
        notes: "This is the required shared coordination path for the Day 3 transfer and Ash Camp pickup.",
        compatibility: "Assign a primary owner and a backup owner",
        trailNotes: "Send and acknowledge a real message with every team contact before the trip; save the protocol offline."
    ),
]
