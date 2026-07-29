import Foundation
import SwiftData

// MARK: - GearLoadout (mirrors gear_loadouts table)

@Model
final class GearLoadout {
    @Attribute(.unique) var hikerId: String
    var itemIds: [String]  // Array of item IDs from resourcesIndex
    var updatedAt: Date
    var syncStatus: SyncStatus

    init(
        hikerId: String,
        itemIds: [String] = [],
        updatedAt: Date = .now,
        syncStatus: SyncStatus = .local
    ) {
        self.hikerId = hikerId
        self.itemIds = itemIds
        self.updatedAt = updatedAt
        self.syncStatus = syncStatus
    }
}

// MARK: - CustomItem (mirrors custom_items table)

@Model
final class CustomItem {
    @Attribute(.unique) var remoteId: Int64?
    var stableId: String
    var name: String
    var detail: String?
    var weightVal: Double?
    var weightLabel: String?  // "oz", "lb", "g"
    var category: String
    var moduleId: String
    var sourceIds: [String]
    var specs: [String] = []
    var defaultPacked: Bool = false
    var weightBucket: String = "carried"
    var quantity: Int = 1
    var createdBy: String?
    var createdAt: Date
    var syncStatus: SyncStatus

    init(
        remoteId: Int64? = nil,
        stableId: String = UUID().uuidString,
        name: String,
        detail: String? = nil,
        weightVal: Double? = nil,
        weightLabel: String? = "oz",
        category: String = "Custom",
        moduleId: String = "custom",
        sourceIds: [String] = [],
        specs: [String] = [],
        defaultPacked: Bool = false,
        weightBucket: String = "carried",
        quantity: Int = 1,
        createdBy: String? = nil,
        createdAt: Date = .now,
        syncStatus: SyncStatus = .local
    ) {
        self.remoteId = remoteId
        self.stableId = stableId
        self.name = name
        self.detail = detail
        self.weightVal = weightVal
        self.weightLabel = weightLabel
        self.category = category
        self.moduleId = moduleId
        self.sourceIds = sourceIds
        self.specs = specs
        self.defaultPacked = defaultPacked
        self.weightBucket = weightBucket
        self.quantity = quantity
        self.createdBy = createdBy
        self.createdAt = createdAt
        self.syncStatus = syncStatus
    }

    /// Normalize weight to ounces for consistent comparison
    var weightInOz: Double {
        guard let val = weightVal else { return 0 }
        let unit = weightLabel?.lowercased() ?? "oz"
        if unit.contains("lb") || unit.contains("pound") { return val * 16 }
        if unit == "g" || unit.contains("gram") { return val * 0.035274 }
        return val
    }
}
