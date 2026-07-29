import Foundation

// MARK: - Altitude Physiology Zones

struct AltitudeZone: Identifiable, Sendable {
    let id: String
    let name: String
    let minFt: Double
    let maxFt: Double
    let fillColor: String      // rgba
    let borderColor: String    // hex
    let risk: String           // "none", "low", "moderate", "high"
    let description: String
    let symptoms: [String]
    let mitigation: String
}

let altitudeZones: [AltitudeZone] = [
    AltitudeZone(
        id: "sea-level", name: "Sea Level", minFt: 0, maxFt: 4000,
        fillColor: "rgba(76, 175, 80, 0.12)", borderColor: "#4CAF50",
        risk: "none", description: "Normal oxygen levels, no altitude effects",
        symptoms: [],
        mitigation: "None needed"
    ),
    AltitudeZone(
        id: "moderate", name: "Moderate Altitude", minFt: 4000, maxFt: 8000,
        fillColor: "rgba(255, 193, 7, 0.12)", borderColor: "#FFC107",
        risk: "low", description: "Slight decrease in oxygen availability",
        symptoms: ["Slight breathlessness", "Mild headache"],
        mitigation: "Stay hydrated, pace yourself"
    ),
    AltitudeZone(
        id: "high", name: "High Altitude", minFt: 8000, maxFt: 12000,
        fillColor: "rgba(255, 152, 0, 0.15)", borderColor: "#FF9800",
        risk: "moderate", description: "Noticeable oxygen reduction, AMS risk",
        symptoms: ["Headache", "Nausea", "Fatigue", "Dizziness", "Sleep disturbance"],
        mitigation: "Slow ascent, extra hydration, consider acclimatization day"
    ),
    AltitudeZone(
        id: "very-high", name: "Very High Altitude", minFt: 12000, maxFt: 18000,
        fillColor: "rgba(244, 67, 54, 0.18)", borderColor: "#F44336",
        risk: "high", description: "Significant AMS risk, potential for HAPE/HACE",
        symptoms: ["Severe headache", "Confusion", "Ataxia", "Cough", "Chest tightness"],
        mitigation: "Descend immediately if symptoms worsen"
    ),
]

// MARK: - Grade Difficulty

struct GradeDifficulty: Sendable {
    let label: String
    let color: String   // hex
}

func gradeDifficulty(for percent: Double) -> GradeDifficulty {
    let abs = Swift.abs(percent)
    if abs < 5       { return GradeDifficulty(label: "easy",     color: "#4CAF50") }
    else if abs < 10 { return GradeDifficulty(label: "moderate", color: "#FFC107") }
    else if abs < 15 { return GradeDifficulty(label: "steep",    color: "#FF9800") }
    else             { return GradeDifficulty(label: "brutal",   color: "#F44336") }
}

// MARK: - Daily Terrain

enum KneeLoadLevel: String, Sendable {
    case low
    case moderate
    case high
    case veryHigh = "very high"
}

struct TrailDayProfile: Identifiable, Sendable {
    let day: Int
    let miles: Double
    let routeMileStart: Double
    let routeMileEnd: Double
    let gainFeet: Double
    let lossFeet: Double
    let startFeet: Double
    let endFeet: Double
    let highPointFeet: Double
    let packMode: String
    let difficultyRank: Int
    let kneeLoad: KneeLoadLevel
    let note: String

    var id: Int { day }
    var netFeet: Double { endFeet - startFeet }
    var totalVerticalFeet: Double { gainFeet + lossFeet }
    var ascentPerMile: Double { gainFeet / miles }
    var descentPerMile: Double { lossFeet / miles }

    /// Distance adjusted for climbing and descending stress. This is a comparison
    /// aid, not a prediction of elapsed time.
    var effortMiles: Double {
        miles + gainFeet / 2_000 + lossFeet / 4_000
    }
}

struct TrailTimeEstimate: Sendable {
    let movingHours: Double
    let lowHours: Double
    let highHours: Double

    var rangeLabel: String {
        "\(Self.hourLabel(lowHours))–\(Self.hourLabel(highHours)) hr"
    }

    private static func hourLabel(_ value: Double) -> String {
        let isHalfHour = (value * 2).rounded() == value * 2
        return String(format: isHalfHour ? "%.1f" : "%.2f", value)
    }
}

// MARK: - Trail Constants

enum TrailConstants {
    static let milesToMeters: Double = 1609.34
    static let metersToFeet: Double = 3.28084

    // Legacy raw-segment helpers use this guard only when no normalized day
    // contract is available. User-facing daily metrics never use this fallback.
    static let elevationThreshold: Double = 20.0

    /// Normalized metrics are decoded from the same bundled JSON consumed by the map.
    /// The fallback exists only for previews or a damaged bundle.
    static let dayProfiles: [TrailDayProfile] = loadDayProfiles()

    static var totalMiles: Double { dayProfiles.reduce(0) { $0 + $1.miles } }
    static var totalGainFeet: Double { dayProfiles.reduce(0) { $0 + $1.gainFeet } }
    static var totalLossFeet: Double { dayProfiles.reduce(0) { $0 + $1.lossFeet } }
    static var totalTimeEstimate: TrailTimeEstimate {
        TrailTimeEstimate(
            movingHours: dayProfiles.reduce(0) { $0 + timeEstimate(for: $1).movingHours },
            lowHours: dayProfiles.reduce(0) { $0 + timeEstimate(for: $1).lowHours },
            highHours: dayProfiles.reduce(0) { $0 + timeEstimate(for: $1).highHours }
        )
    }

    static func profile(for day: Int) -> TrailDayProfile? {
        dayProfiles.first { $0.day == day }
    }

    static func elevationGain(for day: Int) -> Double {
        profile(for: day)?.gainFeet ?? 0
    }

    static func elevationLoss(for day: Int) -> Double {
        profile(for: day)?.lossFeet ?? 0
    }

    /// Loaded hikers are modeled at 1.85 mph over effort-adjusted distance.
    /// Day 3 uses 2.1 mph because overnight packs are transferred. The displayed
    /// range adds 12–35% for short breaks, navigation, water, and group pacing.
    static func timeEstimate(for profile: TrailDayProfile) -> TrailTimeEstimate {
        let speed = profile.packMode == "day-pack-supported" ? 2.1 : 1.85
        let moving = profile.effortMiles / speed
        return TrailTimeEstimate(
            movingHours: moving,
            lowHours: quarterHour(moving * 1.12),
            highHours: quarterHour(moving * 1.35)
        )
    }

    static func timeEstimate(
        miles: Double,
        gainFeet: Double,
        lossFeet: Double,
        packMode: String = "overnight-pack"
    ) -> TrailTimeEstimate {
        let effortMiles = miles + gainFeet / 2_000 + lossFeet / 4_000
        let speed = packMode == "day-pack-supported" ? 2.1 : 1.85
        let moving = effortMiles / speed
        return TrailTimeEstimate(
            movingHours: moving,
            lowHours: quarterHour(moving * 1.12),
            highHours: quarterHour(moving * 1.35)
        )
    }

    private struct BundleData: Decodable {
        let route: Route

        struct Route: Decodable {
            let properties: Properties
        }

        struct Properties: Decodable {
            let segments: [Segment]
        }

        struct Segment: Decodable {
            let day: Int
            let distance: Double
            let gain: Double
            let loss: Double
            let startElevation: Double
            let endElevation: Double
            let highPoint: Double
            let packMode: String
        }
    }

    private struct DayContext {
        let difficultyRank: Int
        let kneeLoad: KneeLoadLevel
        let note: String
    }

    private static let dayContext: [Int: DayContext] = [
        1: DayContext(difficultyRank: 5, kneeLoad: .low, note: "A deliberately shorter opening day after the early drive from SJC. Rolling terrain still adds about 1,300 vertical feet."),
        2: DayContext(difficultyRank: 2, kneeLoad: .low, note: "The biggest climbing day, ending at the screened USFS dry camp. Protect pace and carry verified water through camp."),
        3: DayContext(difficultyRank: 1, kneeLoad: .high, note: "The longest day, completed with day packs as a continuous private-timberland traverse. Meet the driver at the exact Bartle Gap pin; do not camp or linger there."),
        4: DayContext(difficultyRank: 6, kneeLoad: .low, note: "Return to the exact Bartle Gap crossing, then climb to the route high point and dry camp."),
        5: DayContext(difficultyRank: 8, kneeLoad: .moderate, note: "Low aerobic load, but mostly downhill. Use poles and keep the descent controlled."),
        6: DayContext(difficultyRank: 3, kneeLoad: .high, note: "More than 1,900 vertical feet of mixed terrain on accumulated fatigue."),
        7: DayContext(difficultyRank: 4, kneeLoad: .veryHigh, note: "The knee day: roughly 319 feet of descent per mile. Slow down, shorten stride, and use poles."),
        8: DayContext(difficultyRank: 7, kneeLoad: .high, note: "Short extraction morning, but still about 276 feet of descent per mile before Ash Camp pickup.")
    ]

    private static func loadDayProfiles() -> [TrailDayProfile] {
        guard
            let url = Bundle.main.url(forResource: "hike_data", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let bundleData = try? JSONDecoder().decode(BundleData.self, from: data)
        else {
            return fallbackProfiles
        }

        var routeMile = 0.0
        return bundleData.route.properties.segments.map { segment in
            let startMile = routeMile
            routeMile += segment.distance
            let context = dayContext[segment.day] ?? DayContext(
                difficultyRank: segment.day,
                kneeLoad: .moderate,
                note: ""
            )
            return TrailDayProfile(
                day: segment.day,
                miles: segment.distance,
                routeMileStart: startMile,
                routeMileEnd: routeMile,
                gainFeet: segment.gain,
                lossFeet: segment.loss,
                startFeet: segment.startElevation,
                endFeet: segment.endElevation,
                highPointFeet: segment.highPoint,
                packMode: segment.packMode,
                difficultyRank: context.difficultyRank,
                kneeLoad: context.kneeLoad,
                note: context.note
            )
        }
    }

    private static let fallbackProfiles: [TrailDayProfile] = [
        TrailDayProfile(day: 1, miles: 5.609, routeMileStart: 0, routeMileEnd: 5.609, gainFeet: 700, lossFeet: 600, startFeet: 3_001, endFeet: 3_119, highPointFeet: 3_240, packMode: "overnight-pack", difficultyRank: 5, kneeLoad: .low, note: dayContext[1]!.note),
        TrailDayProfile(day: 2, miles: 8.678, routeMileStart: 5.609, routeMileEnd: 14.287, gainFeet: 2_175, lossFeet: 268, startFeet: 3_119, endFeet: 5_017, highPointFeet: 5_101, packMode: "overnight-pack", difficultyRank: 2, kneeLoad: .low, note: dayContext[2]!.note),
        TrailDayProfile(day: 3, miles: 12.591, routeMileStart: 14.287, routeMileEnd: 26.878, gainFeet: 1_510, lossFeet: 1_388, startFeet: 5_017, endFeet: 5_139, highPointFeet: 5_524, packMode: "day-pack-supported", difficultyRank: 1, kneeLoad: .high, note: dayContext[3]!.note),
        TrailDayProfile(day: 4, miles: 5.369, routeMileStart: 26.878, routeMileEnd: 32.247, gainFeet: 1_056, lossFeet: 86, startFeet: 5_139, endFeet: 6_110, highPointFeet: 6_125, packMode: "overnight-pack", difficultyRank: 6, kneeLoad: .low, note: dayContext[4]!.note),
        TrailDayProfile(day: 5, miles: 3.789, routeMileStart: 32.247, routeMileEnd: 36.036, gainFeet: 159, lossFeet: 764, startFeet: 6_110, endFeet: 5_504, highPointFeet: 6_129, packMode: "overnight-pack", difficultyRank: 8, kneeLoad: .moderate, note: dayContext[5]!.note),
        TrailDayProfile(day: 6, miles: 6.350, routeMileStart: 36.036, routeMileEnd: 42.386, gainFeet: 828, lossFeet: 1_095, startFeet: 5_504, endFeet: 5_227, highPointFeet: 5_683, packMode: "overnight-pack", difficultyRank: 3, kneeLoad: .high, note: dayContext[6]!.note),
        TrailDayProfile(day: 7, miles: 5.604, routeMileStart: 42.386, routeMileEnd: 47.990, gainFeet: 23, lossFeet: 1_786, startFeet: 5_227, endFeet: 3_447, highPointFeet: 5_227, packMode: "overnight-pack", difficultyRank: 4, kneeLoad: .veryHigh, note: dayContext[7]!.note),
        TrailDayProfile(day: 8, miles: 3.854, routeMileStart: 47.990, routeMileEnd: 51.844, gainFeet: 73, lossFeet: 1_063, startFeet: 3_447, endFeet: 2_457, highPointFeet: 3_447, packMode: "overnight-pack", difficultyRank: 7, kneeLoad: .high, note: dayContext[8]!.note)
    ]

    private static func quarterHour(_ hours: Double) -> Double {
        (hours * 4).rounded() / 4
    }
}
