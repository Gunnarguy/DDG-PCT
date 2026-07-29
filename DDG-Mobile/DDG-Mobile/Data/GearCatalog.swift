import Foundation

struct GearCatalog: Decodable, Sendable {
    let version: Int
    let generatedFrom: String
    let packName: String
    let capacityLiters: Double
    let baseWeightGoalPounds: Double
    let consumablesStartPounds: Double
    let summary: String
    let sources: [GearSource]
    let modules: [GearModule]

    var items: [GearCatalogItem] {
        modules.flatMap { module in
            module.items.map { item in
                var item = item
                item.moduleId = module.id
                item.category = module.label
                return item
            }
        }
    }

    var sourcesById: [String: GearSource] {
        Dictionary(uniqueKeysWithValues: sources.map { ($0.id, $0) })
    }

    static let bundled: GearCatalog = {
        guard
            let url = Bundle.main.url(forResource: "gear_catalog", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let catalog = try? JSONDecoder().decode(GearCatalog.self, from: data)
        else {
            assertionFailure("gear_catalog.json is missing or invalid")
            return .empty
        }
        return catalog
    }()

    private static let empty = GearCatalog(
        version: 0,
        generatedFrom: "unavailable",
        packName: "DDG Mission Loadout",
        capacityLiters: 60,
        baseWeightGoalPounds: 20,
        consumablesStartPounds: 10,
        summary: "Gear catalog unavailable.",
        sources: [],
        modules: []
    )
}

struct GearModule: Decodable, Identifiable, Sendable {
    let id: String
    let label: String
    let readiness: String
    let focus: String
    let targetWeightPounds: Double
    let targetVolumeLiters: Double
    let sourceIds: [String]
    let items: [GearCatalogItem]
}

struct GearCatalogItem: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let detail: String
    let weightOunces: Double
    let weightDisplay: String
    let weightBucket: String
    let quantity: Int
    let specs: [String]
    let defaultPacked: Bool
    let sourceIds: [String]
    var moduleId: String = "custom"
    var category: String = "Custom"

    private enum CodingKeys: String, CodingKey {
        case id
        case name
        case detail
        case weightOunces
        case weightDisplay
        case weightBucket
        case quantity
        case specs
        case defaultPacked
        case sourceIds
    }
}

struct GearSource: Decodable, Identifiable, Sendable {
    let id: String
    let title: String
    let url: String?
    let category: String
}
