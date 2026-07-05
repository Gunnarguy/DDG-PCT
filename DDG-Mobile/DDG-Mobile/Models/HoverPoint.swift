import Foundation
import CoreLocation

/// Model representing a selected/hovered point on the trail.
/// Conforms to Equatable and Sendable by storing coordinates as primitive Doubles.
struct HoverPoint: Equatable, Sendable {
    let latitude: Double
    let longitude: Double
    let mile: Double
    let elevationFeet: Double

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    static func == (lhs: HoverPoint, rhs: HoverPoint) -> Bool {
        lhs.latitude == rhs.latitude &&
        lhs.longitude == rhs.longitude &&
        lhs.mile == rhs.mile &&
        lhs.elevationFeet == rhs.elevationFeet
    }
}
