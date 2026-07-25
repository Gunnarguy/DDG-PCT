import Foundation
import SwiftData

/// Fetches wildfire perimeters and air quality data for the Section O corridor.
/// Caches responses in SwiftData for offline access (4hr TTL).
actor WildfireService {
    static let shared = WildfireService()

    // MARK: - Section O Bounding Box

    static let sectionOBBox = (west: -122.5, south: 40.8, east: -121.0, north: 41.3)

    // Trail centroid for distance calculations
    static let trailCentroid = (latitude: 41.09, longitude: -121.81)

    // MARK: - AQ Monitoring Points

    struct MonitoringPoint: Sendable {
        let name: String
        let latitude: Double
        let longitude: Double
    }

    static let aqMonitoringPoints: [MonitoringPoint] = [
        MonitoringPoint(name: "Burney Falls", latitude: 41.013, longitude: -121.653),
        MonitoringPoint(name: "Hat Creek",    latitude: 41.027, longitude: -121.732),
        MonitoringPoint(name: "Ash Camp", latitude: 41.1171, longitude: -122.0606),
    ]

    // MARK: - API Endpoints

    static let nifcBaseURL = "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Perimeters/FeatureServer/0/query"

    static let epaBaseURL = "https://www.airnowapi.org/aq/observation/latLong/current/"

    // MARK: - Wildfire Data

    struct WildfireInfo: Sendable {
        let name: String
        let acres: Int
        let containment: Int
        let discovered: Date?
        let state: String
        let distanceToTrail: Double?
    }

    // ArcGIS JSON response structures
    private struct ArcGISResponse: Decodable {
        let features: [ArcGISFeature]?
    }

    private struct ArcGISFeature: Decodable {
        let attributes: ArcGISAttributes
    }

    private struct ArcGISAttributes: Decodable {
        let IncidentName: String?
        let GISAcres: Double?
        let PercentContained: Double?
        let FireDiscoveryDateTime: Double?  // epoch millis
        let POOState: String?
    }

    /// Fetch active fire perimeters within the Section O bounding box
    func fetchWildfires() async throws -> [WildfireInfo] {
        let bbox = Self.sectionOBBox
        let geometry = "\(bbox.west),\(bbox.south),\(bbox.east),\(bbox.north)"

        var components = URLComponents(string: Self.nifcBaseURL)!
        components.queryItems = [
            URLQueryItem(name: "where", value: "1=1"),
            URLQueryItem(name: "geometry", value: geometry),
            URLQueryItem(name: "geometryType", value: "esriGeometryEnvelope"),
            URLQueryItem(name: "spatialRel", value: "esriSpatialRelIntersects"),
            URLQueryItem(name: "outFields", value: "IncidentName,GISAcres,PercentContained,FireDiscoveryDateTime,POOState"),
            URLQueryItem(name: "returnGeometry", value: "false"),
            URLQueryItem(name: "f", value: "json"),
        ]

        let (data, _) = try await URLSession.shared.data(from: components.url!)
        let response = try JSONDecoder().decode(ArcGISResponse.self, from: data)

        return (response.features ?? []).compactMap { feature in
            let attrs = feature.attributes
            let discovered: Date? = attrs.FireDiscoveryDateTime.map {
                Date(timeIntervalSince1970: $0 / 1000.0)
            }
            return WildfireInfo(
                name: attrs.IncidentName ?? "Unknown",
                acres: Int(attrs.GISAcres ?? 0),
                containment: Int(attrs.PercentContained ?? 0),
                discovered: discovered,
                state: attrs.POOState ?? "CA",
                distanceToTrail: nil
            )
        }
    }

    // MARK: - Air Quality

    struct AQIReading: Sendable {
        let location: String
        let aqi: Int?
        let category: String?
        let pm25: Int?
        let ozone: Int?
        let timestamp: Date
    }

    // EPA AirNow JSON response structure
    private struct EPAObservation: Decodable {
        let DateObserved: String?
        let HourObserved: Int?
        let ParameterName: String?
        let AQI: Int?
        let Category: EPACategory?
    }

    private struct EPACategory: Decodable {
        let Name: String?
    }

    /// Fetch current AQI for all monitoring points
    func fetchAirQuality(apiKey: String) async throws -> [AQIReading] {
        var readings: [AQIReading] = []

        for point in Self.aqMonitoringPoints {
            var components = URLComponents(string: Self.epaBaseURL)!
            components.queryItems = [
                URLQueryItem(name: "format", value: "application/json"),
                URLQueryItem(name: "latitude", value: String(point.latitude)),
                URLQueryItem(name: "longitude", value: String(point.longitude)),
                URLQueryItem(name: "distance", value: "25"),
                URLQueryItem(name: "API_KEY", value: apiKey),
            ]

            do {
                let (data, _) = try await URLSession.shared.data(from: components.url!)
                let observations = try JSONDecoder().decode([EPAObservation].self, from: data)

                var pm25: Int?
                var ozone: Int?
                var bestAQI: Int?
                var bestCategory: String?

                for obs in observations {
                    let param = obs.ParameterName?.uppercased() ?? ""
                    if param.contains("PM2.5") {
                        pm25 = obs.AQI
                    } else if param.contains("OZONE") {
                        ozone = obs.AQI
                    }
                    // Use highest AQI as the overall reading
                    if let aqi = obs.AQI, aqi > (bestAQI ?? 0) {
                        bestAQI = aqi
                        bestCategory = obs.Category?.Name
                    }
                }

                readings.append(AQIReading(
                    location: point.name,
                    aqi: bestAQI,
                    category: bestCategory,
                    pm25: pm25,
                    ozone: ozone,
                    timestamp: .now
                ))
            } catch {
                readings.append(AQIReading(
                    location: point.name, aqi: nil, category: "Error",
                    pm25: nil, ozone: nil, timestamp: .now
                ))
            }
        }

        return readings
    }

    // MARK: - Cache Integration

    /// Fetch wildfires with SwiftData caching (4hr TTL)
    @MainActor
    func fetchWildfiresWithCache(modelContext: ModelContext) async -> [WildfireInfo] {
        // Check cache
        let descriptor = FetchDescriptor<WildfireCache>(
            sortBy: [SortDescriptor(\.queryDate, order: .reverse)]
        )
        if let cached = try? modelContext.fetch(descriptor).first, !cached.isExpired {
            if let response = try? JSONDecoder().decode(ArcGISResponse.self, from: cached.responseJSON) {
                return (response.features ?? []).compactMap { feature in
                    let attrs = feature.attributes
                    return WildfireInfo(
                        name: attrs.IncidentName ?? "Unknown",
                        acres: Int(attrs.GISAcres ?? 0),
                        containment: Int(attrs.PercentContained ?? 0),
                        discovered: attrs.FireDiscoveryDateTime.map { Date(timeIntervalSince1970: $0 / 1000.0) },
                        state: attrs.POOState ?? "CA",
                        distanceToTrail: nil
                    )
                }
            }
        }

        // Fetch fresh
        do {
            let bbox = Self.sectionOBBox
            let geometry = "\(bbox.west),\(bbox.south),\(bbox.east),\(bbox.north)"
            var components = URLComponents(string: Self.nifcBaseURL)!
            components.queryItems = [
                URLQueryItem(name: "where", value: "1=1"),
                URLQueryItem(name: "geometry", value: geometry),
                URLQueryItem(name: "geometryType", value: "esriGeometryEnvelope"),
                URLQueryItem(name: "spatialRel", value: "esriSpatialRelIntersects"),
                URLQueryItem(name: "outFields", value: "IncidentName,GISAcres,PercentContained,FireDiscoveryDateTime,POOState"),
                URLQueryItem(name: "returnGeometry", value: "false"),
                URLQueryItem(name: "f", value: "json"),
            ]
            let (data, _) = try await URLSession.shared.data(from: components.url!)

            // Cache raw response
            let cache = WildfireCache(responseJSON: data)
            modelContext.insert(cache)
            try? modelContext.save()

            let response = try JSONDecoder().decode(ArcGISResponse.self, from: data)
            return (response.features ?? []).compactMap { feature in
                let attrs = feature.attributes
                return WildfireInfo(
                    name: attrs.IncidentName ?? "Unknown",
                    acres: Int(attrs.GISAcres ?? 0),
                    containment: Int(attrs.PercentContained ?? 0),
                    discovered: attrs.FireDiscoveryDateTime.map { Date(timeIntervalSince1970: $0 / 1000.0) },
                    state: attrs.POOState ?? "CA",
                    distanceToTrail: nil
                )
            }
        } catch {
            return []
        }
    }

    /// Fetch AQI with SwiftData caching (4hr TTL)
    @MainActor
    func fetchAQIWithCache(modelContext: ModelContext, apiKey: String) async -> [AQIReading] {
        // Check cache
        let descriptor = FetchDescriptor<AirQualityCache>(
            sortBy: [SortDescriptor(\.queryDate, order: .reverse)]
        )
        if let cached = try? modelContext.fetch(descriptor), !cached.isEmpty,
           let newest = cached.first, !newest.isExpired {
            return cached.filter { !$0.isExpired }.map { c in
                AQIReading(
                    location: c.location,
                    aqi: c.aqi,
                    category: c.category,
                    pm25: c.pm25,
                    ozone: c.ozone,
                    timestamp: c.queryDate
                )
            }
        }

        // Fetch fresh
        do {
            let readings = try await fetchAirQuality(apiKey: apiKey)
            // Cache each reading
            for reading in readings {
                let cache = AirQualityCache(
                    location: reading.location,
                    aqi: reading.aqi,
                    category: reading.category,
                    pm25: reading.pm25,
                    ozone: reading.ozone
                )
                modelContext.insert(cache)
            }
            try? modelContext.save()
            return readings
        } catch {
            return []
        }
    }
}
