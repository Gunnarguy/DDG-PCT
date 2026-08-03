import Foundation

/// Generated offline field and emergency reference. The canonical JSON provides
/// narrative; its terrain numbers, day boundaries, gates, and source registry
/// are materialized by scripts/generate_trip_bundles.mjs.
struct FieldBrief: Decodable, Sendable {
    let schemaVersion: Int
    let updatedAt: String
    let scope: String
    let operationalRules: [OperationalRule]
    let emergency: Emergency
    let offlineLimitations: [String]
    let sourceIDs: [String]
    let generatedAt: String
    let terrainContract: String
    let terrainContractVersion: String
    let terrainContractSha256: String
    let route: Route
    let daily: [Day]
    let operations: Operations
    let sources: [TripOperations.OperationalSource]

    private enum CodingKeys: String, CodingKey {
        case schemaVersion
        case updatedAt
        case scope
        case operationalRules
        case emergency
        case offlineLimitations
        case sourceIDs = "sourceIds"
        case generatedAt
        case terrainContract
        case terrainContractVersion
        case terrainContractSha256
        case route
        case daily
        case operations
        case sources
    }

    var sourcesByID: [String: TripOperations.OperationalSource] {
        Dictionary(uniqueKeysWithValues: sources.map { ($0.id, $0) })
    }

    static let bundled: FieldBrief = {
        guard let url = Bundle.main.url(forResource: "field_brief", withExtension: "json") else {
            assertionFailure("field_brief.json is missing")
            return .unavailable
        }
        do {
            return try JSONDecoder().decode(FieldBrief.self, from: Data(contentsOf: url))
        } catch {
            assertionFailure("field_brief.json is invalid: \(error)")
            return .unavailable
        }
    }()
}

extension FieldBrief {
    struct OperationalRule: Decodable, Identifiable, Sendable {
        let id: String
        let title: String
        let detail: String
    }

    struct Route: Decodable, Sendable {
        let name: String
        let officialPctaMiles: Double
        let centerlineGeometryMiles: Double
        let totalGainFeet: Double
        let totalLossFeet: Double
        let minElevationFeet: Double
        let maxElevationFeet: Double
        let hikingDays: Int
    }

    struct Day: Decodable, Identifiable, Sendable {
        let day: Int
        let title: String
        let detail: String
        let distanceMiles: Double
        let gainFeet: Double
        let lossFeet: Double
        let startElevationFeet: Double
        let endElevationFeet: Double
        let highPointFeet: Double
        let lowPointFeet: Double
        let startName: String
        let endName: String
        let stopType: String
        let campStatus: String?
        let packMode: String
        let routeMileStart: Double
        let routeMileEnd: Double
        let pctMileStart: Double
        let pctMileEnd: Double

        var id: Int { day }
    }

    struct Operations: Decodable, Sendable {
        let status: String
        let dayThreeSupport: TripOperations.DayThreeSupport
        let finishPlan: TripOperations.FinishPlan
        let gates: [TripOperations.OperationalGate]
    }

    struct Emergency: Decodable, Sendable {
        let disclaimer: String
        let actions: [EmergencyAction]
        let contacts: [EmergencyContact]
        let checkInProtocol: [CheckInItem]
    }

    struct EmergencyAction: Decodable, Identifiable, Sendable {
        let id: String
        let title: String
        let detail: String
    }

    struct EmergencyContact: Decodable, Identifiable, Sendable {
        let id: String
        let title: String
        let value: String
        let when: String
        let sourceIDs: [String]

        private enum CodingKeys: String, CodingKey {
            case id
            case title
            case value
            case when
            case sourceIDs = "sourceIds"
        }
    }

    struct CheckInItem: Decodable, Identifiable, Sendable {
        let id: String
        let title: String
        let detail: String
    }

    private static let unavailable = FieldBrief(
        schemaVersion: 0,
        updatedAt: "unavailable",
        scope: "The generated field brief could not be loaded.",
        operationalRules: [],
        emergency: Emergency(disclaimer: "Emergency reference unavailable.", actions: [], contacts: [], checkInProtocol: []),
        offlineLimitations: [],
        sourceIDs: [],
        generatedAt: "",
        terrainContract: "",
        terrainContractVersion: "unavailable",
        terrainContractSha256: "",
        route: Route(
            name: "Route unavailable",
            officialPctaMiles: 0,
            centerlineGeometryMiles: 0,
            totalGainFeet: 0,
            totalLossFeet: 0,
            minElevationFeet: 0,
            maxElevationFeet: 0,
            hikingDays: 0
        ),
        daily: [],
        operations: Operations(
            status: "unavailable",
            dayThreeSupport: TripOperations.bundled.dayThreeSupport,
            finishPlan: TripOperations.bundled.finishPlan,
            gates: []
        ),
        sources: []
    )
}
