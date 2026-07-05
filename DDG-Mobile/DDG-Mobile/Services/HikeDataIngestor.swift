import Foundation
import SwiftData

/// Parses the bundled hike_data.json and ingests it into SwiftData on first launch.
///
/// hike_data.json structure:
/// - `features[]` → CampSite models (GeoJSON Feature with properties)
/// - `route.path[]` → TrailPoint models ([longitude, latitude, elevation_meters])
struct HikeDataIngestor {

    /// Check if data has already been ingested (avoid re-parsing 48k points)
    static func needsIngest(modelContext: ModelContext) -> Bool {
        var descriptor = FetchDescriptor<TrailPoint>()
        descriptor.fetchLimit = 1
        let count = (try? modelContext.fetchCount(descriptor)) ?? 0
        return count == 0
    }

    /// Parse bundled hike_data.json and insert all models into SwiftData
    static func ingest(modelContext: ModelContext) throws {
        guard let url = Bundle.main.url(forResource: "hike_data", withExtension: "json") else {
            assertionFailure("hike_data.json not found in bundle")
            return
        }

        let data = try Data(contentsOf: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]

        // Parse camp/waypoint features
        if let features = json["features"] as? [[String: Any]] {
            for feature in features {
                if let camp = parseCampSite(from: feature) {
                    modelContext.insert(camp)
                }
            }
        }

        // Parse route path (trail coordinates)
        if let route = json["route"] as? [String: Any],
           let path = route["path"] as? [[Double]] {
            for (index, point) in path.enumerated() where point.count >= 3 {
                let trailPoint = TrailPoint(
                    latitude: point[1],
                    longitude: point[0],
                    elevation: point[2],
                    index: index
                )
                modelContext.insert(trailPoint)
            }
        }

        try modelContext.save()
    }

    // MARK: - Private Parsing

    private static func parseCampSite(from feature: [String: Any]) -> CampSite? {
        guard let geometry = feature["geometry"] as? [String: Any],
              let coords = geometry["coordinates"] as? [Double], coords.count >= 2,
              let props = feature["properties"] as? [String: Any],
              let name = props["name"] as? String else {
            return nil
        }

        return CampSite(
            name: name,
            latitude: coords[1],
            longitude: coords[0],
            day: props["day"] as? Int ?? 0,
            type: props["type"] as? String ?? "Camp",
            distance: props["distance"] as? Double ?? 0,
            routeMile: props["routeMile"] as? Double ?? 0,
            startElevation: props["startElevation"] as? String ?? "",
            endElevation: props["endElevation"] as? String ?? "",
            segment: props["segment"] as? String ?? "",
            notes: props["notes"] as? String ?? ""
        )
    }
}
