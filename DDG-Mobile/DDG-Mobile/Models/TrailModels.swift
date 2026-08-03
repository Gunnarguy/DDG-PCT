import Foundation
import SwiftData
import CoreLocation

// MARK: - Segment Type

enum SegmentType: String, Codable {
    case hiking
    case drive
    case transit
}

// MARK: - TrailPoint (route path — from hike_data.json route.path)

@Model
final class TrailPoint {
    var latitude: Double
    var longitude: Double
    var elevation: Double   // meters
    var index: Int          // position in path array for ordering
    /// Explicit PCTA-calibrated mileage from the canonical terrain artifact.
    /// Never infer this from map geometry when the bundled value is present.
    var routeMile: Double = 0

    init(
        latitude: Double,
        longitude: Double,
        elevation: Double,
        index: Int,
        routeMile: Double = 0
    ) {
        self.latitude = latitude
        self.longitude = longitude
        self.elevation = elevation
        self.index = index
        self.routeMile = routeMile
    }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    /// Elevation in feet
    var elevationFeet: Double {
        elevation * 3.28084
    }
}

// MARK: - CampSite (features from hike_data.json)

@Model
final class CampSite {
    var name: String
    var latitude: Double
    var longitude: Double
    var day: Int
    var type: String           // "Trailhead", "Camp", "Support Transfer", "Finish"
    var stopType: String = "camp"       // "camp", "support-transfer", "finish"
    var campStatus: String = ""         // verification state from the canonical dataset
    var packMode: String = "overnight-pack" // "overnight-pack" or "day-pack-supported"
    var distance: Double       // miles from previous camp
    var routeMile: Double      // cumulative trail mileage
    var startElevation: String
    var endElevation: String
    var segment: String        // narrative description
    var notes: String

    init(
        name: String,
        latitude: Double,
        longitude: Double,
        day: Int,
        type: String,
        stopType: String = "camp",
        campStatus: String = "",
        packMode: String = "overnight-pack",
        distance: Double,
        routeMile: Double,
        startElevation: String = "",
        endElevation: String = "",
        segment: String = "",
        notes: String = ""
    ) {
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.day = day
        self.type = type
        self.stopType = stopType
        self.campStatus = campStatus
        self.packMode = packMode
        self.distance = distance
        self.routeMile = routeMile
        self.startElevation = startElevation
        self.endElevation = endElevation
        self.segment = segment
        self.notes = notes
    }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

// MARK: - WaterSource

@Model
final class WaterSource {
    var name: String
    var latitude: Double
    var longitude: Double
    var reliability: String
    var notes: String?
    var pctMile: Double = 0
    var routeMile: Double = 0
    var waypoint: String = ""

    init(
        name: String,
        latitude: Double,
        longitude: Double,
        reliability: String,
        notes: String? = nil,
        pctMile: Double = 0,
        routeMile: Double = 0,
        waypoint: String = ""
    ) {
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.reliability = reliability
        self.notes = notes
        self.pctMile = pctMile
        self.routeMile = routeMile
        self.waypoint = waypoint
    }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}
