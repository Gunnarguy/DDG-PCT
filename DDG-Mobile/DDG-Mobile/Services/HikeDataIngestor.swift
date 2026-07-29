import Foundation
import SwiftData

/// Parses the bundled hike_data.json and ingests it into SwiftData on first launch.
///
/// hike_data.json structure:
/// - `features[]` → CampSite models (GeoJSON Feature with properties)
/// - `route.path[]` → TrailPoint models ([longitude, latitude, elevation_feet])
struct HikeDataIngestor {
    private static let dataVersion = 13

    /// Check if data has already been ingested (avoid re-parsing 48k points)
    static func needsIngest(modelContext: ModelContext) -> Bool {
        print("DEBUG [HikeDataIngestor]: Checking database state...")
        
        let currentVersion = dataVersion // Supported Bartle itinerary and typed transfer/camp stops.
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

        // 1. Parse the active route path.
        var pathCount = 0
        var trailMiles: [(lat: Double, lon: Double, mile: Double, elev: Double)] = []
        
        if let route = json["route"] as? [String: Any],
           let path = route["path"] as? [[Double]] {
            print("DEBUG [HikeDataIngestor]: Parsing all \(path.count) trail points...")
            let metadata = route["metadata"] as? [String: Any]
            let elevationUnit = metadata?["elevation_unit"] as? String ?? "meters"
            
            var cumulativeDistance: Double = 0
            var lastLat: Double? = nil
            var lastLon: Double? = nil
            
            for point in path where point.count >= 3 {
                let lon = point[0]
                let lat = point[1]
                let sourceElevation = point[2]
                let elevationMeters = elevationUnit == "feet"
                    ? sourceElevation / TrailConstants.metersToFeet
                    : sourceElevation
                
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
                
                trailMiles.append((
                    lat: lat,
                    lon: lon,
                    mile: cumulativeDistance,
                    elev: elevationMeters
                ))
                lastLat = lat
                lastLon = lon
            }
            
            // Insert the active Burney Falls → Ash Camp route.
            for (index, item) in trailMiles.enumerated() {
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

        // 2. Parse the primary eight-day itinerary stops.
        var campCount = 0
        if let features = json["features"] as? [[String: Any]] {
            print("DEBUG [HikeDataIngestor]: Parsing \(features.count) waypoint features...")
            let routeMilesByDay = Dictionary(
                uniqueKeysWithValues: features.compactMap { feature -> (Int, Double)? in
                    guard let props = feature["properties"] as? [String: Any],
                          let day = (props["day"] as? NSNumber)?.intValue,
                          day >= 0,
                          let routeMile = (props["routeMile"] as? NSNumber)?.doubleValue else {
                        return nil
                    }
                    return (day, routeMile)
                }
            )
            for feature in features {
                if let camp = parseCampSite(from: feature, routeMilesByDay: routeMilesByDay) {
                    modelContext.insert(camp)
                    campCount += 1
                }
            }
            print("DEBUG [HikeDataIngestor]: Successfully inserted \(campCount) itinerary stops.")
        }
        
        // 3. Parse water sources and filter to those within 0.5 miles of the active trail.
        var waterCount = 0
        if let sources = json["waterSources"] as? [[String: Any]] {
            print("DEBUG [HikeDataIngestor]: Filtering and parsing \(sources.count) water sources...")
            for sourceDict in sources {
                if let water = parseWaterSource(from: sourceDict) {
                    var isNearTrail = false
                    for tp in trailMiles {
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
            print("DEBUG [HikeDataIngestor]: Successfully inserted \(waterCount) water sources near the active route.")
        }

        print("DEBUG [HikeDataIngestor]: Saving ModelContext...")
        try modelContext.save()
        
        // Save current version to UserDefaults to track ingestion state
        UserDefaults.standard.set(dataVersion, forKey: "hikeDataIngestVersion")
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

    private static func parseCampSite(
        from feature: [String: Any],
        routeMilesByDay: [Int: Double]
    ) -> CampSite? {
        guard let geometry = feature["geometry"] as? [String: Any],
              let coords = geometry["coordinates"] as? [Double], coords.count >= 2,
              let props = feature["properties"] as? [String: Any],
              let name = props["name"] as? String else {
            return nil
        }

        let type = props["type"] as? String ?? "Camp"
        let stopType = props["stopType"] as? String ?? (type == "Camp" ? "camp" : type.lowercased())
        let campStatus = props["campStatus"] as? String ?? ""
        let packMode = props["packMode"] as? String ?? "overnight-pack"
        let day = (props["day"] as? NSNumber)?.intValue ?? (props["day"] as? Int) ?? 0
        let itinerary = props["itinerary"] as? String

        if day >= 0 && itinerary != "express" {
            return nil
        }

        // Handle travel/assembly items
        if day == -1 {
            return CampSite(
                name: name,
                latitude: coords[1],
                longitude: coords[0],
                day: day,
                type: type,
                stopType: stopType,
                campStatus: campStatus,
                packMode: packMode,
                distance: 0,
                routeMile: 0,
                startElevation: props["startElevation"] as? String ?? "",
                endElevation: props["endElevation"] as? String ?? "",
                segment: props["segment"] as? String ?? "",
                notes: props["notes"] as? String ?? ""
            )
        }

        let routeMile = (props["routeMile"] as? NSNumber)?.doubleValue ?? 0
        let priorMile = day > 0 ? routeMilesByDay[day - 1] ?? 0 : 0
        let distance = day > 0 ? max(0, routeMile - priorMile) : 0
        let mappedType = day == 0 ? "Trailhead" : (day == 8 ? "Finish" : type)
        let sourceNotes = props["notes"] as? String ?? ""
        let verificationNotes: String
        if !sourceNotes.isEmpty {
            verificationNotes = sourceNotes
        } else if stopType == "support-transfer" {
            verificationNotes = "Timed support transfer only. Do not camp or linger; return to this exact pin before Day 4."
        } else if (1...7).contains(day) {
            verificationNotes = "Verify legal low-impact space, current hazards, and water before committing."
        } else {
            verificationNotes = ""
        }
        let profile = TrailConstants.profile(for: day)

        return CampSite(
            name: name,
            latitude: coords[1],
            longitude: coords[0],
            day: day,
            type: mappedType,
            stopType: stopType,
            campStatus: campStatus,
            packMode: packMode,
            distance: distance,
            routeMile: routeMile,
            startElevation: props["startElevation"] as? String
                ?? profile.map { "\(Int($0.startFeet.rounded())) ft" } ?? "",
            endElevation: props["endElevation"] as? String
                ?? profile.map { "\(Int($0.endFeet.rounded())) ft" } ?? "",
            segment: props["segment"] as? String ?? "",
            notes: verificationNotes
        )
    }

    private static func parseWaterSource(from dict: [String: Any]) -> WaterSource? {
        guard let coords = dict["coordinates"] as? [Double], coords.count >= 2,
              let name = dict["name"] as? String else {
            return nil
        }

        let report = dict["report"] as? String ?? ""
        let explicitReliability = dict["reliability"] as? String
        var reliability = explicitReliability ?? "unknown"
        if explicitReliability == nil {
            if report.lowercased().contains("flowing") || report.lowercased().contains("great") || report.lowercased().contains("tap on") {
                reliability = "excellent"
            } else if report.lowercased().contains("trickle") || report.lowercased().contains("seasonal") {
                reliability = "seasonal"
            } else if report.lowercased().contains("dry") {
                reliability = "sketchy"
            }
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
