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

    /// Smoothed GPS-derived terrain for the primary nine-day, 54.2-mile itinerary.
    static let dayProfiles: [TrailDayProfile] = [
        TrailDayProfile(day: 1, miles: 8.2, gainFeet: 713, lossFeet: 690, startFeet: 3_020, endFeet: 3_043, highPointFeet: 3_223, difficultyRank: 2, kneeLoad: .moderate, note: "A long opening day. The rolling terrain hides almost as much descent as climbing."),
        TrailDayProfile(day: 2, miles: 8.0, gainFeet: 2_027, lossFeet: 302, startFeet: 3_043, endFeet: 4_769, highPointFeet: 5_053, difficultyRank: 1, kneeLoad: .low, note: "The biggest climbing day by far. Protect pace early and budget extra water and calories."),
        TrailDayProfile(day: 3, miles: 7.7, gainFeet: 1_058, lossFeet: 702, startFeet: 4_769, endFeet: 5_126, highPointFeet: 5_490, difficultyRank: 3, kneeLoad: .moderate, note: "Sustained mixed terrain on tired legs after the hardest climbing day."),
        TrailDayProfile(day: 4, miles: 6.7, gainFeet: 852, lossFeet: 692, startFeet: 5_126, endFeet: 5_285, highPointFeet: 5_407, difficultyRank: 4, kneeLoad: .moderate, note: "A balanced up-and-down day; easier than Days 1–3, but not a recovery stroll."),
        TrailDayProfile(day: 5, miles: 4.0, gainFeet: 990, lossFeet: 166, startFeet: 5_285, endFeet: 6_109, highPointFeet: 6_109, difficultyRank: 7, kneeLoad: .low, note: "Short but steep. The dry-camp water carry can make this feel harder than the mileage suggests."),
        TrailDayProfile(day: 6, miles: 3.9, gainFeet: 129, lossFeet: 844, startFeet: 6_109, endFeet: 5_394, highPointFeet: 6_146, difficultyRank: 8, kneeLoad: .moderate, note: "Low aerobic load, but mostly downhill. Use poles and keep the descent controlled."),
        TrailDayProfile(day: 7, miles: 6.4, gainFeet: 937, lossFeet: 1_191, startFeet: 5_394, endFeet: 5_140, highPointFeet: 5_688, difficultyRank: 5, kneeLoad: .high, note: "The largest total vertical day after Day 2, with enough descent to punish fatigued knees."),
        TrailDayProfile(day: 8, miles: 5.5, gainFeet: 1, lossFeet: 1_780, startFeet: 5_140, endFeet: 3_360, highPointFeet: 5_136, difficultyRank: 6, kneeLoad: .veryHigh, note: "The knee day: roughly 324 feet of descent per mile. Slow down, shorten stride, and use poles."),
        TrailDayProfile(day: 9, miles: 3.8, gainFeet: 3, lossFeet: 920, startFeet: 3_360, endFeet: 2_443, highPointFeet: 3_359, difficultyRank: 9, kneeLoad: .high, note: "Short extraction morning, but still about 242 feet of descent per mile before Ash Camp pickup.")
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
