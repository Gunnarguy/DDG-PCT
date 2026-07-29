import Foundation

nonisolated struct TrailConditionsSnapshot: Codable, Sendable {
    var fetchedAt: String
    var planVersion: String?
    var route: String?
    var routeFacts: TrailConditionRouteFacts?
    var water: TrailWaterReport?
    var wildfire: TrailWildfireReport?
    var airQuality: TrailAirQualityReport?
    var weather: TrailWeatherReport?
    var agencyAlerts: [TrailAgencyAlert]?
    var bridgeCrossing: TrailBridgeCrossing?
    var campsiteAvailability: TrailManualCondition?
    var sourceStatus: [String: TrailConditionSourceState]?
    var cached: Bool?
    var persisted: Bool?

    var fetchedDate: Date? {
        TrailConditionDateParser.date(from: fetchedAt)
    }

    var age: TimeInterval? {
        fetchedDate.map { Date.now.timeIntervalSince($0) }
    }

    var isDailySnapshotStale: Bool {
        guard let age else { return true }
        return age > 26 * 60 * 60
    }

    func merging(sourceStatus: [String: TrailConditionSourceState]?) -> Self {
        var copy = self
        if let sourceStatus {
            copy.sourceStatus = sourceStatus
        }
        return copy
    }
}

nonisolated struct TrailConditionRouteFacts: Codable, Sendable {
    let name: String
    let officialMiles: Double
    let gpsMiles: Double
    let startPctMile: Double
    let finishPctMile: Double
}

nonisolated struct TrailWaterReport: Codable, Sendable {
    let updatedText: String?
    let count: Int
    let sources: [TrailWaterCondition]
    let sourceUrl: String?
}

nonisolated struct TrailWaterCondition: Codable, Sendable, Identifiable {
    var id: String { "\(mile)-\(waypoint ?? name)" }

    let mile: Double
    let waypoint: String?
    let name: String
    let latestReport: String
    let report: String?
    let reportDate: String?
    let observedAt: String?
    let reportDateSource: String?
    let metadataDate: String?
    let dateConflict: Bool?
    let ageDays: Int?
    let freshness: String?
    let reportedBy: String?
    let condition: String
}

nonisolated struct TrailWildfireReport: Codable, Sendable {
    let count: Int
    let source: String?
    let sourceUrl: String?
    let fires: [TrailWildfire]
    let unavailable: Bool?
}

nonisolated struct TrailWildfire: Codable, Sendable, Identifiable {
    var id: String { "\(name)-\(state ?? "")" }

    let name: String
    let acres: Int
    let containment: Int
    let state: String?
    let distanceToTrail: Double?
    let inMonitoringArea: Bool?
}

nonisolated struct TrailAirQualityReport: Codable, Sendable {
    let readings: [TrailAirQualityReading]
    let note: String?
}

nonisolated struct TrailAirQualityReading: Codable, Sendable, Identifiable {
    var id: String { location }

    let location: String
    let aqi: Int?
    let category: String?
    let pm25: Double?
    let pm25Unit: String?
    let ozone: Double?
    let ozoneUnit: String?
    let timestamp: String?
    let source: String?
}

nonisolated struct TrailWeatherReport: Codable, Sendable {
    let locations: [TrailWeatherLocation]
    let note: String?
}

nonisolated struct TrailWeatherLocation: Codable, Sendable, Identifiable {
    var id: String { location }

    let location: String
    let latitude: Double
    let longitude: Double
    let current: TrailCurrentWeather
    let daily: [TrailDailyWeather]
}

nonisolated struct TrailCurrentWeather: Codable, Sendable {
    let timestamp: String?
    let temperatureF: Double?
    let apparentTemperatureF: Double?
    let precipitationIn: Double?
    let weatherCode: Int?
    let windMph: Double?
    let gustMph: Double?
}

nonisolated struct TrailDailyWeather: Codable, Sendable, Identifiable {
    var id: String { date }

    let date: String
    let weatherCode: Int?
    let maxTemperatureF: Double?
    let minTemperatureF: Double?
    let precipitationIn: Double?
    let precipitationProbability: Int?
    let maxGustMph: Double?
    let sunrise: String?
    let sunset: String?
}

nonisolated struct TrailAgencyAlert: Codable, Sendable, Identifiable {
    var id: String { "\(agency)-\(text)" }

    let agency: String
    let text: String
    let url: String
}

nonisolated struct TrailBridgeCrossing: Codable, Sendable {
    let name: String
    let reports: [TrailWaterCondition]
    let verification: TrailConditionSourceState?
}

nonisolated struct TrailManualCondition: Codable, Sendable {
    let status: String
    let detail: String?
}

nonisolated struct TrailConditionSourceState: Codable, Sendable {
    let status: String
    let checkedAt: String?
    let url: String?
    let detail: String?
}

private nonisolated enum TrailConditionDateParser {
    static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let standard = ISO8601DateFormatter()

    static func date(from value: String) -> Date? {
        fractional.date(from: value) ?? standard.date(from: value)
    }
}
