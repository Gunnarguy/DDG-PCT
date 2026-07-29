import CoreLocation
import Foundation

/// Road-route geometry bundled in hike_data.json.
///
/// These snapshots keep the Trail Map and Transit views consistent and
/// available offline. Live navigation must still be checked before driving.
struct DriveRouteSegment: Decodable, Sendable, Identifiable {
    let name: String
    let type: String
    let path: [[Double]]
    let distanceMiles: Double
    let durationHours: Double
    let source: String

    var id: String { name }

    var coordinates: [CLLocationCoordinate2D] {
        path.compactMap { pair in
            guard pair.count >= 2 else { return nil }
            return CLLocationCoordinate2D(latitude: pair[1], longitude: pair[0])
        }
    }
}

enum DriveRouteData {
    private struct Root: Decodable {
        let driveSegments: [DriveRouteSegment]
    }

    static let all: [DriveRouteSegment] = {
        guard let url = Bundle.main.url(forResource: "hike_data", withExtension: "json") else {
            print("ERROR [DriveRouteData]: Bundled hike_data.json was not found.")
            return []
        }

        do {
            let data = try Data(contentsOf: url)
            return try JSONDecoder().decode(Root.self, from: data).driveSegments
        } catch {
            print("ERROR [DriveRouteData]: Could not decode bundled drive routes: \(error)")
            return []
        }
    }()

    static var arrival: DriveRouteSegment? {
        all.first { $0.name == "SJC → Burney Falls" }
    }

    static var extraction: DriveRouteSegment? {
        all.first { $0.name == "Ash Camp → Campbell" }
    }
}
