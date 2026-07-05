import Foundation
import SwiftData

// MARK: - WildfireCache

@Model
final class WildfireCache {
    var queryDate: Date
    var responseJSON: Data   // raw API response
    var stale: Bool

    init(queryDate: Date = .now, responseJSON: Data, stale: Bool = false) {
        self.queryDate = queryDate
        self.responseJSON = responseJSON
        self.stale = stale
    }

    /// Cache is stale after 4 hours (matches web wildfireService.js)
    static let cacheDuration: TimeInterval = 4 * 60 * 60

    var isExpired: Bool {
        Date.now.timeIntervalSince(queryDate) > Self.cacheDuration
    }
}

// MARK: - AirQualityCache

@Model
final class AirQualityCache {
    var queryDate: Date
    var location: String
    var aqi: Int?
    var category: String?
    var pm25: Int?
    var ozone: Int?
    var stale: Bool

    init(
        queryDate: Date = .now,
        location: String,
        aqi: Int? = nil,
        category: String? = nil,
        pm25: Int? = nil,
        ozone: Int? = nil,
        stale: Bool = false
    ) {
        self.queryDate = queryDate
        self.location = location
        self.aqi = aqi
        self.category = category
        self.pm25 = pm25
        self.ozone = ozone
        self.stale = stale
    }

    var isExpired: Bool {
        Date.now.timeIntervalSince(queryDate) > WildfireCache.cacheDuration
    }
}
