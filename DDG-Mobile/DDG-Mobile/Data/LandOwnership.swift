import Foundation
import CoreLocation

/// Land-ownership parcels along the Burney Falls → Ash Camp corridor, decoded
/// from the bundled `land_ownership.geojson` produced by
/// `scripts/build_land_ownership.mjs` off the Shasta County assessor roll.
///
/// This ships as a bundled file rather than a live query because the one place
/// it matters most — standing on the trail deciding whether you may pitch a
/// tent — is the one place with no signal.
///
/// The PCTA closure map renders only the parcels covered by a single alert, so
/// Shasta Cascade and Pondosa ground reads as plain green there while being
/// fully private. This layer shows every assessed parcel instead.
enum LandOwnership {

    /// Ownership classes, ordered so the safest reading wins on ambiguity:
    /// anything not positively identified as public is treated as private.
    enum Category: String, Decodable {
        case publicLand = "public"
        case privateTimberland = "private-timberland"
        case privateOther = "private"
        case tribal
        case unknown

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = Category(rawValue: raw) ?? .unknown
        }

        /// Whether stopping to sleep here is permissible at all.
        var allowsCamping: Bool { self == .publicLand }

        var label: String {
            switch self {
            case .publicLand: return "Public land"
            case .privateTimberland: return "Private timberland"
            case .privateOther: return "Private land"
            case .tribal: return "Tribal land"
            case .unknown: return "Unknown ownership"
            }
        }

        /// The rule that actually governs behaviour on this ground.
        var rule: String {
            switch self {
            case .publicLand:
                return "Dispersed camping is generally allowed, subject to current fire restrictions and agency rules. Those still need a same-week check."
            case .privateTimberland:
                return "PCT passage is allowed here under the active PCTA alert. Camping, campfires, stoves and any ignition source, smoking, and extended stops are not. Travel carefully and continuously."
            case .privateOther:
                return "Private property outside the PCTA timberland alert. No camping and no assumed right of entry off the trail corridor."
            case .tribal:
                return "Tribal land. Do not treat this as public access or as ordinary private timberland; entry and use are governed by the tribe."
            case .unknown:
                return "Ownership could not be classified. Treat as private until confirmed."
            }
        }
    }

    struct Parcel: Identifiable {
        let id: String
        let apn: String
        let assessee: String
        let category: Category
        let acres: Double?
        /// Outer rings only. Interior rings are dropped for rendering; the
        /// popup text, not the fill, is what anyone acts on.
        let polygons: [[CLLocationCoordinate2D]]
    }

    // MARK: - Decoding

    private struct FeatureCollection: Decodable {
        let generatedAt: String?
        let source: String?
        let caveat: String?
        let features: [Feature]
    }

    private struct Feature: Decodable {
        let geometry: Geometry
        let properties: Properties
    }

    private struct Properties: Decodable {
        let apn: String
        let assessee: String
        let ownership: Category
        let acres: Double?
    }

    /// GeoJSON allows both Polygon and MultiPolygon here, so nesting depth
    /// differs by type and has to be decoded accordingly.
    private struct Geometry: Decodable {
        let type: String
        let polygons: [[[[Double]]]]

        private enum CodingKeys: String, CodingKey {
            case type, coordinates
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            type = try container.decode(String.self, forKey: .type)
            if type == "Polygon" {
                let rings = try container.decode([[[Double]]].self, forKey: .coordinates)
                polygons = [rings]
            } else {
                polygons = try container.decode([[[[Double]]]].self, forKey: .coordinates)
            }
        }
    }

    // MARK: - Loading

    private(set) static var generatedAt: String?
    private(set) static var sourceDescription: String?
    private(set) static var caveat: String?

    /// Loaded once and cached. Returns an empty array if the resource is
    /// missing or malformed — callers must treat empty as "unknown", never as
    /// "all public".
    static let parcels: [Parcel] = load()

    private static func load() -> [Parcel] {
        guard let url = Bundle.main.url(forResource: "land_ownership", withExtension: "geojson"),
              let data = try? Data(contentsOf: url) else {
            return []
        }
        do {
            let collection = try JSONDecoder().decode(FeatureCollection.self, from: data)
            generatedAt = collection.generatedAt
            sourceDescription = collection.source
            caveat = collection.caveat
            return collection.features.compactMap { feature in
                let rings = feature.geometry.polygons.compactMap { polygon -> [CLLocationCoordinate2D]? in
                    guard let outer = polygon.first else { return nil }
                    let coordinates = outer.compactMap { pair -> CLLocationCoordinate2D? in
                        guard pair.count >= 2 else { return nil }
                        return CLLocationCoordinate2D(latitude: pair[1], longitude: pair[0])
                    }
                    return coordinates.count >= 3 ? coordinates : nil
                }
                guard !rings.isEmpty else { return nil }
                return Parcel(
                    id: feature.properties.apn,
                    apn: feature.properties.apn,
                    assessee: feature.properties.assessee,
                    category: feature.properties.ownership,
                    acres: feature.properties.acres,
                    polygons: rings
                )
            }
        } catch {
            return []
        }
    }

    // MARK: - Lookup

    /// Ray-casting point-in-polygon. Used to answer "who owns the ground I am
    /// standing on" without a network call.
    static func parcel(at coordinate: CLLocationCoordinate2D) -> Parcel? {
        parcels.first { parcel in
            parcel.polygons.contains { ring in
                contains(coordinate, ring: ring)
            }
        }
    }

    private static func contains(_ point: CLLocationCoordinate2D, ring: [CLLocationCoordinate2D]) -> Bool {
        var inside = false
        var j = ring.count - 1
        for i in 0..<ring.count {
            let a = ring[i]
            let b = ring[j]
            let straddles = (a.latitude > point.latitude) != (b.latitude > point.latitude)
            if straddles {
                let crossing = (b.longitude - a.longitude) * (point.latitude - a.latitude)
                    / (b.latitude - a.latitude) + a.longitude
                if point.longitude < crossing { inside.toggle() }
            }
            j = i
        }
        return inside
    }
}
