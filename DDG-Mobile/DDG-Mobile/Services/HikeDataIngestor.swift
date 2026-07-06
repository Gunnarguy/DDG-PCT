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
        print("DEBUG [HikeDataIngestor]: Checking database state...")
        
        let currentVersion = 5 // Bump this to force re-ingestion when json structure/content changes.
        let ingestedVersion = UserDefaults.standard.integer(forKey: "hikeDataIngestVersion")
        if ingestedVersion < currentVersion {
            print("DEBUG [HikeDataIngestor]: Forced re-ingestion triggered (version \(ingestedVersion) < \(currentVersion))")
            return true
        }

        let tpCount = (try? modelContext.fetchCount(FetchDescriptor<TrailPoint>())) ?? 0
        let wsCount = (try? modelContext.fetchCount(FetchDescriptor<WaterSource>())) ?? 0
        let campCount = (try? modelContext.fetchCount(FetchDescriptor<CampSite>())) ?? 0
        
        // Ensure we have at least 3 distinct day values (e.g. -1, 0, 1) otherwise re-ingest
        let camps = (try? modelContext.fetch(FetchDescriptor<CampSite>())) ?? []
        let distinctDays = Set(camps.map(\.day))
        
        let needs = tpCount < 2000 || wsCount == 0 || campCount < 5 || distinctDays.count < 4
        print("DEBUG [HikeDataIngestor]: Current database count - \(tpCount) points, \(wsCount) water sources, \(campCount) camps, \(distinctDays.count) distinct days. Needs ingest: \(needs)")
        return needs
    }

    /// Parse bundled hike_data.json and insert all models into SwiftData
    static func ingest(modelContext: ModelContext) throws {
        print("DEBUG [HikeDataIngestor]: Beginning data ingestion from bundle resource 'hike_data.json'...")
        
        // Clear any old/corrupt data first to prevent duplicate entries
        try? modelContext.delete(model: TrailPoint.self)
        try? modelContext.delete(model: CampSite.self)
        try? modelContext.delete(model: WaterSource.self)
        
        guard let url = Bundle.main.url(forResource: "hike_data", withExtension: "json") else {
            print("ERROR [HikeDataIngestor]: Bundled 'hike_data.json' file not found in main bundle!")
            assertionFailure("hike_data.json not found in bundle")
            return
        }

        let data = try Data(contentsOf: url)
        print("DEBUG [HikeDataIngestor]: Successfully read \(data.count) bytes from JSON file.")
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]

        // 1. Parse route path (trail coordinates) first so we can slice it and capture camp coordinates
        var pathCount = 0
        var coordsAtMiles: [Double: (lat: Double, lon: Double)] = [:]
        var trailMiles: [(lat: Double, lon: Double, mile: Double, elev: Double)] = []
        
        if let route = json["route"] as? [String: Any],
           let path = route["path"] as? [[Double]] {
            print("DEBUG [HikeDataIngestor]: Slicing and parsing \(path.count) trail points...")
            
            var cumulativeDistance: Double = 0
            var lastLat: Double? = nil
            var lastLon: Double? = nil
            
            for point in path where point.count >= 3 {
                let lon = point[0]
                let lat = point[1]
                let elev = point[2]
                
                if let lLat = lastLat, let lLon = lastLon {
                    let lat1 = lLat * .pi / 180
                    let lat2 = lat * .pi / 180
                    let lon1 = lLon * .pi / 180
                    let lon2 = lon * .pi / 180
                    let dlat = lat2 - lat1
                    let dlon = lon2 - lon1
                    let a = sin(dlat/2) * sin(dlat/2) + cos(lat1) * cos(lat2) * sin(dlon/2) * sin(dlon/2)
                    let c = 2 * atan2(sqrt(a), sqrt(1-a))
                    let distanceMiles = 3958.8 * c
                    cumulativeDistance += distanceMiles
                }
                
                trailMiles.append((lat: lat, lon: lon, mile: cumulativeDistance, elev: elev))
                lastLat = lat
                lastLon = lon
            }
            
            // Helper to get coordinates closest to target mileage
            let getCoordsForMile = { (targetMile: Double) -> (lat: Double, lon: Double) in
                guard !trailMiles.isEmpty else { return (0.0, 0.0) }
                var bestPt = trailMiles[0]
                var minDiff = Double.infinity
                for item in trailMiles {
                    let diff = abs(item.mile - targetMile)
                    if diff < minDiff {
                        minDiff = diff
                        bestPt = item
                    }
                }
                return (lat: bestPt.lat, lon: bestPt.lon)
            }
            
            // Capture coords for key 52-mile plan markers
            let keyMiles = [0.0, 10.0, 19.0, 27.0, 36.0, 44.0, 52.0]
            for km in keyMiles {
                coordsAtMiles[km] = getCoordsForMile(km)
            }
            
            // Insert trail points up to 52.0 miles
            for (index, item) in trailMiles.enumerated() {
                if item.mile > 52.0 {
                    print("DEBUG [HikeDataIngestor]: Sliced trail points at 52.0 miles (index \(index))")
                    break
                }
                let trailPoint = TrailPoint(
                    latitude: item.lat,
                    longitude: item.lon,
                    elevation: item.elev,
                    index: index
                )
                modelContext.insert(trailPoint)
                pathCount += 1
            }
            print("DEBUG [HikeDataIngestor]: Successfully inserted \(pathCount) trail points.")
        }

        // 2. Parse camp/waypoint features and map them to the 52-mile plan in miles
        var campCount = 0
        if let features = json["features"] as? [[String: Any]] {
            print("DEBUG [HikeDataIngestor]: Parsing \(features.count) waypoint features...")
            for feature in features {
                if let camp = parseCampSite(from: feature, coordsAtMiles: coordsAtMiles) {
                    modelContext.insert(camp)
                    campCount += 1
                }
            }
            print("DEBUG [HikeDataIngestor]: Successfully inserted \(campCount) campsites.")
        }
        
        // 3. Parse water sources and filter to those within 0.5 miles of the sliced trail
        var waterCount = 0
        if let sources = json["waterSources"] as? [[String: Any]] {
            print("DEBUG [HikeDataIngestor]: Filtering and parsing \(sources.count) water sources...")
            for sourceDict in sources {
                if let water = parseWaterSource(from: sourceDict) {
                    var isNearTrail = false
                    for tp in trailMiles {
                        if tp.mile > 52.0 { break }
                        let d = haversine(lon1: tp.lon, lat1: tp.lat, lon2: water.longitude, lat2: water.latitude)
                        if d <= 0.5 {
                            isNearTrail = true
                            break
                        }
                    }
                    if isNearTrail {
                        modelContext.insert(water)
                        waterCount += 1
                    }
                }
            }
            print("DEBUG [HikeDataIngestor]: Successfully inserted \(waterCount) water sources near the 52-mile route.")
        }

        print("DEBUG [HikeDataIngestor]: Saving ModelContext...")
        try modelContext.save()
        
        // Save current version to UserDefaults to track ingestion state
        UserDefaults.standard.set(5, forKey: "hikeDataIngestVersion")
        print("DEBUG [HikeDataIngestor]: Data ingestion complete.")
    }

    // MARK: - Private Helpers

    private static func haversine(lon1: Double, lat1: Double, lon2: Double, lat2: Double) -> Double {
        let R = 3958.8 // Earth radius in miles
        let phi1 = lat1 * .pi / 180
        let phi2 = lat2 * .pi / 180
        let dphi = (lat2 - lat1) * .pi / 180
        let dlambda = (lon2 - lon1) * .pi / 180
        
        let a = sin(dphi/2) * sin(dphi/2) + cos(phi1) * cos(phi2) * sin(dlambda/2) * sin(dlambda/2)
        let c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c
    }

    private static func parseCampSite(from feature: [String: Any], coordsAtMiles: [Double: (lat: Double, lon: Double)]) -> CampSite? {
        guard let geometry = feature["geometry"] as? [String: Any],
              let coords = geometry["coordinates"] as? [Double], coords.count >= 2,
              let props = feature["properties"] as? [String: Any],
              var name = props["name"] as? String else {
            return nil
        }

        let type = props["type"] as? String ?? "Camp"
        let day = (props["day"] as? NSNumber)?.intValue ?? (props["day"] as? Int) ?? 0

        // Handle travel/assembly items
        if day == -1 {
            return CampSite(
                name: name,
                latitude: coords[1],
                longitude: coords[0],
                day: day,
                type: type,
                distance: 0,
                routeMile: 0,
                startElevation: props["startElevation"] as? String ?? "",
                endElevation: props["endElevation"] as? String ?? "",
                segment: props["segment"] as? String ?? "",
                notes: props["notes"] as? String ?? ""
            )
        }

        // Map campsites for the 52-mile plan (Day 0 to 6)
        var mappedDistance: Double = 0
        var mappedRouteMile: Double = 0
        var targetMile: Double = 0
        var mappedType = type

        switch day {
        case 0:
            name = "Burney Falls State Park"
            mappedDistance = 0
            mappedRouteMile = 0
            targetMile = 0.0
            mappedType = "Trailhead"
        case 1:
            name = "Round Valley Campground"
            mappedDistance = 10.0
            mappedRouteMile = 10.0
            targetMile = 10.0
        case 2:
            name = "Black Rock Camp"
            mappedDistance = 9.0
            mappedRouteMile = 19.0
            targetMile = 19.0
        case 3:
            name = "Horse Camp"
            mappedDistance = 8.0
            mappedRouteMile = 27.0
            targetMile = 27.0
        case 4:
            name = "Indian Springs Camp"
            mappedDistance = 9.0
            mappedRouteMile = 36.0
            targetMile = 36.0
        case 5:
            name = "Castle Crags Vista Camp"
            mappedDistance = 8.0
            mappedRouteMile = 44.0
            targetMile = 44.0
        case 6:
            name = "Castle Crags (Soda Creek Exit)"
            mappedDistance = 8.0
            mappedRouteMile = 52.0
            targetMile = 52.0
            mappedType = "Finish"
        default:
            return nil // Exclude relaxed itinerary/out-of-range camps from the 52-mile active express plan
        }

        let mappedCoords = coordsAtMiles[targetMile] ?? (lat: coords[1], lon: coords[0])

        return CampSite(
            name: name,
            latitude: mappedCoords.lat,
            longitude: mappedCoords.lon,
            day: day,
            type: mappedType,
            distance: mappedDistance,
            routeMile: mappedRouteMile,
            startElevation: props["startElevation"] as? String ?? "",
            endElevation: props["endElevation"] as? String ?? "",
            segment: props["segment"] as? String ?? "",
            notes: props["notes"] as? String ?? ""
        )
    }

    private static func parseWaterSource(from dict: [String: Any]) -> WaterSource? {
        guard let coords = dict["coordinates"] as? [Double], coords.count >= 2,
              let name = dict["name"] as? String else {
            return nil
        }

        let report = dict["report"] as? String ?? ""
        var reliability = "unknown"
        if report.lowercased().contains("flowing") || report.lowercased().contains("great") || report.lowercased().contains("tap on") {
            reliability = "excellent"
        } else if report.lowercased().contains("trickle") || report.lowercased().contains("seasonal") {
            reliability = "seasonal"
        } else if report.lowercased().contains("dry") {
            reliability = "sketchy"
        } else {
            reliability = "good"
        }

        return WaterSource(
            name: name,
            latitude: coords[1],
            longitude: coords[0],
            reliability: reliability,
            notes: report
        )
    }
}
