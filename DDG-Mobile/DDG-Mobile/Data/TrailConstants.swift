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
    let gainFeet: Double
    let lossFeet: Double
    let startFeet: Double
    let endFeet: Double
    let highPointFeet: Double
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

// MARK: - Trail Constants

enum TrailConstants {
    static let milesToMeters: Double = 1609.34
    static let metersToFeet: Double = 3.28084

    // Smoothing window for GPS noise (5-point moving average)
    static let smoothingWindow: Int = 5

    // Minimum elevation change to count as gain/loss (feet)
    static let elevationThreshold: Double = 10.0

    // Naismith's rule parameters (conservative for loaded hikers)
    static let baseSpeedMph: Double = 2.5
    static let gainPerHourFt: Double = 1500.0

    /// Estimate hiking time using Naismith's rule
    static func estimatedTime(miles: Double, gainFeet: Double) -> Double {
        let baseTime = miles / baseSpeedMph
        let gainTime = gainFeet / gainPerHourFt
        return baseTime + gainTime  // hours
    }

    /// Smoothed Garmin-derived terrain for the primary eight-day, 51.844-official-mile itinerary.
    static let dayProfiles: [TrailDayProfile] = [
        TrailDayProfile(day: 1, miles: 5.609, gainFeet: 613, lossFeet: 522, startFeet: 2_949, endFeet: 3_043, highPointFeet: 3_223, difficultyRank: 5, kneeLoad: .low, note: "A deliberately shorter opening day after the early drive from SJC. Rolling terrain still adds more than 1,100 vertical feet."),
        TrailDayProfile(day: 2, miles: 8.678, gainFeet: 2_199, lossFeet: 276, startFeet: 3_043, endFeet: 4_961, highPointFeet: 5_053, difficultyRank: 2, kneeLoad: .low, note: "The biggest climbing day, ending at the screened USFS dry camp. Protect pace and carry verified water through camp."),
        TrailDayProfile(day: 3, miles: 12.591, gainFeet: 1_424, lossFeet: 1_312, startFeet: 4_961, endFeet: 5_082, highPointFeet: 5_490, difficultyRank: 1, kneeLoad: .high, note: "The longest day, completed with day packs as a continuous private-timberland traverse. Meet the driver at the exact Bartle Gap pin; do not camp or linger there."),
        TrailDayProfile(day: 4, miles: 5.369, gainFeet: 1_209, lossFeet: 157, startFeet: 5_082, endFeet: 6_128, highPointFeet: 6_146, difficultyRank: 6, kneeLoad: .low, note: "Return to the exact Bartle Gap crossing, then climb to the route high point and dry camp."),
        TrailDayProfile(day: 5, miles: 3.789, gainFeet: 83, lossFeet: 813, startFeet: 6_128, endFeet: 5_394, highPointFeet: 6_146, difficultyRank: 8, kneeLoad: .moderate, note: "Low aerobic load, but mostly downhill. Use poles and keep the descent controlled."),
        TrailDayProfile(day: 6, miles: 6.350, gainFeet: 873, lossFeet: 1_065, startFeet: 5_394, endFeet: 5_197, highPointFeet: 5_688, difficultyRank: 3, kneeLoad: .high, note: "Nearly 2,000 vertical feet of mixed terrain on accumulated fatigue."),
        TrailDayProfile(day: 7, miles: 5.604, gainFeet: 0, lossFeet: 1_834, startFeet: 5_197, endFeet: 3_360, highPointFeet: 5_197, difficultyRank: 4, kneeLoad: .veryHigh, note: "The knee day: roughly 327 feet of descent per mile. Slow down, shorten stride, and use poles."),
        TrailDayProfile(day: 8, miles: 3.854, gainFeet: 0, lossFeet: 917, startFeet: 3_360, endFeet: 2_443, highPointFeet: 3_360, difficultyRank: 7, kneeLoad: .high, note: "Short extraction morning, but still about 238 feet of descent per mile before Ash Camp pickup.")
    ]

    static var totalMiles: Double { dayProfiles.reduce(0) { $0 + $1.miles } }
    static var totalGainFeet: Double { dayProfiles.reduce(0) { $0 + $1.gainFeet } }
    static var totalLossFeet: Double { dayProfiles.reduce(0) { $0 + $1.lossFeet } }

    static func profile(for day: Int) -> TrailDayProfile? {
        dayProfiles.first { $0.day == day }
    }

    static func elevationGain(for day: Int) -> Double {
        profile(for: day)?.gainFeet ?? 0
    }

    static func elevationLoss(for day: Int) -> Double {
        profile(for: day)?.lossFeet ?? 0
    }
}
