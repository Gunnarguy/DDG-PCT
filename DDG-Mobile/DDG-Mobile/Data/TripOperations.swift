import Foundation

/// The shared, generated operational contract for the active route.
///
/// This is intentionally separate from local checklist and sync state: it states what
/// still must be verified rather than pretending a booking, road condition, or closure
/// has already been cleared.
struct TripOperations: Decodable, Sendable {
    let schemaVersion: Int
    let updatedAt: String
    let status: String
    let scope: String
    let team: [String]
    let tripDates: TripDates
    let workingFlights: WorkingFlights
    let arrivalPlan: ArrivalPlan
    let dayThreeSupport: DayThreeSupport
    let finishPlan: FinishPlan
    let gates: [OperationalGate]
    let sources: [OperationalSource]
    let canonicalRoute: CanonicalRoute

    var sourcesByID: [String: OperationalSource] {
        Dictionary(uniqueKeysWithValues: sources.map { ($0.id, $0) })
    }

    func sources(for gate: OperationalGate) -> [OperationalSource] {
        gate.sourceIDs.compactMap { sourcesByID[$0] }
    }

    static let bundled: TripOperations = {
        guard
            let url = Bundle.main.url(forResource: "trip_operations", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let operations = try? JSONDecoder().decode(TripOperations.self, from: data)
        else {
            assertionFailure("trip_operations.json is missing or invalid")
            return .unavailable
        }
        return operations
    }()
}

extension TripOperations {
    struct TripDates: Decodable, Sendable {
        let arrival: String
        let hikingStart: String
        let hikingFinish: String
        let contingency: String
        let departure: String
    }

    struct WorkingFlights: Decodable, Sendable {
        let status: String
        let disclaimer: String
        let inbound: Flight
        let outbound: Flight
        let flightTracking: FlightTracking
    }

    struct Flight: Decodable, Identifiable, Sendable {
        let travelers: [String]
        let flightNumber: String
        let origin: String
        let destination: String
        let scheduledDepartureLocal: String
        let scheduledArrivalLocal: String

        var id: String { flightNumber }
    }

    struct FlightTracking: Decodable, Sendable {
        let provider: String
        let providerState: String
        let refreshPolicy: String
        let dataBoundary: String
        let officialStatusUrl: String
        let flights: [FlightTrackingLink]
    }

    struct FlightTrackingLink: Decodable, Identifiable, Sendable {
        let flightNumber: String
        let trackingIdent: String
        let travelDate: String
        let trackerUrl: String

        var id: String { flightNumber }
    }

    struct ArrivalPlan: Decodable, Sendable {
        let driver: String
        let vehicle: String
        let instruction: String
        let driveSnapshot: DriveSnapshot
    }

    struct DayThreeSupport: Decodable, Sendable {
        let instruction: String
        let targetHikerWindow: String
        let driverReadyBy: String
        let requiredBeforeStart: [String]
        let noShowRule: String
        let routeMile: Double
        let pctMile: Double
        let trailCoordinates: [Double]
        let fieldCoordinates: [Double]
        let fieldToTrailOffsetFeet: Double
    }

    struct FinishPlan: Decodable, Sendable {
        let driver: String
        let vehicle: String
        let primaryDate: String
        let backupDate: String
        let pickupWindow: String
        let road: String
        let driveSnapshot: DriveSnapshot
        let fallback: String
        let routeMile: Double
        let pctMile: Double
        let fieldCoordinates: [Double]
        let trailCoordinates: [Double]
    }

    struct DriveSnapshot: Decodable, Sendable {
        let origin: String
        let destination: String
        let distanceMiles: Double
        let durationHours: Double
        let source: String
    }

    struct OperationalGate: Decodable, Identifiable, Sendable {
        let id: String
        let priority: String
        let state: String
        let owner: String
        let due: String
        let title: String
        let detail: String
        let blocks: String
        let sourceIDs: [String]

        private enum CodingKeys: String, CodingKey {
            case id
            case priority
            case state
            case owner
            case due
            case title
            case detail
            case blocks
            case sourceIDs = "sourceIds"
        }
    }

    struct OperationalSource: Decodable, Identifiable, Sendable {
        let id: String
        let title: String
        let url: String?
        let kind: String
        let checkedAt: String?
        let note: String?
    }

    struct CanonicalRoute: Decodable, Sendable {
        let name: String
        let officialPctaMiles: Double
        let centerlineGeometryMiles: Double
        let terrainContractVersion: String
        let dataContractSha256: String
        let start: RouteEndpoint
        let finish: RouteEndpoint
    }

    struct RouteEndpoint: Decodable, Sendable {
        let name: String
        let routeMile: Double
        let pctMile: Double
        let trailCoordinates: [Double]
        let fieldCoordinates: [Double]
    }

    private static let unavailable = TripOperations(
        schemaVersion: 0,
        updatedAt: "unavailable",
        status: "unavailable",
        scope: "The operational bundle could not be loaded.",
        team: [],
        tripDates: TripDates(arrival: "", hikingStart: "", hikingFinish: "", contingency: "", departure: ""),
        workingFlights: WorkingFlights(
            status: "unavailable",
            disclaimer: "Flight data unavailable.",
            inbound: Flight(travelers: [], flightNumber: "—", origin: "", destination: "", scheduledDepartureLocal: "", scheduledArrivalLocal: ""),
            outbound: Flight(travelers: [], flightNumber: "—", origin: "", destination: "", scheduledDepartureLocal: "", scheduledArrivalLocal: ""),
            flightTracking: FlightTracking(
                provider: "Flight status unavailable.",
                providerState: "unavailable",
                refreshPolicy: "",
                dataBoundary: "",
                officialStatusUrl: "",
                flights: []
            )
        ),
        arrivalPlan: ArrivalPlan(
            driver: "—",
            vehicle: "—",
            instruction: "Arrival plan unavailable.",
            driveSnapshot: DriveSnapshot(origin: "", destination: "", distanceMiles: 0, durationHours: 0, source: "")
        ),
        dayThreeSupport: DayThreeSupport(
            instruction: "Day 3 plan unavailable.",
            targetHikerWindow: "",
            driverReadyBy: "",
            requiredBeforeStart: [],
            noShowRule: "",
            routeMile: 0,
            pctMile: 0,
            trailCoordinates: [],
            fieldCoordinates: [],
            fieldToTrailOffsetFeet: 0
        ),
        finishPlan: FinishPlan(
            driver: "—",
            vehicle: "—",
            primaryDate: "",
            backupDate: "",
            pickupWindow: "",
            road: "",
            driveSnapshot: DriveSnapshot(origin: "", destination: "", distanceMiles: 0, durationHours: 0, source: ""),
            fallback: "",
            routeMile: 0,
            pctMile: 0,
            fieldCoordinates: [],
            trailCoordinates: []
        ),
        gates: [],
        sources: [],
        canonicalRoute: CanonicalRoute(
            name: "Route unavailable",
            officialPctaMiles: 0,
            centerlineGeometryMiles: 0,
            terrainContractVersion: "unavailable",
            dataContractSha256: "",
            start: RouteEndpoint(name: "", routeMile: 0, pctMile: 0, trailCoordinates: [], fieldCoordinates: []),
            finish: RouteEndpoint(name: "", routeMile: 0, pctMile: 0, trailCoordinates: [], fieldCoordinates: [])
        )
    )
}
